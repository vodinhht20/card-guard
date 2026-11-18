import { describe, expect, it } from "vitest";
import {
  calendarAmount,
  calendarSummary,
  filterCalendarEvents,
  groupCalendarEvents,
} from "../src/core/calendarPresentation";
import type { DueEvent } from "../src/core/calendar";
import { service } from "./fixtures";
const events: DueEvent[] = [
  {
    date: "2026-11-20",
    kind: "trial",
    service: service({ name: "Thiết kế Đẹp", domain: "canva.com" }),
  },
  {
    date: "2026-11-20",
    kind: "renewal",
    service: service({ name: "Netflix", domain: "netflix.com" }),
  },
  {
    date: "2026-11-21",
    kind: "renewal",
    service: service({ name: "Spotify", domain: "spotify.com" }),
  },
];
describe("calendar presentation (pure synthetic fixtures)", () => {
  it("counts occurrences, trial endings, renewals", () => {
    expect(calendarSummary(events)).toEqual({
      total: 3,
      trials: 1,
      renewals: 2,
    });
    expect(calendarSummary([])).toEqual({
      total: 0,
      trials: 0,
      renewals: 0,
    });
  });
  it("combines kind and accent-insensitive name/domain search without mutating inputs", () => {
    const before = structuredClone(events);
    expect(filterCalendarEvents(events, "all", "  THIET KE dep  ")).toEqual([
      events[0],
    ]);
    expect(filterCalendarEvents(events, "all", " NETFLIX.COM ")).toEqual([
      events[1],
    ]);
    expect(filterCalendarEvents(events, "renewal", "thiết kế")).toEqual([]);
    expect(filterCalendarEvents(events, "trial", "")).toEqual([events[0]]);
    expect(filterCalendarEvents(events, "renewal", "")).toEqual(
      events.slice(1),
    );
    expect(filterCalendarEvents(events, "all", "missing")).toEqual([]);
    expect(filterCalendarEvents([], "all", "")).toEqual([]);
    expect(filterCalendarEvents(events, "all", "  ")).toEqual(events);
    expect(events).toEqual(before);
  });
  it("groups sorted calendar events by date, preserving service order and source arrays", () => {
    const groups = groupCalendarEvents(events);
    expect([...groups.keys()]).toEqual(["2026-11-20", "2026-11-21"]);
    expect(groups.get("2026-11-20")).toEqual(events.slice(0, 2));
    expect(groups.get("2026-11-21")).toEqual([events[2]]);
    expect(groupCalendarEvents([]).size).toBe(0);
    groups.get("2026-11-20")!.pop();
    expect(events).toHaveLength(3);
  });
  it("formats stored amounts by locale without rounding or floating-point loss", () => {
    expect(calendarAmount("259000", "VND", "vi")).toBe("259.000 VND");
    expect(calendarAmount("1234.50", "USD", "en")).toBe("1,234.50 USD");
    expect(calendarAmount("1234.50", "USD", "vi")).toBe("1.234,50 USD");
    expect(calendarAmount("999999999999.99", "USD", "vi")).toBe(
      "999.999.999.999,99 USD",
    );
    expect(calendarAmount("0", "VND", "vi")).toBe("0 VND");
    expect(calendarAmount("", "VND", "en")).toBe("");
  });
});
