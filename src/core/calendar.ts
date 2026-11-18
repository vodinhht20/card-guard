import { addDays, daysBetween, nextRenewal, targetDate } from "./dates";
import { dateOnly, type Subscription } from "./schema";
export type DueEvent = {
  date: string;
  service: Subscription;
  kind: "trial" | "renewal";
};
export function monthRange(month: string) {
  const start = dateOnly.parse(`${month}-01`);
  const [year, number] = month.split("-").map(Number);
  const last = new Date(year, number, 0, 12).getDate();
  return { start, end: `${month}-${last}` };
}
// Bounded calendar windows; recurrence always derives from the original anchor.
export function dueEvents(
  services: Subscription[],
  start: string,
  end: string,
): DueEvent[] {
  dateOnly.parse(start);
  dateOnly.parse(end);
  const span = daysBetween(start, end);
  if (span < 0 || span > 366) throw new Error("Khoảng lịch không hợp lệ.");
  const events: DueEvent[] = [];
  for (const service of services) {
    const target = targetDate(service, start);
    if (!target) continue;
    const dates = new Set<string>();
    if (target >= start && target <= end) dates.add(target);
    if (service.renewalDate && service.recurrence !== "none") {
      let date = nextRenewal(service.renewalDate, service.recurrence, start);
      while (date <= end) {
        dates.add(date);
        date = nextRenewal(
          service.renewalDate,
          service.recurrence,
          addDays(date, 1),
        );
      }
    }
    for (const date of dates)
      events.push({
        date,
        service,
        kind: date === service.trialEnd ? "trial" : "renewal",
      });
  }
  return events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.service.name.localeCompare(b.service.name),
  );
}
