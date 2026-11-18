import { z } from "zod";
import { vaultSchema, type Vault } from "./schema";
export const MIN_PASSWORD_LENGTH = 6;
export const ITERATIONS = 600_000;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const base64 = z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/);
export const envelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("cardguard-vault"),
    kdf: z.literal("PBKDF2-SHA256"),
    iterations: z.number().int().min(ITERATIONS).max(2_000_000),
    salt: base64.length(24),
    iv: base64.length(16),
    ciphertext: base64.min(24).max(MAX_BACKUP_BYTES),
  })
  .strict();
export type Envelope = z.infer<typeof envelopeSchema>;
export function encode(bytes: Uint8Array): string {
  let result = "";
  for (const b of bytes) result += String.fromCharCode(b);
  return btoa(result);
}
export function decode(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
export function parseEnvelope(raw: unknown): Envelope {
  const result = envelopeSchema.parse(raw);
  if (decode(result.salt).length !== 16 || decode(result.iv).length !== 12)
    throw new Error("Định dạng mã hóa không hợp lệ.");
  return result;
}
export function validatePassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 256)
    throw new Error("Mật khẩu phải có 6–256 ký tự.");
}
export async function deriveKey(
  password: string,
  salt: string,
  iterations = ITERATIONS,
  extractable = false,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: decode(salt), iterations },
    material,
    { name: "AES-GCM", length: 256 },
    extractable,
    ["encrypt", "decrypt"],
  );
}
const aad = (e: Omit<Envelope, "ciphertext" | "iv">) =>
  new TextEncoder().encode(
    `CardGuard|${e.schemaVersion}|${e.kind}|${e.kdf}|${e.iterations}|${e.salt}`,
  );
export async function encrypt(
  vault: Vault,
  key: CryptoKey,
  header: Pick<Envelope, "salt" | "iterations">,
): Promise<Envelope> {
  const v = vaultSchema.parse(vault);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const e = {
    schemaVersion: 1 as const,
    kind: "cardguard-vault" as const,
    kdf: "PBKDF2-SHA256" as const,
    ...header,
  };
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(e) },
    key,
    new TextEncoder().encode(JSON.stringify(v)),
  );
  const envelope = parseEnvelope({
    ...e,
    iv: encode(iv),
    ciphertext: encode(new Uint8Array(ciphertext)),
  });
  if (
    new TextEncoder().encode(JSON.stringify(envelope)).length > MAX_BACKUP_BYTES
  ) {
    throw new Error(
      "Vault vượt giới hạn 5 MB. Hãy giảm dữ liệu trước khi lưu.",
    );
  }
  return envelope;
}
export async function decrypt(
  envelope: Envelope,
  key: CryptoKey,
): Promise<Vault> {
  const e = parseEnvelope(envelope);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(e.iv), additionalData: aad(e) },
    key,
    decode(e.ciphertext),
  );
  return vaultSchema.parse(JSON.parse(new TextDecoder().decode(plain)));
}
export async function seal(vault: Vault, password: string): Promise<Envelope> {
  validatePassword(password);
  const salt = encode(crypto.getRandomValues(new Uint8Array(16)));
  return encrypt(vault, await deriveKey(password, salt), {
    salt,
    iterations: ITERATIONS,
  });
}
export async function open(
  envelope: Envelope,
  password: string,
): Promise<{ vault: Vault; key: CryptoKey }> {
  const e = parseEnvelope(envelope);
  const key = await deriveKey(password, e.salt, e.iterations);
  return { vault: await decrypt(e, key), key };
}
