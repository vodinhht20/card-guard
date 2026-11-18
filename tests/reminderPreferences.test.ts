import { describe, expect, it } from "vitest";
import {
  reminderChoices,
  toggleReminderDay,
} from "../src/core/reminderPreferences";

describe("reminder selection", () => {
  it("offers presets and retains selectable legacy offsets without duplicates", () => {
    expect(reminderChoices([2, 7, 29])).toEqual([0, 1, 2, 3, 7, 14, 29, 30]);
  });
  it("adds and removes offsets without mutating the saved selection", () => {
    const days = [7, 0];
    expect(toggleReminderDay(days, 3)).toEqual([7, 3, 0]);
    expect(toggleReminderDay(days, 7)).toEqual([0]);
    expect(days).toEqual([7, 0]);
  });
  it("retains at least one reminder", () => {
    expect(toggleReminderDay([0], 0)).toEqual([0]);
  });
  it("does not exceed ten offsets", () => {
    const days = Array.from({ length: 10 }, (_, i) => i);
    expect(toggleReminderDay(days, 14)).toEqual(days);
  });
  it.each([-1, 31, 1.5, NaN])("rejects invalid offset %s", (day) => {
    expect(toggleReminderDay([7], day)).toEqual([7]);
  });
});
