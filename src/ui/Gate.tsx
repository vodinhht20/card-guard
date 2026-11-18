import { PrivacyLink } from "./PrivacyLink";
import { useLocale } from "./Locale";
import { useEffect, useRef, useState } from "react";
import {
  PASSWORD_CODE_LENGTH,
  passwordEntryState,
} from "../core/passwordEntry";
import { Checkbox } from "react-aria-components";
import { Check, Eye, EyeOff } from "lucide-react";
import { Field } from "./components";
function PasswordCode({
  value,
  onChange,
  label,
  disabled,
  autoFocus,
  autoComplete,
  id,
  ...aria
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  disabled: boolean;
  autoFocus?: boolean;
  autoComplete: string;
  id?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false),
    [focused, setFocused] = useState(false);
  return (
    <div className="password-code-row">
      <div className={`password-code ${focused ? "focused" : ""}`}>
        <div className="code-cells" aria-hidden="true">
          {Array.from({ length: PASSWORD_CODE_LENGTH }, (_, i) => (
            <span
              key={i}
              className={
                focused &&
                i === Math.min(value.length, PASSWORD_CODE_LENGTH - 1)
                  ? "current"
                  : ""
              }
            >
              {value[i] ? (visible ? value[i] : "•") : ""}
            </span>
          ))}
        </div>
        <input
          {...aria}
          id={id}
          aria-label={label}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={PASSWORD_CODE_LENGTH}
          maxLength={PASSWORD_CODE_LENGTH}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          disabled={disabled}
          data-confirm={autoFocus ? undefined : "true"}
          className="code-input"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
      <button
        type="button"
        className="password-eye"
        aria-label={visible ? t("Ẩn mật khẩu") : t("Hiện mật khẩu")}
        onClick={() => setVisible(!visible)}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
export function Gate({
  exists,
  busy,
  error,
  unlock,
}: {
  exists: boolean | null;
  busy: boolean;
  error: string;
  unlock: (p: string, c: boolean, remember: boolean) => Promise<void>;
}) {
  const { t } = useLocale();
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [remember, setRemember] = useState(false),
    [localError, setError] = useState("");
  const form = useRef<HTMLFormElement>(null),
    submitting = useRef(false);
  useEffect(() => {
    if (!busy)
      form.current
        ?.querySelector<HTMLInputElement>(
          'input[autocomplete="current-password"], input[autocomplete="new-password"]',
        )
        ?.focus();
  }, [busy, exists]);
  const submit = async (code: string, confirmation: string) => {
    if (busy || submitting.current || exists === null) return;
    const state = passwordEntryState(code, confirmation, !exists);
    if (state === "incomplete") return;
    if (state === "mismatch") {
      setError("Mật khẩu chưa khớp.");
      setConfirm("");
      return;
    }
    submitting.current = true;
    setError("");
    setPassword("");
    setConfirm("");
    try {
      await unlock(code, !exists, remember);
    } finally {
      submitting.current = false;
    }
  };
  const enterPassword = (code: string) => {
    setPassword(code);
    setError("");
    if (exists) void submit(code, "");
    else if (code.length === PASSWORD_CODE_LENGTH) {
      form.current
        ?.querySelector<HTMLInputElement>('input[data-confirm="true"]')
        ?.focus();
    }
  };
  return (
    <main className="auth-page">
      <header className="auth-brand">
        <span>CardGuard</span>
        <small>v{chrome.runtime.getManifest().version}</small>
      </header>
      <img
        className="auth-art"
        src="/welcome.svg"
        alt=""
        width="352"
        height="140"
      />
      <p className="auth-tagline">
        {t("Thẻ gọn một nơi. Không quên lịch gia hạn.")}
      </p>
      <div className="auth-heading">
        <h1>{exists ? t("Mở khóa") : t("Tạo mật khẩu")}</h1>
        <p>
          {exists
            ? t("Nhập mật khẩu 6 ký tự")
            : t("Dùng 6 ký tự, gồm chữ hoặc số")}
        </p>
      </div>
      {exists === null ? (
        <div className="skeleton" role="status">
          {t("Đang mở…")}
        </div>
      ) : (
        <form
          ref={form}
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(password, confirm);
          }}
        >
          <Checkbox
            className="remember-checkbox"
            isSelected={remember}
            onChange={setRemember}
            isDisabled={busy}
          >
            <span className="checkbox-mark">
              <Check size={13} />
            </span>
            <strong>{t("Ghi nhớ tôi")}</strong>
          </Checkbox>
          <Field label={t("Mật khẩu")}>
            <PasswordCode
              value={password}
              onChange={enterPassword}
              label={t("Mật khẩu")}
              disabled={busy}
              autoFocus
              autoComplete={exists ? "current-password" : "new-password"}
            />
          </Field>
          {!exists && (
            <Field label={t("Xác nhận mật khẩu")}>
              <PasswordCode
                value={confirm}
                onChange={(code) => {
                  setConfirm(code);
                  void submit(password, code);
                }}
                label={t("Xác nhận mật khẩu")}
                disabled={busy}
                autoComplete="new-password"
              />
            </Field>
          )}
          {(error || localError) && (
            <p className="notice error" role="alert">
              {t(localError || error)}
            </p>
          )}
          <p className="auth-status" role="status" aria-live="polite">
            {busy ? t("Đang mở…") : ""}
          </p>
        </form>
      )}
      <footer className="auth-policy">
        <PrivacyLink />
      </footer>
    </main>
  );
}
