import type { DueEvent } from "./calendar";
export type CalendarFilter = "all" | DueEvent["kind"];
export function calendarSummary(events: readonly DueEvent[]) {
  let trials = 0;
  for (const event of events) {
    if (event.kind === "trial") trials++;
  }
  return {
    total: events.length,
    trials,
    renewals: events.length - trials,
  };
}
export function filterCalendarEvents(
  events: readonly DueEvent[],
  filter: CalendarFilter,
  query: string,
): DueEvent[] {
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return events.filter((event) => {
    if (filter !== "all" && event.kind !== filter) return false;
    const text = normalize(`${event.service.name} ${event.service.domain}`);
    return terms.every((term) => text.includes(term));
  });
}
export function groupCalendarEvents(
  events: readonly DueEvent[],
): Map<string, DueEvent[]> {
  const groups = new Map<string, DueEvent[]>();
  for (const event of events) {
    const group = groups.get(event.date) ?? [];
    group.push(event);
    groups.set(event.date, group);
  }
  return groups;
}

// Format the stored decimal string without floating-point conversion or rounding.
export function calendarAmount(
  amount: string,
  currency: string,
  language: "vi" | "en",
): string {
  if (!amount) return "";
  const [whole, fraction] = amount.split(".");
  const separator = language === "vi" ? "." : ",";
  const decimal = language === "vi" ? "," : ".";
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, separator)}${fraction === undefined ? "" : decimal + fraction} ${currency}`;
}
