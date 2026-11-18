import { ServiceLogo } from "./ServiceLogo";
import { useLocale } from "./Locale";
import { CalendarView } from "./CalendarView";
import { Dashboard } from "./Dashboard";
import { Gate } from "./Gate";
import { Select } from "./controls";
import { emptyWorkspace, type WorkspaceSnapshot } from "../core/workspace";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Plus,
  CreditCard,
  LayoutDashboard,
  CalendarDays,
  Settings,
  Layers,
  ChevronRight,
  Search,
  Check,
} from "lucide-react";
import { useVault } from "./useVault";
import { Empty, Modal } from "./components";
import { CardForm, ServiceForm } from "./forms";
import { SettingsView } from "./Settings";
import { statuses } from "./i18n";
import {
  cardSchema,
  httpsUrl,
  type PaymentCard,
  type Subscription,
  type Vault,
} from "../core/schema";
import {
  deleteCard,
  deleteService,
  saveCard,
  saveService,
  updateService,
} from "../core/actions";
import {
  daysBetween,
  effectiveStatus,
  localDate,
  priority,
  targetDate,
} from "../core/dates";
import { signalSchema, type DetectionSignal } from "../core/detection";
import { scheduleSchema, type Reminder } from "../core/reminders";
type Page = WorkspaceSnapshot["page"];
type Dialog = WorkspaceSnapshot["dialog"];
export default function App() {
  const state = useVault();
  if (!state.vault)
    return (
      <div className="app">
        <Gate
          exists={state.exists}
          busy={state.busy}
          error={state.error}
          unlock={state.unlock}
        />
      </div>
    );
  return (
    <Workspace
      key="unlocked"
      vault={state.vault}
      save={state.save}
      lock={state.lock}
      busy={state.busy}
      error={state.error}
      initialWorkspace={state.workspace}
      remember={state.remember}
      sessionExpiresAt={state.sessionExpiresAt}
      forgetSession={state.forgetSession}
    />
  );
}
function Workspace({
  vault,
  save,
  lock,
  busy,
  error,
  initialWorkspace,
  remember,
  sessionExpiresAt,
  forgetSession,
}: {
  sessionExpiresAt: number | null;
  forgetSession: () => Promise<void>;
  initialWorkspace: WorkspaceSnapshot | null;
  remember: (s: WorkspaceSnapshot) => Promise<void>;
  vault: Vault;
  save: (v: Vault) => Promise<void>;
  lock: () => void;
  busy: boolean;
  error: string;
}) {
  const { t, setLanguage, language } = useLocale();
  useEffect(() => {
    setLanguage(vault.settings.language);
  }, [vault.settings.language]);
  const [windowId, setWindowId] = useState<number>();
  useEffect(() => {
    void chrome.windows.getCurrent().then((w) => setWindowId(w.id));
  }, []);
  const initial = initialWorkspace ?? emptyWorkspace();
  const [page, setPage] = useState<Page>(initial.page),
    [dialog, setDialogState] = useState<Dialog>(initial.dialog),
    [cardDraft, setCardDraft] = useState<PaymentCard | null>(initial.cardDraft),
    [serviceDraft, setServiceDraft] = useState<Subscription | null>(
      initial.serviceDraft,
    ),
    [serviceEntryMode, setServiceEntryMode] = useState(
      initial.serviceEntryMode,
    ),
    [serviceSearch, setServiceSearch] = useState(initial.serviceSearch),
    [advanced, setAdvanced] = useState(initial.advanced),
    [preview, setPreview] = useState(initial.preview),
    [draftStatus, setDraftStatus] = useState<"saving" | "saved" | "error">(
      "saving",
    ),
    [calendarMonth, setCalendarMonth] = useState(initial.calendarMonth),
    [calendarDay, setCalendarDay] = useState(initial.calendarDay),
    [query, setQuery] = useState(initial.query),
    [filter, setFilter] = useState(initial.filter),
    [toast, setToast] = useState("");
  const setDialog = (value: Dialog) => {
    setDialogState(value);
    setCardDraft(null);
    setServiceDraft(null);
    setAdvanced(false);
    setPreview(false);
    setServiceEntryMode("choose");
    setServiceSearch("");
  };
  useEffect(() => {
    let active = true;
    setDraftStatus("saving");
    void remember({
      page,
      dialog,
      query,
      filter,
      calendarMonth,
      calendarDay,
      cardDraft,
      serviceDraft,
      serviceEntryMode,
      serviceSearch,
      advanced,
      preview,
    }).then(
      () => {
        if (active) setDraftStatus("saved");
      },
      () => {
        if (active) setDraftStatus("error");
      },
    );
    return () => {
      active = false;
    };
  }, [
    remember,
    page,
    dialog,
    query,
    filter,
    calendarMonth,
    calendarDay,
    cardDraft,
    serviceDraft,
    serviceEntryMode,
    serviceSearch,
    advanced,
    preview,
    vault,
  ]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);
  const [suggestion, setSuggestion] = useState<DetectionSignal | null>(null),
    [reminders, setReminders] = useState<Reminder[]>([]);
  const notify = (m: string) => setToast(m);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        vault.settings.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : vault.settings.theme);
    apply();
    document.documentElement.dataset.textSize = vault.settings.textSize;
    void chrome.storage.local.set({ uiTextSize: vault.settings.textSize });
    document.documentElement.lang = vault.settings.language;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [vault.settings.theme, vault.settings.language, vault.settings.textSize]);
  useEffect(() => {
    const load = async () => {
      const s = (await chrome.storage.session.get("suggestion")).suggestion;
      const parsed = signalSchema.safeParse(
        s
          ? {
              type: s.type,
              domain: s.domain,
              confidence: s.confidence,
              kind: s.kind,
              trialDays: s.trialDays,
            }
          : null,
      );
      if (
        parsed.success &&
        typeof s.expiresAt === "number" &&
        s.expiresAt > Date.now()
      )
        setSuggestion(parsed.data);
      else setSuggestion(null);
      const r = (await chrome.storage.local.get("reminders")).reminders;
      const result = scheduleSchema.safeParse(r ?? []);
      if (result.success) setReminders(result.data);
    };
    void load().catch(() => undefined);
    const change = () => void load().catch(() => undefined);
    chrome.storage.onChanged.addListener(change);
    return () => chrome.storage.onChanged.removeListener(change);
  }, []);
  const attempt = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      notify(
        e instanceof Error &&
          !(e instanceof SyntaxError) &&
          e.message.length < 180
          ? e.message
          : "Thao tác không thành công. Kiểm tra dữ liệu và thử lại.",
      );
    }
  };
  const commit = async (next: Vault) => {
    await save(next);
    setDialog(null);
    notify("Đã lưu an toàn.");
  };
  const services = [...vault.subscriptions].sort(
    (a, b) => priority(a) - priority(b) || a.name.localeCompare(b.name),
  );
  const nav: {
    id: Page;
    label: string;
    shortLabel: string;
    icon: typeof CreditCard;
  }[] = [
    {
      id: "dashboard",
      label: "Tổng quan",
      shortLabel: t("Chính"),
      icon: LayoutDashboard,
    },
    {
      id: "cards",
      label: "Thẻ của tôi",
      shortLabel: t("Thẻ"),
      icon: CreditCard,
    },
    { id: "services", label: "Dịch vụ", shortLabel: t("Gói"), icon: Layers },
    {
      id: "calendar",
      label: "Lịch nhắc",
      shortLabel: t("Lịch"),
      icon: CalendarDays,
    },
    {
      id: "settings",
      label: "Cài đặt",
      shortLabel: language === "en" ? "Setup" : t("Cài đặt"),
      icon: Settings,
    },
  ];
  const openPanel = () => {
    if (windowId === undefined) {
      notify("Chưa xác định cửa sổ Chrome. Hãy thử lại.");
      return;
    }
    void chrome.sidePanel
      .open({ windowId })
      .catch(() => notify("Không thể mở Side Panel."));
  };

  const removeSuggestion = () => {
    setSuggestion(null);
    void chrome.storage.session.remove("suggestion");
  };
  const changeReminder = async (id: string, snooze: boolean) => {
    const response = await chrome.runtime.sendMessage({
      type: "REMINDER_ACTION",
      id,
      action: snooze ? "snooze" : "dismiss",
    });
    if (!response?.ok) throw new Error("Không thể cập nhật lịch nhắc.");
    notify("Đã lưu an toàn.");
  };
  return (
    <div className="app">
      <main className="workspace">
        {(error || toast) && (
          <div
            className={error ? "notice error" : "notice"}
            role={error ? "alert" : "status"}
          >
            {t(error || toast)}
            <button
              className="text-button"
              onClick={() => setToast("")}
              aria-label={t("Đóng thông báo")}
            >
              ×
            </button>
          </div>
        )}
        {suggestion && (
          <aside className="suggestion">
            <div>
              <span className="eyebrow">{t("Gợi ý từ website")}</span>
              <strong>{suggestion.domain}</strong>
              <small>
                {suggestion.confidence} {t("· Chưa xác nhận đăng ký")}
              </small>
            </div>
            <button
              className="secondary"
              onClick={() => {
                setDialog(
                  suggestion.kind === "card"
                    ? { type: "card" }
                    : { type: "service", suggestion },
                );
                removeSuggestion();
              }}
            >
              {t(suggestion.kind === "card" ? "Thêm thẻ" : "Lưu liên kết")}
            </button>
            <button className="text-button" onClick={removeSuggestion}>
              {t("Bỏ qua")}
            </button>
          </aside>
        )}
        {page === "dashboard" && (
          <Dashboard
            vault={vault}
            t={t}
            onAddCard={() => setDialog({ type: "card" })}
            onAddService={() => setDialog({ type: "service" })}
            onService={(service) =>
              setDialog({ type: "service-detail", service })
            }
            onAll={() => setPage("services")}
          />
        )}
        {page === "cards" && (
          <>
            <div className="page-title">
              <div>
                <h1>
                  {t("Thẻ của tôi")} <small>{vault.cards.length}</small>
                </h1>
              </div>
              <button
                className="primary compact"
                onClick={() => setDialog({ type: "card" })}
              >
                <Plus size={17} />
                {t("Thêm thẻ")}
              </button>
            </div>
            {vault.cards.length ? (
              <div className="cards-grid">
                {vault.cards.map((c) => (
                  <button
                    key={c.id}
                    className={`payment-card ${c.color} ${c.status}`}
                    onClick={() => setDialog({ type: "card-detail", card: c })}
                  >
                    <div className="card-top">
                      <strong className="card-name">{c.nickname}</strong>
                      <span className="network">
                        {c.network === "other" ? (
                          <CreditCard size={20} />
                        ) : (
                          c.network.toUpperCase()
                        )}
                      </span>
                    </div>
                    <div className="card-number">
                      <span className="card-chip" aria-hidden="true" />
                      <span className="card-digits">
                        <span aria-hidden="true">••••</span> {c.last4}
                      </span>
                    </div>
                    <div className="card-bottom">
                      <span>
                        {c.status === "archived"
                          ? t("Đã lưu trữ")
                          : `${vault.subscriptions.filter((s) => s.cardId === c.id && !s.cardRemoved).length} ${t("dịch vụ")}`}
                      </span>
                      <ChevronRight size={18} />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <Empty
                title={t("Chưa có thẻ")}
                action={
                  <button
                    className="primary"
                    onClick={() => setDialog({ type: "card" })}
                  >
                    <Plus size={16} />
                    {t("Thêm thẻ")}
                  </button>
                }
              />
            )}
          </>
        )}
        {page === "services" && (
          <>
            <div className="page-title">
              <div>
                <h1>
                  {t("Dịch vụ")} <small>{services.length}</small>
                </h1>
              </div>
              <button
                className="primary compact"
                onClick={() => setDialog({ type: "service" })}
              >
                <Plus size={17} />
                {t("Thêm dịch vụ")}
              </button>
            </div>
            <div className="search-bar">
              <Search size={17} />
              <input
                aria-label={t("Tìm tên hoặc domain…")}
                placeholder={t("Tìm tên hoặc domain…")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select
              className="filter"
              aria-label={t("Trạng thái")}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">{t("Tất cả")}</option>
              {Object.entries(statuses).map(([k, v]) => (
                <option key={k} value={k}>
                  {t(v)}
                </option>
              ))}
            </Select>
            {services.length ? (
              <div className="service-list">
                {services
                  .filter(
                    (s) =>
                      (filter === "all" ||
                        effectiveStatus(s) === filter ||
                        s.status === filter) &&
                      `${s.name} ${s.domain}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  )
                  .map((s) => (
                    <ServiceRow
                      key={s.id}
                      service={s}
                      vault={vault}
                      t={t}
                      onClick={() =>
                        setDialog({ type: "service-detail", service: s })
                      }
                    />
                  ))}
                {!services.some(
                  (s) =>
                    (filter === "all" ||
                      effectiveStatus(s) === filter ||
                      s.status === filter) &&
                    `${s.name} ${s.domain}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                ) && <p className="muted">{t("Không có kết quả phù hợp.")}</p>}
              </div>
            ) : (
              <Empty
                title={t("Chưa có dịch vụ")}
                detail={t(
                  "Chưa có dữ liệu. Bắt đầu bằng một thẻ hoặc dịch vụ.",
                )}
              />
            )}
          </>
        )}
        {page === "calendar" && (
          <CalendarView
            onAddService={() => setDialog({ type: "service" })}
            services={vault.subscriptions}
            month={calendarMonth}
            selectedDay={calendarDay}
            onMonth={setCalendarMonth}
            onDay={setCalendarDay}
            onService={(service) =>
              setDialog({ type: "service-detail", service })
            }
            recent={
              reminders.some((r) => r.delivered || r.snoozeUntil) ? (
                <details className="recent-reminders">
                  <summary>{t("Nhắc gần nhất")}</summary>
                  {reminders
                    .filter((r) => r.delivered || r.snoozeUntil)
                    .slice(-12)
                    .map((r) => (
                      <div className="reminder-row" key={r.id}>
                        <time>
                          {new Date(r.snoozeUntil ?? r.at).toLocaleString(
                            vault.settings.language,
                          )}
                        </time>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() =>
                            void attempt(() => changeReminder(r.id, true))
                          }
                        >
                          {t("Nhắc lại sau 1 giờ")}
                        </button>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() =>
                            void attempt(() => changeReminder(r.id, false))
                          }
                        >
                          {t("Bỏ qua nhắc này")}
                        </button>
                      </div>
                    ))}
                </details>
              ) : undefined
            }
          />
        )}
        {page === "settings" && (
          <SettingsView
            vault={vault}
            save={save}
            t={t}
            busy={busy}
            report={notify}
            sessionExpiresAt={sessionExpiresAt}
            forgetSession={forgetSession}
            lock={lock}
            openPanel={
              document.body.classList.contains("popup") ? openPanel : undefined
            }
          />
        )}
      </main>
      <nav className="bottom-nav" aria-label={t("Điều hướng")}>
        {nav.map(({ id, label, shortLabel, icon: Icon }) => (
          <button
            key={id}
            aria-label={t(label)}
            title={t(label)}
            aria-current={page === id ? "page" : undefined}
            className={page === id ? "selected" : ""}
            onClick={() => setPage(id)}
          >
            <Icon size={19} />
            <span>{shortLabel}</span>
          </button>
        ))}
      </nav>
      {dialog && (
        <Modal
          title={t(
            dialog.type === "card"
              ? "Thêm thẻ"
              : dialog.type === "service"
                ? "Dịch vụ"
                : dialog.type === "delete"
                  ? "Xác nhận xóa"
                  : "Chi tiết",
          )}
          onClose={() => {
            if (!busy) setDialog(null);
          }}
        >
          {(dialog.type === "card" || dialog.type === "service") && (
            <p className="draft-status" role="status">
              {draftStatus === "saved"
                ? t("Đã giữ bản nháp")
                : draftStatus === "error"
                  ? t("Chưa giữ được bản nháp. Thử lại.")
                  : t("Đang lưu nháp…")}
            </p>
          )}
          {dialog.type === "card" && (
            <CardForm
              card={dialog.card}
              draft={cardDraft}
              onDraft={setCardDraft}
              advanced={advanced}
              onAdvanced={setAdvanced}
              t={t}
              busy={busy}
              onSave={async (c) => commit(saveCard(vault, c))}
            />
          )}
          {dialog.type === "service" && (
            <ServiceForm
              service={dialog.service}
              entryMode={serviceEntryMode}
              onEntryMode={setServiceEntryMode}
              search={serviceSearch}
              onSearch={setServiceSearch}
              draft={serviceDraft}
              onDraft={setServiceDraft}
              advanced={advanced}
              onAdvanced={setAdvanced}
              preview={preview}
              onPreview={setPreview}
              suggestion={dialog.suggestion}
              vault={vault}
              t={t}
              busy={busy}
              onSave={async (s) => commit(saveService(vault, s))}
            />
          )}
          {dialog.type === "card-detail" && (
            <>
              <div className={`payment-card ${dialog.card.color}`}>
                <strong>{dialog.card.nickname}</strong>
                <span className="card-digits">•••• {dialog.card.last4}</span>
                <span>{dialog.card.network.toUpperCase()}</span>
              </div>
              <div className="button-row">
                <button
                  className="secondary"
                  onClick={() => setDialog({ type: "card", card: dialog.card })}
                >
                  {t("Sửa")}
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void attempt(() =>
                      commit(
                        saveCard(
                          vault,
                          cardSchema.parse({
                            ...dialog.card,
                            status:
                              dialog.card.status === "active"
                                ? "archived"
                                : "active",
                            updatedAt: new Date().toISOString(),
                          }),
                        ),
                      ),
                    )
                  }
                >
                  {t(
                    dialog.card.status === "active"
                      ? "Lưu trữ"
                      : "Đang hoạt động",
                  )}
                </button>
                <button
                  className="danger"
                  onClick={() =>
                    setDialog({
                      type: "delete",
                      kind: "card",
                      id: dialog.card.id,
                    })
                  }
                >
                  {t("Xóa")}
                </button>
              </div>
              <h3>{t("Dịch vụ")}</h3>
              {vault.subscriptions
                .filter((s) => s.cardId === dialog.card.id)
                .map((s) => (
                  <ServiceRow
                    key={s.id}
                    service={s}
                    vault={vault}
                    t={t}
                    onClick={() =>
                      setDialog({ type: "service-detail", service: s })
                    }
                  />
                ))}
              {!vault.subscriptions.some(
                (s) => s.cardId === dialog.card.id,
              ) && <p className="muted">{t("Chưa có dịch vụ")}</p>}
            </>
          )}
          {dialog.type === "service-detail" && (
            <>
              <div className="detail-header">
                <ServiceLogo
                  domain={dialog.service.domain}
                  name={dialog.service.name}
                />
                <div>
                  <h2>{dialog.service.name}</h2>
                  <p className="muted">{dialog.service.domain}</p>
                </div>
              </div>
              <span className={`badge ${effectiveStatus(dialog.service)}`}>
                {t(statuses[effectiveStatus(dialog.service)])}
              </span>
              <dl>
                <dt>{t("Thẻ liên kết")}</dt>
                <dd>
                  {vault.cards.find((c) => c.id === dialog.service.cardId)
                    ?.nickname ?? "—"}
                </dd>
                <dt>{t("Ngày kết thúc dùng thử")}</dt>
                <dd>{dialog.service.trialEnd ?? "—"}</dd>
                <dt>{t("Ngày gia hạn")}</dt>
                <dd>
                  {targetDate(dialog.service) ??
                    dialog.service.renewalDate ??
                    "—"}
                </dd>
                <dt>{t("Chi phí dự kiến")}</dt>
                <dd>
                  {dialog.service.amount || "—"} {dialog.service.currency}
                </dd>
                <dt>{t("Đã gỡ phương thức thanh toán")}</dt>
                <dd>{dialog.service.cardRemoved ? "✓" : "—"}</dd>
              </dl>
              {dialog.service.notes && (
                <p className="notes">{dialog.service.notes}</p>
              )}
              <div className="button-row">
                <button
                  className="secondary"
                  onClick={() =>
                    setDialog({ type: "service", service: dialog.service })
                  }
                >
                  {t("Sửa")}
                </button>
                <button
                  className="danger"
                  onClick={() =>
                    setDialog({
                      type: "delete",
                      kind: "service",
                      id: dialog.service.id,
                    })
                  }
                >
                  {t("Xóa")}
                </button>
                {dialog.service.billingUrl && (
                  <button
                    className="secondary"
                    onClick={() =>
                      void attempt(async () => {
                        const url = httpsUrl.parse(dialog.service.billingUrl);
                        if (url) await chrome.tabs.create({ url });
                      })
                    }
                  >
                    {t("Mở trang billing")}
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
              <div className="service-actions">
                <button
                  className="secondary"
                  disabled={busy || dialog.service.status === "cancelled"}
                  onClick={() =>
                    void attempt(() =>
                      commit(
                        updateService(vault, dialog.service.id, {
                          status: "cancellation_pending",
                        }),
                      ),
                    )
                  }
                >
                  {t("Đã yêu cầu hủy")}
                </button>
                <button
                  className="secondary"
                  disabled={busy || dialog.service.status === "cancelled"}
                  onClick={() =>
                    void attempt(() =>
                      commit(
                        updateService(vault, dialog.service.id, {
                          status: "cancelled",
                        }),
                      ),
                    )
                  }
                >
                  <Check size={14} />
                  {t("Xác nhận đã hủy")}
                </button>
                <button
                  className="secondary"
                  disabled={busy || dialog.service.cardRemoved}
                  onClick={() =>
                    void attempt(() =>
                      commit(
                        updateService(vault, dialog.service.id, {
                          cardRemoved: true,
                        }),
                      ),
                    )
                  }
                >
                  {t("Đánh dấu đã gỡ thẻ")}
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void attempt(() =>
                      commit(
                        updateService(vault, dialog.service.id, {
                          status: "archived",
                        }),
                      ),
                    )
                  }
                >
                  {t("Lưu trữ")}
                </button>
              </div>
              <p className="muted small">
                {t(
                  "Gỡ thẻ không đồng nghĩa đã hủy subscription. CardGuard không thực hiện hủy gói thay bạn.",
                )}
              </p>
            </>
          )}
          {dialog.type === "delete" && (
            <>
              <p>{t("Thao tác này không thể hoàn tác.")}</p>
              <div className="form-actions">
                <button className="secondary" onClick={() => setDialog(null)}>
                  {t("Hủy")}
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() =>
                    void attempt(() =>
                      commit(
                        dialog.kind === "card"
                          ? deleteCard(vault, dialog.id)
                          : deleteService(vault, dialog.id),
                      ),
                    )
                  }
                >
                  {t("Xóa")}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
function ServiceRow({
  service: s,
  vault,
  t,
  onClick,
}: {
  service: Subscription;
  vault: Vault;
  t: (s: string) => string;
  onClick: () => void;
}) {
  const date = targetDate(s),
    days = date ? daysBetween(localDate(), date) : null;
  return (
    <button className="service-row" onClick={onClick}>
      <ServiceLogo domain={s.domain} name={s.name} />
      <span className="service-info">
        <strong>{s.name}</strong>
        <small>
          {vault.cards.find((c) => c.id === s.cardId)?.nickname ?? s.domain}
          {s.cardRemoved ? t(" · Đã gỡ thẻ") : ""}
        </small>
      </span>
      <span className="service-meta">
        <span className={`badge ${effectiveStatus(s)}`}>
          {t(statuses[effectiveStatus(s)])}
        </span>
        <small>
          {date ?? "—"}
          {days !== null && days >= 0 ? ` · ${days}d` : ""}
        </small>
      </span>
      <ChevronRight size={14} />
    </button>
  );
}
