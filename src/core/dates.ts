import type { Subscription } from "./schema";
export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addDays(value: string, days: number): string {
  const [y, m, d] = value.split("-").map(Number);
  return localDate(new Date(y, m - 1, d + days, 12));
}
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) /
      86400000,
  );
}
export function atLocalHour(value: string, hour = 9): number {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, hour).getTime();
}
// Always calculate from original anchor to avoid January 31 -> February 28 -> March 28 drift.
export function nextRenewal(
  anchor: string,
  recurrence: Subscription["recurrence"],
  today = localDate(),
): string {
  if (recurrence === "none" || anchor >= today) return anchor;
  const [year, month, day] = anchor.split("-").map(Number);
  let step =
    recurrence === "monthly"
      ? Math.max(
          0,
          (+today.slice(0, 4) - year) * 12 + (+today.slice(5, 7) - month),
        )
      : +today.slice(0, 4) - year;
  const occurrence = (n: number) => {
    const m = recurrence === "monthly" ? month - 1 + n : month - 1;
    const y = recurrence === "yearly" ? year + n : year;
    const lastDay = new Date(y, m + 1, 0, 12).getDate();
    return localDate(new Date(y, m, Math.min(day, lastDay), 12));
  };
  while (occurrence(step) < today) step++;
  return occurrence(step);
}
export function targetDate(
  s: Subscription,
  today = localDate(),
): string | null {
  if (["cancelled", "archived", "expired"].includes(s.status)) return null;
  const renewal = s.renewalDate
    ? nextRenewal(s.renewalDate, s.recurrence, today)
    : null;
  if (
    s.trialEnd &&
    (s.status === "trial" ||
      (s.status === "cancellation_pending" &&
        (!renewal || (s.trialEnd >= today && s.trialEnd <= renewal))))
  )
    return s.trialEnd;
  return renewal ?? s.trialEnd;
}
export function effectiveStatus(s: Subscription, today = localDate()): string {
  if (
    ["cancelled", "archived", "expired", "cancellation_pending"].includes(
      s.status,
    )
  )
    return s.status;
  const date = targetDate(s, today);
  if (!date) return s.status;
  const days = daysBetween(today, date);
  return days < 0 ? "overdue" : days <= 7 ? "expiring" : s.status;
}
export function priority(s: Subscription, today = localDate()): number {
  const d = targetDate(s, today);
  if (!d) return 100000;
  return daysBetween(today, d);
}
