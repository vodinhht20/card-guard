import { useLocale } from "./Locale";
import { useMemo, useState, type ReactNode } from "react";
import {
  Calendar,
  CalendarGrid,
  CalendarCell,
  Heading,
  Button,
} from "react-aria-components";
import { parseDate } from "@internationalized/date";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Search,
  X,
  ArrowUpRight,
  Clock3,
  RefreshCw,
} from "lucide-react";
import {
  calendarAmount,
  calendarSummary,
  filterCalendarEvents,
  groupCalendarEvents,
  type CalendarFilter,
} from "../core/calendarPresentation";
import { ServiceLogo } from "./ServiceLogo";
import { dueEvents, monthRange, type DueEvent } from "../core/calendar";
import { addDays, daysBetween, localDate } from "../core/dates";
import type { Subscription } from "../core/schema";
import { Select } from "./controls";
import { Field } from "./components";
function EventRow({
  event,
  onOpen,
  today,
}: {
  event: DueEvent;
  onOpen: (s: Subscription) => void;
  today: string;
}) {
  const { t, language } = useLocale();
  const days = daysBetween(today, event.date);
  const amount = calendarAmount(
    event.service.amount,
    event.service.currency,
    language,
  );
  return (
    <button
      className={`due-event event-${event.kind}`}
      onClick={() => onOpen(event.service)}
    >
      <ServiceLogo domain={event.service.domain} name={event.service.name} />
      <span className="due-event-info">
        <strong>{event.service.name}</strong>
        <small>
          <span className={`event-kind ${event.kind}`}>
            {event.kind === "trial" ? t("Hết dùng thử") : t("Gia hạn")}
          </span>
          {event.service.status === "cancellation_pending"
            ? t(" · Chờ hủy")
            : ""}
        </small>
        <small>{event.service.domain}</small>
      </span>
      <span className="due-event-meta">
        {amount && <strong>{amount}</strong>}
        <span
          className={`due-event-distance ${days >= 0 && days <= 3 ? "soon" : ""}`}
        >
          {days < 0
            ? t("Đã qua")
            : days === 0
              ? t("Hôm nay")
              : t(`${days} ngày`)}
        </span>
      </span>
      <ChevronRight size={14} aria-hidden="true" />
    </button>
  );
}
export function CalendarView({
  services,
  month,
  selectedDay,
  onMonth,
  onDay,
  onService,
  recent,
  onAddService,
}: {
  services: Subscription[];
  month: string | null;
  selectedDay: string | null;
  onMonth: (month: string) => void;
  onDay: (day: string | null) => void;
  onService: (s: Subscription) => void;
  recent?: ReactNode;
  onAddService: () => void;
}) {
  const { t, language } = useLocale();
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [query, setQuery] = useState("");
  const today = localDate(),
    visibleMonth = month ?? today.slice(0, 7);
  const [focused, setFocused] = useState(parseDate(`${visibleMonth}-01`));
  const upcoming = useMemo(
    () => dueEvents(services, today, addDays(today, 30)),
    [services, today],
  );
  const events = useMemo(() => {
    const { start, end } = monthRange(visibleMonth);
    return dueEvents(services, start, end);
  }, [services, visibleMonth]);
  const summary = useMemo(() => calendarSummary(events), [events]);
  const filtered = useMemo(
    () => filterCalendarEvents(events, filter, query),
    [events, filter, query],
  );
  const groups = useMemo(() => groupCalendarEvents(filtered), [filtered]);
  const agenda = selectedDay
    ? filtered.filter((e) => e.date === selectedDay)
    : filtered;
  const agendaGroups = groupCalendarEvents(agenda);
  const upcomingGroups = groupCalendarEvents(upcoming);
  const dateLabel = (date: string) =>
    new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(`${date}T12:00:00`));
  const renderGroups = (items: Map<string, DueEvent[]>) =>
    Array.from(items, ([date, entries]) => (
      <div className="agenda-day" key={date}>
        <div className="agenda-day-heading">
          <time dateTime={date}>{dateLabel(date)}</time>
          <span>
            {entries.length} {t("mốc đến hạn")}
          </span>
        </div>
        {entries.map((event) => (
          <EventRow
            key={`${event.service.id}:${event.date}`}
            event={event}
            today={today}
            onOpen={onService}
          />
        ))}
      </div>
    ));
  const [year, number] = visibleMonth.split("-").map(Number);
  const showMonth = (value: string) => {
    onMonth(value);
    onDay(null);
  };
  return (
    <div className="reminder-calendar">
      <header className="calendar-hero">
        <div className="calendar-hero-top">
          <span className="calendar-hero-icon">
            <CalendarDays size={22} />
          </span>
          <span className="calendar-hero-caption">
            {t("CHỦ ĐỘNG MỖI NGÀY")}
          </span>
          <button
            className="calendar-add"
            onClick={onAddService}
            aria-label={t("Thêm dịch vụ")}
            title={t("Thêm dịch vụ")}
          >
            <Plus size={20} />
          </button>
        </div>
        <h1>{t("Lịch nhắc")}</h1>
        <p>{t("Nắm rõ lịch hẹn. Không bỏ lỡ gia hạn.")}</p>
        <span className="calendar-summary-period">
          {t(`Tháng ${number}`)} · {year}
        </span>
        <div className="calendar-overview" aria-label={t("Tổng quan tháng")}>
          <div>
            <strong>{summary.total}</strong>
            <span>{t("Mốc đến hạn")}</span>
          </div>
          <div>
            <strong>{summary.trials}</strong>
            <span>{t("Hết dùng thử")}</span>
          </div>
          <div>
            <strong>{summary.renewals}</strong>
            <span>{t("Gia hạn")}</span>
          </div>
        </div>
      </header>
      <section
        className="reminder-section month-section"
        aria-labelledby="month-title"
      >
        <div className="reminder-section-title">
          <div>
            <span className="calendar-kicker">{t("Lịch tháng")}</span>
            <h2 id="month-title">
              {t(`Tháng ${number}`)} <span className="month-year">{year}</span>
            </h2>
          </div>
          <button
            className="text-button"
            onClick={() => showMonth(today.slice(0, 7))}
          >
            {t("Tháng này")}
          </button>
        </div>
        <Calendar
          aria-label={t("Lịch dịch vụ")}
          className="service-month"
          value={selectedDay ? parseDate(selectedDay) : null}
          onChange={(date) => {
            if (date) onMonth(date.toString().slice(0, 7));
            onDay(date?.toString() ?? null);
          }}
          focusedValue={
            focused.toString().slice(0, 7) === visibleMonth
              ? focused
              : parseDate(`${visibleMonth}-01`)
          }
          onFocusChange={(date) => {
            setFocused(date);
            if (date.toString().slice(0, 7) !== visibleMonth)
              showMonth(date.toString().slice(0, 7));
          }}
          minValue={parseDate("2000-01-01")}
          maxValue={parseDate("2100-12-31")}
          firstDayOfWeek="mon"
        >
          <Heading className="sr-only" />
          <div className="month-toolbar">
            <Field label={t("Tháng")}>
              <Select
                value={String(number)}
                onChange={(e) =>
                  showMonth(`${year}-${e.target.value.padStart(2, "0")}`)
                }
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option value={String(i + 1)} key={i}>
                    {t(`Tháng ${i + 1}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("Năm")}>
              <Select
                value={String(year)}
                onChange={(e) =>
                  showMonth(
                    `${e.target.value}-${String(number).padStart(2, "0")}`,
                  )
                }
              >
                {Array.from({ length: 101 }, (_, i) => (
                  <option value={String(2000 + i)} key={i}>
                    {2000 + i}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              slot="previous"
              className="month-arrow"
              aria-label={t("Tháng trước")}
            >
              <ChevronLeft size={18} />
            </Button>
            <Button
              slot="next"
              className="month-arrow"
              aria-label={t("Tháng sau")}
            >
              <ChevronRight size={18} />
            </Button>
          </div>
          <CalendarGrid className="month-grid">
            {(date) => {
              const key = date.toString(),
                dayEvents = groups.get(key) ?? [],
                count = dayEvents.length,
                trials = dayEvents.filter(
                  (event) => event.kind === "trial",
                ).length,
                tone =
                  trials === count
                    ? "trial"
                    : trials === 0
                      ? "renewal"
                      : "mixed";
              return (
                <CalendarCell
                  date={date}
                  className={`month-cell ${count ? `day-has-events day-${tone}` : ""}`}
                  data-date={key}
                  aria-describedby={
                    count ? `calendar-events-${key}` : undefined
                  }
                >
                  <span className="month-day-number">{date.day}</span>
                  {count > 0 && (
                    <span className="sr-only" id={`calendar-events-${key}`}>
                      {count} {t("dịch vụ đến hạn")}
                    </span>
                  )}
                  <span
                    className={`month-event-mark ${count ? `has-events mark-${tone}` : ""}`}
                    aria-hidden="true"
                  >
                    {count ? count : ""}
                  </span>
                </CalendarCell>
              );
            }}
          </CalendarGrid>
        </Calendar>
        <div className="calendar-legend" aria-label={t("Chú thích lịch")}>
          <span>
            <i className="legend-dot trial" />
            {t("Hết dùng thử")}
          </span>
          <span>
            <i className="legend-dot renewal" />
            {t("Gia hạn")}
          </span>
          <span>
            <i className="legend-dot today" />
            {t("Hôm nay")}
          </span>
        </div>
        <div className="calendar-filters" aria-label={t("Lọc lịch")}>
          {(
            [
              ["all", "Tất cả"],
              ["trial", "Hết dùng thử"],
              ["renewal", "Gia hạn"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "trial" ? (
                <Clock3 size={14} />
              ) : value === "renewal" ? (
                <RefreshCw size={14} />
              ) : (
                <CalendarDays size={14} />
              )}
              {t(label)}
            </button>
          ))}
        </div>
        <div className="calendar-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label={t("Tìm trong lịch")}
            placeholder={t("Tìm tên dịch vụ, website…")}
            value={query}
            maxLength={100}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button aria-label={t("Xóa tìm kiếm")} onClick={() => setQuery("")}>
              <X size={15} />
            </button>
          )}
        </div>
        <div className="month-agenda-title">
          <h3>
            {selectedDay
              ? t(`Ngày ${selectedDay.slice(8)}/${selectedDay.slice(5, 7)}`)
              : t(`Trong tháng · ${agenda.length}`)}
          </h3>
          {selectedDay && (
            <button className="text-button" onClick={() => onDay(null)}>
              {t("Cả tháng")}
            </button>
          )}
        </div>
        <div className="due-event-list month-agenda" aria-live="polite">
          {agenda.length ? (
            renderGroups(agendaGroups)
          ) : (
            <p className="calendar-empty">
              <CalendarDays size={25} aria-hidden="true" />
              {query || filter !== "all"
                ? t("Không có lịch phù hợp với bộ lọc.")
                : selectedDay
                  ? t("Ngày này không có dịch vụ đến hạn.")
                  : t("Tháng này không có dịch vụ đến hạn.")}
            </p>
          )}
        </div>
      </section>
      <section
        className="reminder-section upcoming-section"
        aria-labelledby="upcoming-title"
      >
        <div className="reminder-section-title">
          <div>
            <span className="calendar-kicker">
              {t("Sẵn sàng cho những ngày tới")}
            </span>
            <h2 id="upcoming-title">
              {t("Sắp đến hạn")} <ArrowUpRight size={18} />
            </h2>
          </div>
          <span className="calendar-period">{t("30 ngày tới")}</span>
        </div>
        <div className="due-event-list upcoming-events">
          {upcoming.length ? (
            renderGroups(upcomingGroups)
          ) : (
            <p className="calendar-empty">
              <CalendarDays size={25} aria-hidden="true" />
              {t("Không có dịch vụ đến hạn trong 30 ngày.")}
            </p>
          )}
        </div>
        {recent}
      </section>
    </div>
  );
}
