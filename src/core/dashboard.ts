import {
  daysBetween,
  effectiveStatus,
  localDate,
  targetDate,
  priority,
  addDays,
} from "./dates";
import type { Vault } from "./schema";
export function dashboardSummary(vault: Vault, today = localDate()) {
  const active = vault.subscriptions.filter(
    (s) => !["cancelled", "archived", "expired"].includes(s.status),
  );
  const upcoming = active
    .filter((s) => {
      const date = targetDate(s, today);
      return date && daysBetween(today, date) <= 7;
    })
    .sort((a, b) => priority(a, today) - priority(b, today));
  const groups = [
    { id: "trial", label: "Dùng thử", color: "#5c8af1", count: 0 },
    { id: "active", label: "Hoạt động", color: "#2457ac", count: 0 },
    { id: "pending", label: "Chờ hủy", color: "#e3a139", count: 0 },
    { id: "ended", label: "Đã kết thúc", color: "#bdcadd", count: 0 },
  ];
  for (const s of vault.subscriptions) {
    const index =
      s.status === "trial"
        ? 0
        : s.status === "cancellation_pending"
          ? 2
          : ["cancelled", "expired", "archived"].includes(s.status)
            ? 3
            : 1;
    groups[index].count++;
  }
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const start = addDays(today, i * 7),
      end = addDays(today, i * 7 + 6);
    return {
      label: i === 0 ? "Tuần này" : `Tuần ${i + 1}`,
      count: active.filter((s) => {
        const date = targetDate(s, today);
        return date && date >= start && date <= end;
      }).length,
    };
  });
  return {
    active: active.length,
    trials: groups[0].count,
    cards: vault.cards.filter((c) => c.status === "active").length,
    upcoming,
    overdue: upcoming.filter((s) => effectiveStatus(s, today) === "overdue")
      .length,
    groups,
    weeks,
    total: vault.subscriptions.length,
  };
}
