import { describe, it, expect } from "vitest";
import { dashboardSummary } from "../src/core/dashboard";
import { emptyVault } from "../src/core/schema";
import { card, service } from "./fixtures";
describe("dashboard counts and calendar charts", () => {
  it("has truthful empty states with no invented counts", () => {
    const d = dashboardSummary(emptyVault(), "2026-11-18");
    expect(d.total).toBe(0);
    expect(d.upcoming).toEqual([]);
    expect(d.groups.every((g) => g.count === 0)).toBe(true);
    expect(d.weeks.map((w) => w.count)).toEqual([0, 0, 0, 0]);
  });
  it("prioritizes overdue and due-today records, keeps pending cancellations and ignores ended records", () => {
    const v = emptyVault();
    v.cards = [card(), card({ status: "archived" })];
    v.subscriptions = [
      service({ name: "Later", trialEnd: "2026-11-25" }),
      service({ name: "Overdue", trialEnd: "2026-11-17" }),
      service({ name: "Today", trialEnd: "2026-11-18" }),
      service({ status: "cancellation_pending", trialEnd: "2026-11-19" }),
      service({ status: "cancelled", trialEnd: "2026-11-20" }),
      service({ status: "active", trialEnd: null, renewalDate: "2026-12-02" }),
      service({ status: "expired" }),
    ];
    const d = dashboardSummary(v, "2026-11-18");
    expect(d.cards).toBe(1);
    expect(d.active).toBe(5);
    expect(d.overdue).toBe(1);
    expect(d.upcoming.slice(0, 3).map((s) => s.name)).toEqual([
      "Overdue",
      "Today",
      v.subscriptions[3].name,
    ]);
    expect(d.groups.map((g) => g.count)).toEqual([3, 1, 1, 2]);
    expect(d.weeks.map((w) => w.count)).toEqual([2, 1, 1, 0]);
  });
});
