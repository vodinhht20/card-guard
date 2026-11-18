import { settingsSchema } from "./schema";

export function reminderChoices(savedDays: readonly number[]): number[] {
  return [...new Set([0, 1, 3, 7, 14, 30, ...savedDays])].sort((a, b) => a - b);
}

export function toggleReminderDay(days: number[], day: number): number[] {
  const next = days.includes(day)
    ? days.filter((value) => value !== day)
    : [...days, day];
  const parsed = settingsSchema.shape.reminderDays.safeParse(next);
  return parsed.success ? parsed.data.sort((a, b) => b - a) : days;
}
