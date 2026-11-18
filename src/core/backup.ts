import { MAX_BACKUP_BYTES, open, parseEnvelope } from "./crypto";
import { recordHistory, vaultSchema, type Vault } from "./schema";
export async function readBackup(
  contents: string,
  password: string,
): Promise<Vault> {
  if (new TextEncoder().encode(contents).length > MAX_BACKUP_BYTES)
    throw new Error("File vượt quá 5 MB.");
  const envelope = parseEnvelope(JSON.parse(contents));
  return (await open(envelope, password)).vault;
}
export function mergeBackup(
  current: Vault,
  imported: Vault,
  mode: "merge" | "replace",
): Vault {
  const a = vaultSchema.parse(current),
    b = vaultSchema.parse(imported);
  // Existing IDs win. Partial-digit matches never imply card identity.
  const merge = <T extends { id: string }>(old: T[], incoming: T[]) => {
    const ids = new Set(old.map((x) => x.id));
    return [...old, ...incoming.filter((x) => !ids.has(x.id))];
  };
  const result =
    mode === "replace"
      ? b
      : {
          ...a,
          cards: merge(a.cards, b.cards),
          subscriptions: merge(a.subscriptions, b.subscriptions),
        };
  recordHistory(result, "imported");
  return vaultSchema.parse(result);
}
