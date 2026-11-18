import { z } from "zod";
import { decode, encode, deriveKey, decrypt, type Envelope } from "./crypto";
export const MAX_REMEMBER_DAYS = 14;
const DAY = 86_400_000;
export const rememberDaysSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_REMEMBER_DAYS);
const headerSchema = z
  .object({
    version: z.literal(1),
    createdAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().nonnegative(),
    days: rememberDaysSchema,
    salt: z.string().length(24),
    iv: z.string().length(16),
    wrappedKey: z.string().max(256),
  })
  .strict()
  .refine(
    (v) => v.expiresAt === v.createdAt + v.days * DAY,
    "Phiên ghi nhớ không hợp lệ.",
  );
type Header = z.infer<typeof headerSchema>;
export type RememberedRecord = Header & { deviceKey: CryptoKey };
export interface RememberStore {
  read(): Promise<unknown>;
  revision(): Promise<string>;
  write(value: RememberedRecord, expectedRevision?: string): Promise<void>;
  clear(): Promise<void>;
}
function parseRecord(value: unknown): RememberedRecord {
  if (typeof value !== "object" || !value)
    throw new Error("Phiên không hợp lệ.");
  const { deviceKey, ...raw } = value as RememberedRecord;
  const h = headerSchema.parse(raw);
  if (
    !deviceKey ||
    deviceKey.type !== "secret" ||
    deviceKey.extractable ||
    deviceKey.algorithm.name !== "AES-GCM" ||
    (deviceKey.algorithm as AesKeyAlgorithm).length !== 256 ||
    !deviceKey.usages.includes("unwrapKey")
  )
    throw new Error("Khóa thiết bị không hợp lệ.");
  if (decode(h.iv).length !== 12 || decode(h.salt).length !== 16)
    throw new Error("Phiên không hợp lệ.");
  return { ...h, deviceKey };
}
function aad(h: Pick<Header, "createdAt" | "expiresAt" | "days" | "salt">) {
  return new TextEncoder().encode(
    `CardGuard|remember|1|${h.createdAt}|${h.expiresAt}|${h.days}|${h.salt}`,
  );
}
export class RememberedSession {
  constructor(
    private store: RememberStore,
    private now = Date.now,
  ) {}
  async revoke() {
    await this.store.clear();
  }
  private async readActive(salt?: string): Promise<RememberedRecord | null> {
    const raw = await this.store.read();
    if (!raw) return null;
    try {
      const r = parseRecord(raw),
        now = this.now();
      if (
        now < r.createdAt ||
        now >= r.expiresAt ||
        (salt && r.salt !== salt)
      ) {
        await this.revoke();
        return null;
      }
      return r;
    } catch {
      await this.revoke();
      return null;
    }
  }
  async status() {
    const r = await this.readActive();
    return r ? { expiresAt: r.expiresAt, days: r.days } : null;
  }
  async enable(envelope: Envelope, password: string, days: number) {
    rememberDaysSchema.parse(days);
    // Only the opt-in path temporarily derives an extractable key so Web Crypto can wrap it.
    const revision = await this.store.revision();
    const key = await deriveKey(
      password,
      envelope.salt,
      envelope.iterations,
      true,
    );
    await decrypt(envelope, key);
    const deviceKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["wrapKey", "unwrapKey"],
    );
    const createdAt = this.now(),
      header = {
        version: 1 as const,
        createdAt,
        expiresAt: createdAt + days * DAY,
        days,
        salt: envelope.salt,
      };
    await this.writeWrapped(key, deviceKey, header, revision);
    return header.expiresAt;
  }
  private async writeWrapped(
    key: CryptoKey,
    deviceKey: CryptoKey,
    header: Omit<Header, "iv" | "wrappedKey">,
    revision: string,
  ) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrapped = await crypto.subtle.wrapKey("raw", key, deviceKey, {
      name: "AES-GCM",
      iv,
      additionalData: aad(header),
    });
    await this.store.write(
      {
        ...header,
        iv: encode(iv),
        wrappedKey: encode(new Uint8Array(wrapped)),
        deviceKey,
      },
      revision,
    );
  }
  async restore(
    envelope: Envelope,
  ): Promise<{ key: CryptoKey; expiresAt: number } | null> {
    const revision = await this.store.revision();
    const r = await this.readActive(envelope.salt);
    if (!r) return null;
    try {
      const key = await crypto.subtle.unwrapKey(
        "raw",
        decode(r.wrappedKey),
        r.deviceKey,
        { name: "AES-GCM", iv: decode(r.iv), additionalData: aad(r) },
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
      await decrypt(envelope, key);
      if (this.now() >= r.expiresAt) {
        await this.revoke();
        return null;
      }
      if ((await this.store.revision()) !== revision) return null;
      return { key, expiresAt: r.expiresAt };
    } catch {
      await this.revoke();
      return null;
    }
  }
  async configure(days: number): Promise<number | null> {
    rememberDaysSchema.parse(days);
    const revision = await this.store.revision();
    const r = await this.readActive();
    if (!r) return null;
    const expiresAt = r.createdAt + days * DAY;
    if (expiresAt <= this.now()) {
      await this.revoke();
      return null;
    }
    try {
      const key = await crypto.subtle.unwrapKey(
        "raw",
        decode(r.wrappedKey),
        r.deviceKey,
        { name: "AES-GCM", iv: decode(r.iv), additionalData: aad(r) },
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );
      const { iv, wrappedKey, deviceKey, ...header } = r;
      await this.writeWrapped(
        key,
        deviceKey,
        { ...header, days, expiresAt },
        revision,
      );
      return expiresAt;
    } catch {
      await this.revoke();
      return null;
    }
  }
}
// IndexedDB belongs to the extension origin. No password, raw vault key or vault plaintext is stored.
export class IndexedDbRememberStore implements RememberStore {
  private async database(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("cardguard-remember", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("sessions");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error("Không mở được phiên trên thiết bị."));
      request.onblocked = () => reject(new Error("Kho phiên đang bận."));
    });
  }
  private async transaction<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sessions", mode),
        request = action(tx.objectStore("sessions"));
      let result: T;
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onabort = tx.onerror = () => {
        db.close();
        reject(new Error("Không thể cập nhật phiên ghi nhớ."));
      };
    });
  }
  read() {
    return this.transaction("readonly", (s) => s.get("current"));
  }
  async revision() {
    return (await this.transaction("readonly", (s) => s.get("revision"))) ?? "";
  }
  async write(value: RememberedRecord, expectedRevision?: string) {
    const db = await this.database();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("sessions", "readwrite"),
        store = tx.objectStore("sessions"),
        request = store.get("revision");
      request.onsuccess = () => {
        if (
          expectedRevision !== undefined &&
          (request.result ?? "") !== expectedRevision
        ) {
          tx.abort();
          return;
        }
        store.put(value, "current");
      };
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = tx.onerror = () => {
        db.close();
        reject(new Error("Phiên ghi nhớ đã thay đổi."));
      };
    });
  }
  async clear() {
    const db = await this.database();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("sessions", "readwrite"),
        store = tx.objectStore("sessions");
      store.delete("current");
      store.put(crypto.randomUUID(), "revision");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = tx.onerror = () => {
        db.close();
        reject(new Error("Không thể hủy phiên ghi nhớ."));
      };
    });
  }
}
