import { describe, it, expect } from "vitest";
import { VaultSession, type VaultStorage } from "../src/core/repository";
import { emptyVault } from "../src/core/schema";
import { seal, deriveKey } from "../src/core/crypto";
import { readBackup, mergeBackup } from "../src/core/backup";
import {
  deleteCard,
  saveCard,
  saveService,
  updateService,
} from "../src/core/actions";
import {
  buildSchedule,
  reconcile,
  type ReminderIO,
  type Reminder,
} from "../src/core/reminders";
import { card, service, vaultFixture } from "./fixtures";
function memory() {
  let data: unknown;
  return {
    read: async () => structuredClone(data),
    write: async (v: unknown) => {
      data = structuredClone(v);
    },
  };
}
const exclusive = <T>(fn: () => Promise<T>) => fn();
describe("vault CRUD and lifecycle (memory storage, no database)", () => {
  it("creates, adds cards/services/links, updates trial, cancels independently and unlocks after restart", async () => {
    const storage = memory(),
      session = new VaultSession(storage, exclusive);
    let v = await session.create("integration test passphrase");
    const c = card();
    v = await session.save(saveCard(v, c));
    const s = service({ cardId: c.id });
    v = await session.save(saveService(v, s));
    v = await session.save(
      updateService(v, s.id, { trialEnd: "2026-12-01", cardRemoved: true }),
    );
    expect(v.subscriptions[0].status).toBe("trial");
    expect(v.subscriptions[0].cardRemoved).toBe(true);
    v = await session.save(
      updateService(v, s.id, { status: "cancellation_pending" }),
    );
    expect(v.subscriptions[0].status).toBe("cancellation_pending");
    v = await session.save(updateService(v, s.id, { status: "cancelled" }));
    expect(v.subscriptions[0].status).toBe("cancelled");
    expect(() => deleteCard(v, c.id)).toThrow();
    session.lock();
    expect(session.unlocked).toBe(false);
    await expect(session.save(v)).rejects.toThrow();
    const restarted = new VaultSession(storage, exclusive);
    expect(restarted.unlocked).toBe(false);
    expect(await restarted.unlock("integration test passphrase")).toEqual(v);
  });
  it("auto-locks and prevents stale writes across contexts", async () => {
    let clock = 0;
    const storage = memory(),
      a = new VaultSession(storage, exclusive, () => clock),
      b = new VaultSession(storage, exclusive);
    const v = await a.create("integration test passphrase");
    await b.unlock("integration test passphrase");
    await b.save(saveCard(v, card()));
    await expect(a.save(v)).rejects.toThrow("cửa sổ khác");
    await a.unlock("integration test passphrase");
    clock = 301000;
    expect(a.expired()).toBe(true);
    await expect(a.save(v)).rejects.toThrow("khóa");
    expect(a.unlocked).toBe(false);
  });
  it("disables idle timeout at zero and reapplies a positive timeout after save", async () => {
    let clock = 0;
    const storage = memory(),
      session = new VaultSession(storage, exclusive, () => clock);
    let v = await session.create("abc123");
    v = await session.save({
      ...v,
      settings: { ...v.settings, autoLockMinutes: 0 },
    });
    clock = 15 * 86400000;
    expect(session.expired()).toBe(false);
    await session.save(v);
    v = await session.save({
      ...v,
      settings: { ...v.settings, autoLockMinutes: 1 },
    });
    clock += 59999;
    expect(session.expired()).toBe(false);
    clock += 1;
    expect(session.expired()).toBe(true);
    await expect(session.save(v)).rejects.toThrow("khóa");
  });
  it("authenticates restored keys and discards unlock completion after an explicit lock", async () => {
    const envelope = await seal(emptyVault(), "abc123"),
      key = await deriveKey("abc123", envelope.salt, envelope.iterations),
      storage = memory(),
      session = new VaultSession(storage, exclusive);
    await storage.write(envelope);
    expect(await session.unlockWithKey(key)).toEqual(emptyVault());
    const wrong = await deriveKey(
      "wrong key",
      envelope.salt,
      envelope.iterations,
    );
    await expect(session.unlockWithKey(wrong)).rejects.toThrow();
    expect(session.unlocked).toBe(false);
    let resume!: (value: unknown) => void;
    const paused: VaultStorage = {
      read: () =>
        new Promise((resolve) => {
          resume = resolve;
        }),
      write: storage.write,
    };
    const pending = new VaultSession(paused, exclusive);
    const unlock = pending.unlockWithKey(key);
    pending.lock();
    resume(envelope);
    await expect(unlock).rejects.toThrow("khóa");
    expect(pending.unlocked).toBe(false);
  });
  it("keeps persistent data unchanged after failed writes", async () => {
    const storage = memory(),
      session = new VaultSession(storage, exclusive);
    const v = await session.create("integration test passphrase");
    const old = await storage.read();
    const faulty: VaultStorage = {
      read: storage.read,
      write: async () => {
        throw new Error("disk");
      },
    };
    const other = new VaultSession(faulty, exclusive);
    await other.unlock("integration test passphrase");
    await expect(other.save(saveCard(v, card()))).rejects.toThrow();
    expect(await storage.read()).toEqual(old);
  });
});
describe("encrypted import/export", () => {
  it("round-trips, previews validated data, merges IDs with existing records winning and replaces", async () => {
    const v = vaultFixture(),
      contents = JSON.stringify(await seal(v, "backup test passphrase"));
    const imported = await readBackup(contents, "backup test passphrase");
    expect(imported).toEqual(v);
    const edited = structuredClone(v);
    edited.cards[0].nickname = "Existing wins";
    expect(mergeBackup(edited, imported, "merge").cards).toHaveLength(1);
    expect(mergeBackup(edited, imported, "merge").cards[0].nickname).toBe(
      "Existing wins",
    );
    expect(mergeBackup(edited, imported, "replace").cards[0].nickname).toBe(
      v.cards[0].nickname,
    );
  });
  it("rejects malformed/oversized/wrong-password/prototype data and duplicate IDs without mutating current vault", async () => {
    const v = vaultFixture(),
      before = structuredClone(v);
    await expect(readBackup("{}", "password")).rejects.toThrow();
    await expect(
      readBackup("x".repeat(5 * 1024 * 1024 + 1), "password"),
    ).rejects.toThrow();
    await expect(
      readBackup(
        JSON.stringify(await seal(v, "backup test passphrase")),
        "bad password",
      ),
    ).rejects.toThrow();
    expect(() =>
      mergeBackup(v, { ...v, cards: [v.cards[0], v.cards[0]] }, "merge"),
    ).toThrow();
    const pollution = JSON.parse('{"__proto__":{"polluted":true}}');
    expect(() => mergeBackup(v, { ...v, ...pollution }, "replace")).toThrow();
    expect(v).toEqual(before);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
describe("anonymous worker scheduler", () => {
  function fake(schedule: Reminder[]) {
    let state = structuredClone(schedule);
    let notices = 0,
      alarm: number | null = null;
    const io: ReminderIO = {
      load: async () => structuredClone(state),
      save: async (v) => {
        state = structuredClone(v);
      },
      notify: async () => {
        notices++;
      },
      alarm: async (v) => {
        alarm = v;
      },
      badge: async () => {},
    };
    return {
      io,
      get state() {
        return state;
      },
      get notices() {
        return notices;
      },
      get alarm() {
        return alarm;
      },
    };
  }
  it("reconstructs alarms, collapses missed reminders, persists deduplication across restart", async () => {
    const schedule = await buildSchedule(vaultFixture(), [], "2026-11-18"),
      worker = fake(schedule);
    const now = new Date(2026, 10, 25, 10).getTime();
    await reconcile(worker.io, now);
    expect(worker.notices).toBe(1);
    expect(worker.state.every((r) => r.delivered)).toBe(true);
    await reconcile(worker.io, now);
    expect(worker.notices).toBe(1);
    const restarted = fake(worker.state);
    await reconcile(restarted.io, now);
    expect(restarted.notices).toBe(0);
  });
  it("restores a lost future alarm without notification and honors snooze", async () => {
    const schedule = await buildSchedule(vaultFixture(), [], "2026-11-18"),
      worker = fake(schedule);
    const now = new Date(2026, 10, 17, 10).getTime();
    await reconcile(worker.io, now);
    expect(worker.alarm).toBe(schedule[0].at);
    expect(worker.notices).toBe(0);
    schedule[0].snoozeUntil = now + 3600000;
    const snoozed = fake(schedule);
    await reconcile(snoozed.io, now);
    expect(snoozed.notices).toBe(0);
    await reconcile(snoozed.io, now + 3600001);
    expect(snoozed.notices).toBe(1);
  });
});
