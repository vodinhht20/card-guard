import { ServiceLogo } from "./ServiceLogo";
import {
  Plus,
  CreditCard,
  ChevronRight,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import { dashboardSummary } from "../core/dashboard";
import { targetDate, daysBetween, localDate } from "../core/dates";
import type { Vault, Subscription } from "../core/schema";
export function Dashboard({
  vault,
  onAddCard,
  onAddService,
  onService,
  onAll,
  t,
}: {
  vault: Vault;
  onAddCard: () => void;
  onAddService: () => void;
  onService: (s: Subscription) => void;
  onAll: () => void;
  t: (v: string) => string;
}) {
  const data = dashboardSummary(vault),
    max = Math.max(1, ...data.weeks.map((w) => w.count));
  let offset = 0;
  const segments = data.groups
    .filter((g) => g.count)
    .map((g) => {
      const start = offset;
      offset += (g.count / Math.max(1, data.total)) * 100;
      return `${g.color} ${start}% ${offset}%`;
    });
  return (
    <div className="dashboard-new">
      <div className="dashboard-title">
        <div>
          <h1>{t("Tổng quan")}</h1>
          <p>
            {t(`${data.active} dịch vụ`)} · {t(`${data.cards} thẻ`)}
          </p>
        </div>
        <span className="today-pill">
          {new Date().toLocaleDateString(vault.settings.language, {
            day: "2-digit",
            month: "2-digit",
          })}
        </span>
      </div>
      <div className="attention-card">
        <div>
          <span>{t("CẦN KIỂM TRA")}</span>
          <strong>{data.upcoming.length}</strong>
          <p>
            {data.overdue
              ? t(`${data.overdue} dịch vụ quá hạn`)
              : data.upcoming.length
                ? t("Sắp đến hạn")
                : t("Chưa có lịch đến hạn")}
          </p>
        </div>
        <button
          className="attention-link"
          onClick={onAll}
          aria-label={t("Xem dịch vụ")}
        >
          <ArrowUpRight size={24} />
        </button>
      </div>
      <div className="quick-actions">
        <button className="primary" onClick={onAddService}>
          <Plus size={18} />
          {t("Thêm dịch vụ")}
        </button>
        <button className="secondary" onClick={onAddCard}>
          <CreditCard size={18} />
          {t("Thêm thẻ")}
        </button>
      </div>
      <div className="section-title">
        <h2>
          {t("Sắp gia hạn")}
          <span className="count">{data.upcoming.length}</span>
        </h2>
        <button className="text-button" onClick={onAll}>
          {t("Xem tất cả")}
          <ChevronRight size={15} />
        </button>
      </div>
      {data.upcoming.length ? (
        <div className="upcoming-list">
          {data.upcoming.slice(0, 4).map((s) => {
            const date = targetDate(s)!,
              days = daysBetween(localDate(), date);
            return (
              <button
                className="upcoming-item"
                key={s.id}
                onClick={() => onService(s)}
              >
                <ServiceLogo domain={s.domain} name={s.name} />
                <span className="grow">
                  <strong>{s.name}</strong>
                  <small>
                    {s.amount ? `${s.amount} ${s.currency}` : s.domain}
                  </small>
                </span>
                <span className={`due-label ${days < 0 ? "late" : ""}`}>
                  <strong>
                    {days < 0
                      ? t("Quá hạn")
                      : days === 0
                        ? t("Hôm nay")
                        : t(`${days} ngày`)}
                  </strong>
                  <small>
                    {date.split("-").reverse().slice(0, 2).join("/")}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="quiet-empty">
          <CalendarDays size={24} />
          <div>
            <strong>
              {data.total
                ? t("Lịch của bạn đang ổn")
                : t("Bắt đầu với dịch vụ đầu tiên")}
            </strong>
            <p>
              {data.total
                ? t("Các mốc mới sẽ xuất hiện tại đây.")
                : t("Chọn dịch vụ để nhận nhắc trước ngày gia hạn.")}
            </p>
          </div>
        </div>
      )}
      {vault.settings.dashboardChart && (
        <div className="dashboard-charts">
          <section className="chart-surface">
            <h2>{t("Dịch vụ của bạn")}</h2>
            <div className="status-chart">
              <div
                className="donut"
                role="img"
                aria-label={`${t("Tổng")} ${data.total} ${t("dịch vụ")}. ${data.groups.map((g) => `${t(g.label)}: ${g.count}`).join(", ")}`}
                style={{
                  background: segments.length
                    ? `conic-gradient(${segments.join(",")})`
                    : "var(--line)",
                }}
              >
                <div>
                  <strong>{data.total}</strong>
                  <small>{t("dịch vụ")}</small>
                </div>
              </div>
              <ul>
                {data.groups.map((g) => (
                  <li key={g.id}>
                    <span
                      className="legend-dot"
                      style={{ background: g.color }}
                    />
                    {t(g.label)}
                    <strong>{g.count}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section className="chart-surface">
            <h2>{t("Lịch 4 tuần tới")}</h2>
            <div
              className="week-bars"
              role="img"
              aria-label={data.weeks
                .map((w) => `${t(w.label)}: ${w.count} ${t("lần gia hạn")}`)
                .join(", ")}
            >
              {data.weeks.map((w) => (
                <div className="week-column" key={t(w.label)}>
                  <strong>{w.count}</strong>
                  <div className="bar-track">
                    <span style={{ height: `${(w.count / max) * 100}%` }} />
                  </div>
                  <small>{t(w.label)}</small>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
