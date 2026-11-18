import { describe, it, expect } from "vitest";
import {
  RememberedSession,
  type RememberedRecord,
} from "../src/core/rememberedSession";
import { seal, decrypt } from "../src/core/crypto";
import { emptyVault, settingsSchema } from "../src/core/schema";
import { VaultSession } from "../src/core/repository";
function memory() {
  let record: unknown;
  let epoch = "";
  return {
    read: async () => structuredClone(record),
    revision: async () => epoch,
    write: async (value: RememberedRecord, expected?: string) => {
      if (expected !== undefined && expected !== epoch)
        throw new Error("Revoked");
      record = structuredClone(value);
    },
    clear: async () => {
      record = undefined;
      epoch = crypto.randomUUID();
    },
    replace: (value: unknown) => {
      record = structuredClone(value);
    },
  };
}
const DAY = 86400000;
describe("opt-in remembered unlock (memory store, no real database)", () => {
  it("caps configuration at 14 whole days and migrates old settings without losing defaults", async () => {
    const m = new RememberedSession(memory());
    for (const days of [0, 15, 1.5])
      await expect(m.enable({} as never, "abc123", days)).rejects.toThrow();
    const { rememberDays, textSize, dashboardChart, ...old } =
      emptyVault().settings;
    expect(settingsSchema.parse(old)).toMatchObject({
      rememberDays: 7,
      textSize: "comfortable",
      dashboardChart: true,
    });
    expect(settingsSchema.safeParse({ ...old, rememberDays: 15 }).success).toBe(
      false,
    );
  });
  it("persists only a wrapped vault key plus a non-extractable profile key and resumes across contexts", async () => {
    let now = 1700000000000;
    const store = memory(),
      m = new RememberedSession(store, () => now),
      v = emptyVault(),
      e = await seal(v, "abc123");
    expect(await m.restore(e)).toBeNull();
    const end = await m.enable(e, "abc123", 14);
    expect(end).toBe(now + 14 * DAY);
    const record = (await store.read()) as RememberedRecord;
    expect(record.deviceKey.extractable).toBe(false);
    expect(record.deviceKey.usages.sort()).toEqual(["unwrapKey", "wrapKey"]);
    expect(JSON.stringify(record)).not.toContain("abc123");
    expect(Object.keys(record).sort()).toEqual([
      "createdAt",
      "days",
      "deviceKey",
      "expiresAt",
      "iv",
      "salt",
      "version",
      "wrappedKey",
    ]);
    const resumed = await new RememberedSession(store, () => now).restore(e);
    expect(resumed?.key.extractable).toBe(false);
    expect(await decrypt(e, resumed!.key)).toEqual(v);
    const session = new VaultSession(
      { read: async () => e, write: async () => {} },
      (fn) => fn(),
    );
    expect(await session.unlockWithKey(resumed!.key)).toEqual(v);
    session.lock();
    expect(session.unlocked).toBe(false);
    now = end - 1;
    expect(await m.restore(e)).not.toBeNull();
    now = end;
    expect(await m.restore(e)).toBeNull();
    expect(await store.read()).toBeUndefined();
  });
  it("authenticates expiry metadata and ciphertext; rejects salt changes and clock rollback", async () => {
    const store = memory();
    let now = 10000;
    const m = new RememberedSession(store, () => now),
      e = await seal(emptyVault(), "abc123");
    await m.enable(e, "abc123", 7);
    const record = (await store.read()) as RememberedRecord;
    store.replace({
      ...record,
      days: 14,
      expiresAt: record.createdAt + 14 * DAY,
    });
    expect(await m.restore(e)).toBeNull();
    store.replace({
      ...record,
      wrappedKey:
        (record.wrappedKey[0] === "A" ? "B" : "A") + record.wrappedKey.slice(1),
    });
    expect(await m.restore(e)).toBeNull();
    store.replace(record);
    expect(
      await m.restore({ ...e, salt: "AAAAAAAAAAAAAAAAAAAAAA==" }),
    ).toBeNull();
    store.replace(record);
    now = 9999;
    expect(await m.restore(e)).toBeNull();
  });
  it("changes configured duration from the original issue time and cannot revive an expired grant", async () => {
    let now = 1000;
    const store = memory(),
      m = new RememberedSession(store, () => now),
      e = await seal(emptyVault(), "abc123");
    await m.enable(e, "abc123", 7);
    now += 2 * DAY;
    expect(await m.configure(14)).toBe(1000 + 14 * DAY);
    expect(await m.restore(e)).not.toBeNull();
    expect(await m.configure(1)).toBeNull();
    expect(await m.configure(14)).toBeNull();
    expect(await store.read()).toBeUndefined();
  });
  it("revokes explicitly, fails closed on malformed records, and does not save failed-password grants", async () => {
    const store = memory(),
      m = new RememberedSession(store),
      e = await seal(emptyVault(), "abc123");
    await expect(m.enable(e, "wrong password", 7)).rejects.toThrow();
    expect(await store.read()).toBeUndefined();
    store.replace({ version: 999, password: "synthetic-invalid" });
    expect(await m.restore(e)).toBeNull();
    expect(await store.read()).toBeUndefined();
    await m.enable(e, "abc123", 1);
    await m.revoke();
    expect(await new RememberedSession(store).restore(e)).toBeNull();
  });
  it("does not revive a grant when Lock Now wins during an in-flight password derivation", async () => {
    const store = memory(),
      m = new RememberedSession(store),
      e = await seal(emptyVault(), "abc123");
    const enabling = m.enable(e, "abc123", 7);
    await Promise.resolve();
    await m.revoke();
    await expect(enabling).rejects.toThrow();
    expect(await store.read()).toBeUndefined();
  });
});
