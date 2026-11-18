import { ServiceLogo } from "./ServiceLogo";
import { useLocale } from "./Locale";
import { Select, DatePicker } from "./controls";
import {
  applyServicePreset,
  findServicePreset,
  useCustomService,
} from "../core/serviceCatalog";
import { ServicePresetPicker } from "./ServicePresetPicker";
import { useState, type FormEvent } from "react";
import {
  type PaymentCard,
  type Subscription,
  type Vault,
} from "../core/schema";
import {
  newCardDraft,
  newServiceDraft,
  prepareQuickCard,
  prepareQuickService,
} from "../core/workspace";
import { addDays, localDate } from "../core/dates";
import type { DetectionSignal } from "../core/detection";
import { Field } from "./components";
import { statuses } from "./i18n";
type T = (s: string) => string;
type AdvancedProps = { advanced: boolean; onAdvanced: (open: boolean) => void };
function OptionalFields({
  advanced,
  onAdvanced,
  children,
}: { children: React.ReactNode } & AdvancedProps) {
  const { t } = useLocale();
  return (
    <>
      <button
        type="button"
        className="optional-toggle"
        aria-expanded={advanced}
        onClick={() => onAdvanced(!advanced)}
      >
        {advanced ? t("− Thu gọn") : t("＋ Tùy chọn thêm")}
      </button>
      {advanced && <div className="optional-fields">{children}</div>}
    </>
  );
}
export function CardForm({
  card,
  draft,
  onDraft,
  onSave,
  t,
  busy,
  advanced,
  onAdvanced,
}: {
  card?: PaymentCard;
  draft: PaymentCard | null;
  onDraft: (v: PaymentCard) => void;
  onSave: (v: PaymentCard) => Promise<void>;
  t: T;
  busy: boolean;
} & AdvancedProps) {
  const [data, setData] = useState<PaymentCard>(
    () => draft ?? card ?? newCardDraft(),
  );
  const [error, setError] = useState("");
  const change = (key: keyof PaymentCard, value: string) => {
    const next = { ...data, [key]: value };
    setData(next);
    onDraft(next);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await onSave(prepareQuickCard(data));
    } catch {
      setError("Kiểm tra 4 số cuối và thử lại. Không nhập số thẻ đầy đủ.");
    }
  };
  return (
    <form onSubmit={(e) => void submit(e)}>
      <Field label={t("Loại thẻ")}>
        <Select
          value={data.network}
          onChange={(e) => change("network", e.target.value)}
          autoFocus
        >
          {["visa", "mastercard", "jcb", "other"].map((n) => (
            <option key={n} value={n}>
              {n.toUpperCase()}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("4 số cuối")}>
        <input
          required
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]{4}"
          maxLength={4}
          value={data.last4}
          onChange={(e) => change("last4", e.target.value)}
          placeholder="••••"
          className="last-four-input"
        />
      </Field>
      <OptionalFields advanced={advanced} onAdvanced={onAdvanced}>
        <Field label={t("Biệt danh thẻ")}>
          <input
            maxLength={60}
            value={data.nickname}
            onChange={(e) => change("nickname", e.target.value)}
            placeholder={`${data.network.toUpperCase()} • ${data.last4 || "••••"}`}
          />
        </Field>
        <div className="form-row">
          <Field label={t("Màu thẻ")}>
            <Select
              value={data.color}
              onChange={(e) => change("color", e.target.value)}
            >
              <option value="blue">{t("Xanh dương")}</option>
              <option value="mint">{t("Xanh ngọc")}</option>
              <option value="violet">{t("Tím")}</option>
            </Select>
          </Field>
          <Field label={t("Trạng thái")}>
            <Select
              value={data.status}
              onChange={(e) => change("status", e.target.value)}
            >
              <option value="active">{t("Đang hoạt động")}</option>
              <option value="archived">{t("Đã lưu trữ")}</option>
            </Select>
          </Field>
        </div>
      </OptionalFields>
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      <button className="primary full" disabled={busy}>
        {t(busy ? "Đang xử lý…" : "Lưu")}
      </button>
    </form>
  );
}
export function ServiceForm({
  entryMode,
  onEntryMode,
  search,
  onSearch,
  service,
  draft,
  onDraft,
  suggestion,
  vault,
  onSave,
  t,
  busy,
  advanced,
  onAdvanced,
  preview,
  onPreview,
}: {
  service?: Subscription;
  entryMode: "choose" | "preset" | "manual";
  onEntryMode: (mode: "choose" | "preset" | "manual") => void;
  search: string;
  onSearch: (value: string) => void;
  draft: Subscription | null;
  onDraft: (v: Subscription) => void;
  suggestion?: DetectionSignal;
  vault: Vault;
  onSave: (s: Subscription) => Promise<void>;
  t: T;
  busy: boolean;
  preview: boolean;
  onPreview: (v: boolean) => void;
} & AdvancedProps) {
  const [data, setData] = useState<Subscription>(
    () => draft ?? service ?? newServiceDraft(vault, suggestion),
  );
  const [error, setError] = useState("");
  const change = (key: keyof Subscription, value: unknown) => {
    const next = { ...data, [key]: value };
    setData(next);
    onDraft(next);
  };
  const canChoose = !service && !suggestion;
  const choosing = canChoose && entryMode === "choose";
  const selectedPreset =
    canChoose && entryMode === "preset"
      ? findServicePreset(data.domain)
      : undefined;
  const selectPreset = (id: string) => {
    const next = applyServicePreset(data, id);
    setData(next);
    onDraft(next);
    onEntryMode("preset");
    setError("");
  };
  const selectCustom = () => {
    const next = useCustomService(data);
    setData(next);
    onDraft(next);
    onEntryMode("manual");
    setError("");
  };
  const trial = data.status === "trial";
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (choosing) return;
    try {
      const value = prepareQuickService(data);
      if (suggestion && !preview) {
        onPreview(true);
        return;
      }
      await onSave(value);
    } catch {
      setError(
        "Kiểm tra website, ngày dùng thử/gia hạn và các thông tin tùy chọn.",
      );
    }
  };
  const cards = vault.cards.filter(
    (c) => c.status === "active" || c.id === data.cardId,
  );
  return (
    <form onSubmit={(e) => void submit(e)}>
      {suggestion && (
        <div className="privacy-note">
          {t("Nguồn: tín hiệu website")} · {suggestion.confidence}{" "}
          {t(". Gợi ý chưa xác nhận đăng ký.")}{" "}
          {suggestion.trialDays
            ? t(
                `Gợi ý ${suggestion.trialDays} ngày, hãy kiểm tra trước khi lưu.`,
              )
            : ""}
        </div>
      )}
      {choosing ? (
        <ServicePresetPicker
          query={search}
          onQuery={onSearch}
          onSelect={selectPreset}
          onCustom={selectCustom}
          t={t}
        />
      ) : preview ? (
        <div className="preview">
          <span className="eyebrow">{t("Xem trước")}</span>
          <h3>{data.name || data.domain}</h3>
          <p>{data.domain}</p>
          <dl>
            <dt>{t("Thẻ liên kết")}</dt>
            <dd>
              {cards.find((c) => c.id === data.cardId)?.nickname ??
                t("Chưa chọn thẻ")}
            </dd>
            <dt>{t("Trạng thái")}</dt>
            <dd>{t(statuses[data.status])}</dd>
            <dt>{t("Ngày kết thúc dùng thử")}</dt>
            <dd>{data.trialEnd ?? "—"}</dd>
            <dt>{t("Ngày gia hạn")}</dt>
            <dd>{data.renewalDate ?? "—"}</dd>
            <dt>{t("Billing URL")}</dt>
            <dd>{data.billingUrl || "—"}</dd>
          </dl>
        </div>
      ) : (
        <>
          {selectedPreset ? (
            <div className="selected-preset">
              <ServiceLogo domain={data.domain} name={data.name} />
              <div>
                <strong>{data.name || selectedPreset.name}</strong>
                <small>{data.domain}</small>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => onEntryMode("choose")}
              >
                {t("Đổi dịch vụ")}
              </button>
            </div>
          ) : (
            <>
              {canChoose && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onEntryMode("choose")}
                >
                  ← {t("Chọn từ danh sách")}
                </button>
              )}
              <Field
                label={t("Website")}
                hint={t(
                  "Nhập domain hoặc dán URL HTTPS. Tên dịch vụ được điền từ domain.",
                )}
              >
                <input
                  required
                  maxLength={2048}
                  value={data.domain}
                  onChange={(e) => change("domain", e.target.value)}
                  placeholder={t("example.com")}
                  autoFocus
                />
              </Field>
            </>
          )}
          <div className="form-row">
            <Field label={t("Thẻ liên kết")}>
              <Select
                value={data.cardId ?? ""}
                onChange={(e) => change("cardId", e.target.value || null)}
              >
                <option value="">{t("Chưa chọn thẻ")}</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nickname} · •••• {c.last4}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("Trạng thái")}>
              <Select
                value={data.status}
                onChange={(e) => change("status", e.target.value)}
              >
                {Object.entries(statuses)
                  .filter(
                    ([k]) =>
                      k !== "overdue" &&
                      (["trial", "active"].includes(k) || k === data.status),
                  )
                  .map(([k, label]) => (
                    <option key={k} value={k}>
                      {t(label)}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
          <Field label={t(trial ? "Ngày kết thúc dùng thử" : "Ngày gia hạn")}>
            <DatePicker
              required={trial}
              value={trial ? data.trialEnd : data.renewalDate}
              onChange={(value) =>
                change(trial ? "trialEnd" : "renewalDate", value)
              }
            />
          </Field>
          {trial && (
            <div className="presets">
              {[3, 7, 14, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  className="chip"
                  onClick={() => change("trialEnd", addDays(localDate(), d))}
                >
                  +{d} {vault.settings.language === "en" ? "days" : t("ngày")}
                </button>
              ))}
            </div>
          )}
          <OptionalFields advanced={advanced} onAdvanced={onAdvanced}>
            <Field
              label={t("Tên dịch vụ")}
              hint={t("Không bắt buộc; để trống để dùng domain.")}
            >
              <input
                maxLength={100}
                value={data.name}
                onChange={(e) => change("name", e.target.value)}
              />
            </Field>
            {trial && (
              <Field label={t("Ngày gia hạn")}>
                <DatePicker
                  value={data.renewalDate}
                  onChange={(value) => change("renewalDate", value)}
                />
              </Field>
            )}
            {!trial && (
              <Field label={t("Ngày kết thúc dùng thử")}>
                <DatePicker
                  value={data.trialEnd}
                  onChange={(value) => change("trialEnd", value)}
                />
              </Field>
            )}
            <Field label={t("Chu kỳ")}>
              <Select
                value={data.recurrence}
                onChange={(e) => change("recurrence", e.target.value)}
              >
                <option value="none">{t("Không lặp")}</option>
                <option value="monthly">{t("Hàng tháng")}</option>
                <option value="yearly">{t("Hàng năm")}</option>
              </Select>
            </Field>
            <div className="form-row">
              <Field label={t("Chi phí dự kiến")}>
                <input
                  inputMode="decimal"
                  maxLength={12}
                  value={data.amount}
                  onChange={(e) => change("amount", e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label={t("Currency")}>
                <Select
                  value={data.currency}
                  onChange={(e) => change("currency", e.target.value)}
                >
                  {["VND", "USD", "EUR"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={t("Billing URL (HTTPS)")}>
              <input
                type="url"
                maxLength={2048}
                value={data.billingUrl}
                onChange={(e) => change("billingUrl", e.target.value)}
                placeholder={t("https://example.com/billing")}
              />
            </Field>
            <Field
              label={t("Ghi chú")}
              hint={t("Không nhập dữ liệu thanh toán hoặc thông tin bí mật.")}
            >
              <textarea
                maxLength={1000}
                value={data.notes}
                onChange={(e) => change("notes", e.target.value)}
              />
            </Field>
            <label className="check">
              <input
                type="checkbox"
                checked={data.cardRemoved}
                onChange={(e) => change("cardRemoved", e.target.checked)}
              />
              {t("Đã gỡ phương thức thanh toán")}
            </label>
          </OptionalFields>
          <p className="inline-review">
            {data.name || data.domain || t("Dịch vụ mới")} ·{" "}
            {cards.find((c) => c.id === data.cardId)?.nickname ??
              t("Chưa chọn thẻ")}{" "}
            ·{" "}
            {(trial ? data.trialEnd : data.renewalDate) ??
              t("Chưa đặt ngày nhắc")}
          </p>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      {!choosing && (
        <div className="form-actions">
          {preview && (
            <button
              type="button"
              className="secondary"
              onClick={() => onPreview(false)}
            >
              {t("Quay lại")}
            </button>
          )}
          <button className="primary full" disabled={busy}>
            {t(
              busy
                ? "Đang xử lý…"
                : suggestion
                  ? preview
                    ? "Xác nhận lưu"
                    : "Xem trước"
                  : "Lưu",
            )}
          </button>
        </div>
      )}
    </form>
  );
}
