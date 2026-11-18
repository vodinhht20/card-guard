import { z } from "zod";
import {
  addDays,
  atLocalHour,
  localDate,
  nextRenewal,
  targetDate,
} from "./dates";
import { type Vault } from "./schema";
export const reminderSchema = z
  .object({
    id: z.string().regex(/^[a-f0-9]{64}$/),
    group: z.string().regex(/^[a-f0-9]{64}$/),
    at: z.number().finite(),
    dueAt: z.number().finite(),
    delivered: z.boolean(),
    snoozeUntil: z.number().finite().nullable(),
  })
  .strict();
export type Reminder = z.infer<typeof reminderSchema>;
export const scheduleSchema = z.array(reminderSchema).max(50000);
export async function opaque(value: string): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function buildSchedule(
  vault: Vault,
  old: Reminder[],
  today = localDate(),
): Promise<Reminder[]> {
  const prior = new Map(old.map((r) => [r.id, r]));
  const result: Reminder[] = [];
  for (const s of vault.subscriptions) {
    const date = targetDate(s, today);
    if (!date) continue;
    const group = await opaque(s.id);
    const dates = new Set([date]);
    if (s.renewalDate && s.recurrence !== "none") {
      let renewal = nextRenewal(s.renewalDate, s.recurrence, today);
      const horizon = addDays(today, 730);
      while (renewal <= horizon) {
        dates.add(renewal);
        renewal = nextRenewal(s.renewalDate, s.recurrence, addDays(renewal, 1));
      }
    }
    for (const occurrence of dates) {
      for (const days of vault.settings.reminderDays) {
        const id = await opaque(`${s.id}:${occurrence}:${days}`);
        const previous = prior.get(id);
        result.push({
          id,
          group,
          at: atLocalHour(addDays(occurrence, -days)),
          dueAt: atLocalHour(occurrence),
          delivered: previous?.delivered ?? false,
          snoozeUntil: previous?.snoozeUntil ?? null,
        });
        if (result.length > 50000)
          throw new Error(
            "Lịch vượt giới hạn 50.000 mốc nhắc. Hãy giảm mốc hoặc lưu trữ dịch vụ cũ.",
          );
      }
    }
  }
  return scheduleSchema.parse(result);
}
export function dueReminders(schedule: Reminder[], now: number): Reminder[] {
  return schedule.filter((r) => !r.delivered && (r.snoozeUntil ?? r.at) <= now);
}
export function badgeCount(schedule: Reminder[], now: number): number {
  return new Set(
    schedule
      .filter((r) => r.dueAt >= now - 86400000 && r.dueAt <= now + 7 * 86400000)
      .map((r) => r.group),
  ).size;
}
// Worker can advance anonymous recurring reminders while locked, using only schedule metadata.
// Actual recurrence rules stay encrypted; unlock regenerates future cycles.
export interface ReminderIO {
  load(): Promise<Reminder[]>;
  save(schedule: Reminder[]): Promise<void>;
  notify(ids: string[]): Promise<void>;
  alarm(when: number | null): Promise<void>;
  badge(count: number): Promise<void>;
}
export async function reconcile(
  io: ReminderIO,
  now = Date.now(),
): Promise<void> {
  const schedule = scheduleSchema.parse(await io.load());
  const due = dueReminders(schedule, now);
  if (due.length) {
    const ids = new Set(due.map((r) => r.id));
    // Persist before notifying: prefer an occasional missed notice over duplicate/storm on worker crash.
    for (const r of schedule) if (ids.has(r.id)) r.delivered = true;
    await io.save(schedule);
    await io.notify(due.map((r) => r.id));
  }
  const future = schedule
    .filter((r) => !r.delivered)
    .map((r) => r.snoozeUntil ?? r.at)
    .filter((at) => at > now);
  await io.alarm(future.length ? Math.min(...future) : null);
  await io.badge(badgeCount(schedule, now));
}

export function rebaseTimeZone(
  schedule: Reminder[],
  previousZone: string,
): Reminder[] {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: previousZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const convert = (timestamp: number) => {
    const parts = formatter.formatToParts(timestamp);
    const value = (type: string) => parts.find((p) => p.type === type)!.value;
    return atLocalHour(`${value("year")}-${value("month")}-${value("day")}`);
  };
  return schedule.map((r) => ({
    ...r,
    at: convert(r.at),
    dueAt: convert(r.dueAt),
  }));
}
