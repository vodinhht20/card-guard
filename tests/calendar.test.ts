import { describe, expect, it } from "vitest";
import { dueEvents, monthRange } from "../src/core/calendar";
import { addDays } from "../src/core/dates";
import { emptyWorkspace, workspaceSchema } from "../src/core/workspace";
import { service } from "./fixtures";
describe("calendar windows and monthly occurrences (pure fixtures)", () => {
  it("handles month lengths, leap years and bounded years", () => {
    expect(monthRange("2028-02")).toEqual({
      start: "2028-02-01",
      end: "2028-02-29",
    });
    expect(monthRange("2026-02").end).toBe("2026-02-28");
    expect(monthRange("2000-02").end).toBe("2000-02-29");
    expect(monthRange("2100-02").end).toBe("2100-02-28");
    for (const value of ["2026-13", "2026-2", "1999-12", "2101-01"])
      expect(() => monthRange(value)).toThrow();
  });
  it("includes today and day30, excludes past/day31, sorts without mutating inputs", () => {
    const start = "2026-11-18",
      end = addDays(start, 30);
    const services = [
      service({ name: "Day30", trialEnd: end }),
      service({ name: "Past", trialEnd: addDays(start, -1) }),
      service({ name: "Day31", trialEnd: addDays(start, 31) }),
      service({ name: "Today", trialEnd: start }),
    ];
    const before = structuredClone(services);
    expect(dueEvents(services, start, end).map((e) => e.service.name)).toEqual([
      "Today",
      "Day30",
    ]);
    expect(services).toEqual(before);
  });
  it("excludes ended records and keeps pending cancellation even after card removal", () => {
    const services = [
      ...(["cancelled", "expired", "archived"] as const).map((status) =>
        service({ status }),
      ),
      service({ status: "cancellation_pending", cardRemoved: true }),
      service({ trialEnd: null }),
    ];
    expect(
      dueEvents(services, "2026-11-01", "2026-11-30").map(
        (e) => e.service.status,
      ),
    ).toEqual(["cancellation_pending"]);
  });
  it("shows past and future monthly renewals from the original anchor without drifting", () => {
    const s = service({
      status: "active",
      trialEnd: null,
      renewalDate: "2026-01-31",
      recurrence: "monthly",
    });
    expect(
      dueEvents([s], "2026-02-01", "2026-03-31").map((e) => e.date),
    ).toEqual(["2026-02-28", "2026-03-31"]);
    expect(
      dueEvents([s], "2028-02-01", "2028-02-29").map((e) => e.date),
    ).toEqual(["2028-02-29"]);
    expect(dueEvents([s], "2025-12-01", "2025-12-31")).toEqual([]);
  });
  it("clamps yearly leap anchors and keeps single dates in their own month", () => {
    const yearly = service({
      status: "active",
      trialEnd: null,
      renewalDate: "2024-02-29",
      recurrence: "yearly",
    });
    expect(dueEvents([yearly], "2027-02-01", "2027-02-28")[0].date).toBe(
      "2027-02-28",
    );
    expect(dueEvents([yearly], "2028-02-01", "2028-02-29")[0].date).toBe(
      "2028-02-29",
    );
    expect(dueEvents([service()], "2026-12-01", "2026-12-31")).toEqual([]);
  });
  it("shows trial plus configured recurring dates, deduplicating the same service/day", () => {
    const s = service({
      trialEnd: "2026-11-25",
      renewalDate: "2026-11-25",
      recurrence: "monthly",
    });
    const events = dueEvents([s], "2026-11-01", "2026-12-31");
    expect(events.map((e) => [e.date, e.kind])).toEqual([
      ["2026-11-25", "trial"],
      ["2026-12-25", "renewal"],
    ]);
    expect(
      dueEvents([s, service({ name: "Another" })], "2026-11-01", "2026-11-30"),
    ).toHaveLength(2);
  });
  it("rejects reversed, malformed or unbounded date windows", () => {
    for (const [start, end] of [
      ["2026-11-30", "2026-11-01"],
      ["2026-02-30", "2026-03-01"],
      ["2026-01-01", "2028-01-01"],
    ])
      expect(() => dueEvents([], start, end)).toThrow();
    expect(dueEvents([], "2026-11-01", "2026-11-30")).toEqual([]);
  });
  it("restores calendar navigation and defaults older encrypted workspace shapes", () => {
    const { calendarMonth, calendarDay, ...legacy } = emptyWorkspace();
    expect(workspaceSchema.parse(legacy).calendarMonth).toBeNull();
    expect(workspaceSchema.parse(legacy).calendarDay).toBeNull();
    const state = {
      ...emptyWorkspace(),
      calendarMonth: "2028-02",
      calendarDay: "2028-02-29",
    };
    expect(workspaceSchema.parse(state)).toEqual(state);
    expect(
      workspaceSchema.safeParse({ ...state, calendarMonth: "2028-13" }).success,
    ).toBe(false);
    expect(
      workspaceSchema.safeParse({ ...state, calendarDay: "2026-02-29" })
        .success,
    ).toBe(false);
  });
});
