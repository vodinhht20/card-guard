import {
  encryptWorkspace,
  decryptWorkspace,
  type WorkspaceSnapshot,
} from "./workspace";
import { opaque } from "./reminders";
import { emptyVault, vaultSchema, type Vault } from "./schema";
import {
  decrypt,
  deriveKey,
  encrypt,
  parseEnvelope,
  seal,
  type Envelope,
} from "./crypto";
export interface VaultStorage {
  read(): Promise<unknown>;
  write(value: Envelope): Promise<void>;
}
export class VaultSession {
  private key: CryptoKey | null = null;
  private envelope: Envelope | null = null;
  private lastActivity = 0;
  private minutes = 5;
  private generation = 0;
  constructor(
    private storage: VaultStorage,
    private exclusive: <T>(fn: () => Promise<T>) => Promise<T>,
    private now = Date.now,
  ) {}
  get unlocked() {
    return this.key !== null;
  }
  get version() {
    return this.envelope?.ciphertext;
  }
  touch() {
    if (this.unlocked) this.lastActivity = this.now();
  }
  expired() {
    return (
      this.unlocked &&
      this.minutes > 0 &&
      this.now() - this.lastActivity >= this.minutes * 60_000
    );
  }
  lock() {
    this.generation++;
    this.key = null;
    this.envelope = null;
  }
  async unlock(password: string): Promise<Vault> {
    this.lock();
    const generation = this.generation;
    const e = parseEnvelope(await this.storage.read());
    const key = await deriveKey(password, e.salt, e.iterations);
    const vault = await decrypt(e, key);
    if (generation !== this.generation) throw new Error("Phiên đã khóa.");
    this.key = key;
    this.envelope = e;
    this.minutes = vault.settings.autoLockMinutes;
    this.touch();
    return vault;
  }
  async unlockWithKey(key: CryptoKey): Promise<Vault> {
    this.lock();
    const generation = this.generation;
    const e = parseEnvelope(await this.storage.read()),
      vault = await decrypt(e, key);
    if (generation !== this.generation) throw new Error("Phiên đã khóa.");
    this.key = key;
    this.envelope = e;
    this.minutes = vault.settings.autoLockMinutes;
    this.touch();
    return vault;
  }
  async protectWorkspace(value: WorkspaceSnapshot) {
    if (this.expired()) this.lock();
    if (!this.key || !this.envelope) throw new Error("Vault đã khóa.");
    return encryptWorkspace(
      value,
      this.key,
      this.envelope.salt,
      await opaque(this.envelope.ciphertext),
    );
  }
  async restoreWorkspace(value: unknown): Promise<WorkspaceSnapshot | null> {
    if (this.expired()) this.lock();
    const generation = this.generation;
    if (!this.key || !this.envelope) throw new Error("Vault đã khóa.");
    const result = await decryptWorkspace(
      value,
      this.key,
      this.envelope.salt,
      await opaque(this.envelope.ciphertext),
    );
    if (generation !== this.generation) throw new Error("Phiên đã khóa.");
    return result;
  }
  async create(password: string): Promise<Vault> {
    return this.exclusive(async () => {
      if (await this.storage.read())
        throw new Error("Vault đã tồn tại. Hãy mở khóa.");
      const e = await seal(emptyVault(), password);
      await this.storage.write(e);
      return this.unlock(password);
    });
  }
  async save(input: Vault): Promise<Vault> {
    const vault = vaultSchema.parse(input);
    return this.exclusive(async () => {
      if (this.expired()) this.lock();
      if (!this.key || !this.envelope) throw new Error("Vault đã khóa.");
      const generation = this.generation;
      const current = parseEnvelope(await this.storage.read());
      if (current.ciphertext !== this.envelope.ciphertext) {
        this.lock();
        throw new Error("Vault đã thay đổi ở cửa sổ khác. Hãy mở khóa lại.");
      }
      const e = await encrypt(vault, this.key, this.envelope);
      if (generation !== this.generation) throw new Error("Phiên đã khóa.");
      const previous = this.envelope;
      this.envelope = e;
      try {
        await this.storage.write(e);
      } catch {
        this.envelope = previous;
        throw new Error("Không thể lưu. Dữ liệu cũ được giữ nguyên.");
      }
      this.minutes = vault.settings.autoLockMinutes;
      this.touch();
      return vault;
    });
  }
}
export const chromeVaultStorage: VaultStorage = {
  async read() {
    return (await chrome.storage.local.get("vault")).vault;
  },
  async write(vault) {
    await chrome.storage.local.set({ vault });
  },
};
