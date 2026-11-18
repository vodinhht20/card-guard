import { describe, it, expect } from "vitest";
import {
  cardSchema,
  dateOnly,
  emptyVault,
  httpsUrl,
  settingsSchema,
  subscriptionSchema,
  vaultSchema,
} from "../src/core/schema";
import {
  addDays,
  daysBetween,
  effectiveStatus,
  nextRenewal,
  targetDate,
} from "../src/core/dates";
import {
  buildSchedule,
  dueReminders,
  badgeCount,
  rebaseTimeZone,
} from "../src/core/reminders";
import {
  decode,
  deriveKey,
  encrypt,
  ITERATIONS,
  open,
  parseEnvelope,
  seal,
} from "../src/core/crypto";
import {
  detect,
  grantDetection,
  originPattern,
  signalSchema,
} from "../src/core/detection";
import { card, service, vaultFixture } from "./fixtures";

describe("card/schema policy", () => {
  it("accepts separate first3/last4 without assuming uniqueness", () => {
    const c = card();
    expect(cardSchema.parse(c)).toEqual(c);
    expect(
      vaultSchema.parse({ ...emptyVault(), cards: [c, card()] }).cards,
    ).toHaveLength(2);
  });
  it("accepts last4-only cards and reads legacy first3 without requiring it", () => {
    const { first3, ...last4Only } = card();
    expect(cardSchema.parse(last4Only)).toEqual(last4Only);
    expect(cardSchema.parse(card()).first3).toBe(first3);
    expect(cardSchema.safeParse({ ...last4Only, last4: "123" }).success).toBe(
      false,
    );
    expect(
      cardSchema.safeParse({ ...last4Only, last4: "１２３４" }).success,
    ).toBe(false);
  });
  it.each([
    { first3: "12" },
    { first3: "1234" },
    { last4: "abcd" },
    { last4: "12345" },
    { first3: "１２３" },
    { nickname: "1234 5678 9012 3456" },
    { cvv: "123" },
    { pan: "1234567890123456" },
  ])("rejects invalid or sensitive fields %j", (patch) =>
    expect(cardSchema.safeParse({ ...card(), ...patch }).success).toBe(false),
  );
  it("rejects invalid dates, secret URL credentials, http and unknown fields", () => {
    expect(dateOnly.safeParse("2026-02-30").success).toBe(false);
    expect(dateOnly.safeParse("2028-02-29").success).toBe(true);
    for (const u of [
      "http://example.com",
      "javascript:alert(1)",
      "https://user:pass@example.com",
    ])
      expect(httpsUrl.safeParse(u).success).toBe(false);
    expect(
      subscriptionSchema.safeParse({ ...service(), cvv: "123" }).success,
    ).toBe(false);
  });
  it("requires renewal date for recurring plans, validates reminder offsets and linked card IDs", () => {
    expect(
      subscriptionSchema.safeParse(service({ recurrence: "monthly" })).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({
        ...emptyVault().settings,
        reminderDays: [1, 1],
      }).success,
    ).toBe(false);
    expect(
      vaultSchema.safeParse({
        ...emptyVault(),
        subscriptions: [service({ cardId: card().id })],
      }).success,
    ).toBe(false);
  });
});
describe("date-only arithmetic and statuses", () => {
  it("crosses DST and leap days without UTC shifts", () => {
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
  });
  it("clamps month-end without recurrence drift and handles leap years", () => {
    expect(nextRenewal("2026-01-31", "monthly", "2026-02-01")).toBe(
      "2026-02-28",
    );
    expect(nextRenewal("2026-01-31", "monthly", "2026-03-01")).toBe(
      "2026-03-31",
    );
    expect(nextRenewal("2024-02-29", "yearly", "2025-01-01")).toBe(
      "2025-02-28",
    );
  });
  it("keeps pending cancellations and removed cards in the schedule", () => {
    const s = service({ status: "cancellation_pending", cardRemoved: true });
    expect(targetDate(s, "2026-11-18")).toBe("2026-11-25");
    expect(effectiveStatus(s)).toBe("cancellation_pending");
    expect(targetDate({ ...s, status: "cancelled" })).toBeNull();
    expect(
      effectiveStatus(service({ trialEnd: "2026-11-17" }), "2026-11-18"),
    ).toBe("overdue");
    expect(
      effectiveStatus(service({ trialEnd: "2026-11-18" }), "2026-11-18"),
    ).toBe("expiring");
  });
  it("schedules defaults, preserves delivery, excludes cancelled records", async () => {
    const v = vaultFixture();
    const r = await buildSchedule(v, [], "2026-11-18");
    expect(r).toHaveLength(4);
    expect(new Set(r.map((x) => x.id)).size).toBe(4);
    expect(dueReminders(r, new Date(2026, 10, 18, 10).getTime())).toHaveLength(
      1,
    );
    r[0].delivered = true;
    expect((await buildSchedule(v, r, "2026-11-18"))[0].delivered).toBe(true);
    expect(badgeCount(r, new Date(2026, 10, 18, 10).getTime())).toBe(1);
    v.subscriptions[0].status = "cancelled";
    expect(await buildSchedule(v, r)).toEqual([]);
  });
});
describe("recurring and timezone regressions", () => {
  it("plans future recurrence while locked and removes old dates after an edit", async () => {
    const v = vaultFixture();
    v.subscriptions[0] = {
      ...v.subscriptions[0],
      status: "active",
      renewalDate: "2026-11-30",
      recurrence: "monthly",
    };
    const r = await buildSchedule(v, [], "2026-11-18");
    expect(r.length).toBeGreaterThan(80);
    expect(new Set(r.map((x) => x.id)).size).toBe(r.length);
    v.subscriptions[0] = {
      ...v.subscriptions[0],
      status: "trial",
      recurrence: "none",
      renewalDate: null,
      trialEnd: "2026-12-15",
    };
    const updated = await buildSchedule(v, r, "2026-11-18");
    expect(updated).toHaveLength(4);
    expect(updated.every((x) => !r.some((old) => old.id === x.id))).toBe(true);
  });
  it("rebases calendar dates from the previous timezone while preserving absolute snooze", async () => {
    const r = await buildSchedule(vaultFixture(), [], "2026-11-18");
    r[0].at = Date.parse("2026-11-18T23:30:00Z");
    r[0].dueAt = Date.parse("2026-11-25T23:30:00Z");
    r[0].snoozeUntil = 1234;
    const result = rebaseTimeZone(r, "Pacific/Auckland");
    expect(new Date(result[0].at).getDate()).toBe(19);
    expect(new Date(result[0].at).getHours()).toBe(9);
    expect(result[0].snoozeUntil).toBe(1234);
  });
});
describe("authenticated crypto", () => {
  it("round-trips with a non-extractable key and unique IVs", async () => {
    const v = vaultFixture();
    const e = await seal(v, "a safe test password");
    expect(decode(e.salt)).toHaveLength(16);
    expect(decode(e.iv)).toHaveLength(12);
    const result = await open(e, "a safe test password");
    expect(result.vault).toEqual(v);
    expect(result.key.extractable).toBe(false);
    const other = await encrypt(v, result.key, e);
    expect(other.iv).not.toBe(e.iv);
    expect(e.iterations).toBe(ITERATIONS);
  });
  it("rejects wrong passwords, corrupted ciphertext and tampered headers", async () => {
    const e = await seal(emptyVault(), "a safe test password");
    await expect(open(e, "the wrong password")).rejects.toThrow();
    await expect(
      open(
        {
          ...e,
          ciphertext:
            (e.ciphertext[0] === "A" ? "B" : "A") + e.ciphertext.slice(1),
        },
        "a safe test password",
      ),
    ).rejects.toThrow();
    await expect(
      open({ ...e, iterations: ITERATIONS + 1 }, "a safe test password"),
    ).rejects.toThrow();
  });
  it("bounds KDF cost, rejects short passwords and malformed envelope", async () => {
    await expect(seal(emptyVault(), "short")).rejects.toThrow();
    expect(() => parseEnvelope({ iterations: 999999999 })).toThrow();
    await expect(deriveKey("x", "!")).rejects.toThrow();
  });
});
describe("conservative detection and permissions", () => {
  it("requires more than an isolated keyword and gives confidence/source only", () => {
    expect(detect({ pathname: "/", labels: ["payment"] })).toBeNull();
    expect(detect({ pathname: "/blog", labels: ["Free trial"] })).toBeNull();
    expect(detect({ pathname: "/billing", labels: [] })).toEqual({
      confidence: "low",
      kind: "payment",
      trialDays: null,
    });
    expect(
      detect({
        pathname: "/billing",
        labels: ["Start 7-day free trial", "Add payment method"],
      }),
    ).toEqual({ confidence: "high", kind: "trial", trialDays: 7 });
  });
  it("refuses full-card and other extra fields in messages", () => {
    expect(
      signalSchema.safeParse({
        type: "DETECTION",
        domain: "example.com",
        confidence: "high",
        kind: "trial",
        trialDays: 7,
        value: "1234567890123456",
      }).success,
    ).toBe(false);
  });
  it("handles permission denial without enabling scripts", async () => {
    let requested = "";
    expect(
      await grantDetection("https://example.com", {
        request: async (p) => {
          requested = p.origins![0];
          return false;
        },
      }),
    ).toBe(false);
    expect(requested).toBe("https://example.com/*");
    expect(() => originPattern("http://example.com")).toThrow();
    expect(() => originPattern("https://*.example.com")).toThrow();
  });
});

describe("validation and cancellation boundary regressions", () => {
  it("rejects empty, duplicate, invalid or excessive reminder offsets", () => {
    const schema = settingsSchema.shape.reminderDays;
    expect(schema.parse([7, 3, 1, 0])).toEqual([7, 3, 1, 0]);
    for (const value of [
      [],
      [1, 1],
      [31],
      [-1],
      [1.5],
      ["1"],
      Array.from({ length: 11 }, (_, i) => i),
    ])
      expect(schema.safeParse(value).success).toBe(false);
  });
  it("keeps earlier trial reminders while cancellation is pending and then follows renewals after trial", () => {
    const pending = service({
      status: "cancellation_pending",
      trialEnd: "2026-11-25",
      renewalDate: "2026-12-25",
      recurrence: "monthly",
    });
    expect(targetDate(pending, "2026-11-18")).toBe("2026-11-25");
    expect(targetDate(pending, "2026-12-01")).toBe("2026-12-25");
  });
  it("rejects oversized vault writes before persisting an unreadable backup envelope", async () => {
    const v = emptyVault();
    v.subscriptions = Array.from({ length: 4000 }, () =>
      service({ notes: "x".repeat(1000) }),
    );
    await expect(seal(v, "oversized test passphrase")).rejects.toThrow();
  }, 15000);
});
