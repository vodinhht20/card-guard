import { PrivacyLink } from "./PrivacyLink";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Tabs, TabList, Tab, TabPanel, Checkbox } from "react-aria-components";
import {
  Download,
  Upload,
  ShieldCheck,
  Check,
  Palette,
  Bell,
  Globe,
  Database,
  LockKeyhole,
  PanelRightOpen,
} from "lucide-react";
import { MAX_BACKUP_BYTES, MIN_PASSWORD_LENGTH, seal } from "../core/crypto";
import { mergeBackup, readBackup } from "../core/backup";
import {
  grantAllSites,
  ALL_HTTPS_SITES,
  grantDetection,
  originPattern,
} from "../core/detection";
import {
  recordHistory,
  settingsSchema,
  type Settings,
  type Vault,
} from "../core/schema";
import {
  reminderChoices,
  toggleReminderDay,
} from "../core/reminderPreferences";
import { Field, Modal } from "./components";
import { Select } from "./controls";
type T = (v: string) => string;
export function SettingsView({
  vault,
  save,
  t,
  busy,
  report,
  sessionExpiresAt,
  forgetSession,
  lock,
  openPanel,
}: {
  vault: Vault;
  save: (v: Vault) => Promise<void>;
  t: T;
  busy: boolean;
  report: (m: string) => void;
  sessionExpiresAt: number | null;
  forgetSession: () => Promise<void>;
  lock: () => void;
  openPanel?: () => void;
}) {
  const [settings, setSettings] = useState<Settings>(vault.settings);
  const [password, setPassword] = useState(""),
    [imported, setImported] = useState<Vault | null>(null),
    [mode, setMode] = useState<"merge" | "replace">("merge"),
    [origin, setOrigin] = useState(""),
    [origins, setOrigins] = useState<string[]>([]),
    [working, setWorking] = useState(false),
    [permission, setPermission] = useState<string>("");
  const reload = () =>
    void chrome.permissions.getAll().then((p) => setOrigins(p.origins ?? []));
  useEffect(() => {
    reload();
    chrome.notifications.getPermissionLevel(setPermission);
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, []);
  const attempt = async (fn: () => Promise<void>) => {
    setWorking(true);
    try {
      await fn();
    } catch {
      report(
        "Thao tác không thành công. Kiểm tra dữ liệu, mật khẩu hoặc quyền và thử lại.",
      );
    } finally {
      setWorking(false);
    }
  };
  const saveSettings = (e: FormEvent) => {
    e.preventDefault();
    void attempt(async () => {
      const next = structuredClone(vault);
      next.settings = settingsSchema.parse(settings);
      recordHistory(next, "settings_saved");
      await save(next);
      report("Đã lưu an toàn.");
    });
  };
  const exportBackup = () =>
    attempt(async () => {
      const envelope = await seal(vault, password);
      setPassword("");
      const url = URL.createObjectURL(
          new Blob([JSON.stringify(envelope)], { type: "application/json" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = `cardguard-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  const importFile = async (file: File) => {
    if (file.size > MAX_BACKUP_BYTES) throw new Error("File quá lớn.");
    setImported(await readBackup(await file.text(), password));
    setPassword("");
  };
  const selectedDays = settings.reminderDays;
  const toggleDay = (day: number) => {
    setSettings((current) => ({
      ...current,
      reminderDays: toggleReminderDay(current.reminderDays, day),
    }));
  };
  const settingForm = (children: ReactNode) => (
    <form className="settings-form" onSubmit={saveSettings}>
      {children}
      <button className="primary full" disabled={busy || working}>
        {t("Lưu cài đặt")}
      </button>
    </form>
  );
  const tabItems = [
    {
      id: "appearance",
      label: "Giao diện",
      shortLabel: "Hiển thị",
      icon: Palette,
    },
    {
      id: "security",
      label: "Bảo mật",
      shortLabel: "Bảo mật",
      icon: ShieldCheck,
    },
    { id: "reminders", label: "Nhắc lịch", shortLabel: "Nhắc", icon: Bell },
    { id: "data", label: "Dữ liệu", shortLabel: "Dữ liệu", icon: Database },
    { id: "sites", label: "Website", shortLabel: "Website", icon: Globe },
  ];
  return (
    <div className="settings-upgraded">
      <div className="page-title">
        <div>
          <h1>{t("Cài đặt")}</h1>
          <small className="muted">
            CardGuard · v{chrome.runtime.getManifest().version}
          </small>
        </div>
        <div className="settings-actions">
          {openPanel && (
            <button
              className="icon-button"
              onClick={openPanel}
              aria-label={t("Mở Side Panel")}
              title={t("Mở Side Panel")}
            >
              <PanelRightOpen size={20} />
            </button>
          )}
          <button
            className="icon-button"
            onClick={lock}
            aria-label={t("Khóa ngay")}
            title={t("Khóa ngay")}
          >
            <LockKeyhole size={20} />
          </button>
        </div>
      </div>
      <Tabs className="settings-tabs" defaultSelectedKey="appearance">
        <TabList aria-label={t("Nhóm cài đặt")} className="settings-tab-list">
          {tabItems.map(({ id, label, shortLabel, icon: Icon }) => (
            <Tab
              id={id}
              key={id}
              className="settings-tab"
              aria-label={t(label)}
            >
              <Icon size={17} />
              <span>{t(shortLabel)}</span>
            </Tab>
          ))}
        </TabList>
        <TabPanel id="appearance" className="settings-tab-panel">
          <section className="surface">
            <h2>{t("Hiển thị")}</h2>
            {settingForm(
              <>
                <Field label={t("Giao diện")}>
                  <Select
                    value={settings.theme}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        theme: e.target.value as Settings["theme"],
                      })
                    }
                  >
                    <option value="system">{t("Theo hệ thống")}</option>
                    <option value="light">{t("Sáng")}</option>
                    <option value="dark">{t("Tối")}</option>
                  </Select>
                </Field>
                <Field label={t("Cỡ chữ")}>
                  <Select
                    value={settings.textSize}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        textSize: e.target.value as Settings["textSize"],
                      })
                    }
                  >
                    <option value="comfortable">{t("Dễ đọc")}</option>
                    <option value="large">{t("Lớn hơn")}</option>
                  </Select>
                </Field>
                <Field label={t("Ngôn ngữ")}>
                  <Select
                    value={settings.language}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        language: e.target.value as Settings["language"],
                      })
                    }
                  >
                    <option value="vi">{t("Tiếng Việt")}</option>
                    <option value="en">{t("English")}</option>
                  </Select>
                </Field>
                <Checkbox
                  className="setting-checkbox"
                  isSelected={settings.dashboardChart}
                  onChange={(value) =>
                    setSettings({ ...settings, dashboardChart: value })
                  }
                >
                  <span className="checkbox-mark">
                    <Check size={13} />
                  </span>
                  <span>
                    <strong>{t("Biểu đồ tổng quan")}</strong>
                  </span>
                </Checkbox>
              </>,
            )}
          </section>
        </TabPanel>
        <TabPanel id="security" className="settings-tab-panel">
          <section className="surface">
            <h2>
              <LockKeyhole size={20} />
              {t("Phiên mở khóa")}
            </h2>
            <div
              className={`session-status ${sessionExpiresAt ? "enabled" : ""}`}
            >
              <strong>
                {sessionExpiresAt ? t("Đã ghi nhớ") : t("Chưa bật ghi nhớ")}
              </strong>
              <p>
                {sessionExpiresAt
                  ? t(
                      `Hết hạn ${new Date(sessionExpiresAt).toLocaleString(vault.settings.language)}`,
                    )
                  : t("Chọn Ghi nhớ tôi khi mở khóa.")}
              </p>
              {sessionExpiresAt && (
                <button
                  type="button"
                  className="secondary"
                  disabled={working}
                  onClick={() =>
                    void attempt(async () => {
                      await forgetSession();
                      report(t("Đã tắt ghi nhớ trên hồ sơ Chrome này."));
                    })
                  }
                >
                  {t("Hủy phiên ghi nhớ")}
                </button>
              )}
            </div>
            {settingForm(
              <>
                <Field label={t("Thời hạn ghi nhớ")}>
                  <Select
                    value={String(settings.rememberDays)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        rememberDays: Number(e.target.value),
                      })
                    }
                  >
                    {Array.from({ length: 14 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>
                        {t(`${i + 1} ngày`)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("Tự khóa")}>
                  <Select
                    value={String(settings.autoLockMinutes)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        autoLockMinutes: Number(e.target.value),
                      })
                    }
                  >
                    {[
                      ...new Set([
                        0,
                        1,
                        5,
                        15,
                        30,
                        60,
                        settings.autoLockMinutes,
                      ]),
                    ]
                      .sort((a, b) => a - b)
                      .map((m) => (
                        <option key={m} value={String(m)}>
                          {m === 0 ? t("Không tự khóa") : t(`${m} phút`)}
                        </option>
                      ))}
                  </Select>
                </Field>
                <p className="settings-help">
                  {t(
                    "Tự khóa khi giao diện mở. Hạn ghi nhớ tính từ lần đăng nhập.",
                  )}
                </p>
              </>,
            )}
            <details className="settings-details">
              <summary>{t("Về ghi nhớ")}</summary>
              <p>
                {t(
                  "Ghi nhớ cho phép mở vault không cần mật khẩu trên hồ sơ Chrome này, kể cả sau khi khởi động lại. Người sử dụng chung hồ sơ cũng có thể mở vault trong thời hạn. Mật khẩu không được lưu; khóa mở phiên được bảo vệ bằng khóa thiết bị local. Có thể hủy phiên bất cứ lúc nào.",
                )}
              </p>
            </details>
          </section>
        </TabPanel>
        <TabPanel id="reminders" className="settings-tab-panel">
          <section className="surface">
            <h2>{t("Nhắc lịch")}</h2>
            <p className="settings-help">
              {t("Chọn các mốc theo số ngày trước hạn.")}
            </p>
            {settingForm(
              <>
                <div className="reminder-presets">
                  {reminderChoices(vault.settings.reminderDays).map((d) => (
                    <button
                      type="button"
                      key={d}
                      aria-pressed={selectedDays.includes(d)}
                      disabled={
                        selectedDays.includes(d)
                          ? selectedDays.length === 1
                          : selectedDays.length >= 10
                      }
                      className={selectedDays.includes(d) ? "selected" : ""}
                      onClick={() => toggleDay(d)}
                    >
                      {d === 0 ? t("Đúng ngày") : t(`${d} ngày`)}
                    </button>
                  ))}
                </div>
                <div className="permission-summary">
                  <Bell size={18} />
                  <span>
                    {t("Quyền thông báo:")}{" "}
                    <strong>
                      {permission === "granted"
                        ? t("Đã cho phép")
                        : permission === "denied"
                          ? t("Đang bị chặn")
                          : t("Chưa xác định")}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="secondary full"
                  onClick={() =>
                    void attempt(async () => {
                      await chrome.notifications.create("cardguard-test", {
                        type: "basic",
                        iconUrl: "icon128.png",
                        title: "CardGuard",
                        message: t("Thông báo thử: nhắc lịch đã sẵn sàng."),
                      });
                      report(t("Đã gửi thông báo thử tới Chrome."));
                    })
                  }
                >
                  {t("Gửi thông báo thử")}
                </button>
                <p className="settings-help">
                  {t(
                    "Nhắc lúc 09:00 theo múi giờ thiết bị. Chrome cần chạy và được hệ điều hành cho phép thông báo. Lịch gia hạn tính sẵn 730 ngày; mở vault để làm mới.",
                  )}
                </p>
              </>,
            )}
          </section>
        </TabPanel>
        <TabPanel id="data" className="settings-tab-panel">
          <section className="surface">
            <h2>{t("Sao lưu mã hóa")}</h2>
            <p className="settings-help">
              {t("File JSON được bảo vệ bằng mật khẩu riêng, tối đa 5 MB.")}
            </p>
            <Field label={t("Mật khẩu file sao lưu")}>
              <input
                type="password"
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={256}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <div className="backup-actions">
              <button
                className="secondary"
                disabled={
                  working || busy || password.length < MIN_PASSWORD_LENGTH
                }
                onClick={() => void exportBackup()}
              >
                <Download size={17} />
                {t("Xuất bản sao lưu")}
              </button>
              <label
                className={`secondary file-button ${working || busy || !password ? "disabled" : ""}`}
              >
                <Upload size={17} />
                {t("Nhập bản sao lưu")}
                <input
                  type="file"
                  accept=".json,application/json"
                  disabled={working || busy || !password}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void attempt(() => importFile(file));
                  }}
                />
              </label>
            </div>
            <div className="storage-summary">
              <span>
                <strong>{vault.cards.length}</strong>
                <small>{t("thẻ")}</small>
              </span>
              <span>
                <strong>{vault.subscriptions.length}</strong>
                <small>{t("dịch vụ")}</small>
              </span>
              <span>
                <strong>{vault.history.length}</strong>
                <small>{t("hoạt động")}</small>
              </span>
            </div>
            <details className="settings-details">
              <summary>{t("Lịch sử gần đây")}</summary>
              <ul className="history">
                {vault.history
                  .slice(-10)
                  .reverse()
                  .map((h) => (
                    <li key={h.id}>
                      <span>
                        {
                          {
                            card_saved: t("Lưu thẻ"),
                            card_deleted: t("Xóa thẻ"),
                            service_saved: t("Lưu dịch vụ"),
                            service_deleted: t("Xóa dịch vụ"),
                            imported: t("Nhập bản sao lưu"),
                            settings_saved: t("Đổi cài đặt"),
                          }[h.action]
                        }
                      </span>
                      <time>
                        {new Date(h.at).toLocaleString(vault.settings.language)}
                      </time>
                    </li>
                  ))}
              </ul>
            </details>
          </section>
        </TabPanel>
        <TabPanel id="sites" className="settings-tab-panel">
          <section className="surface">
            <h2>{t("Gợi ý trên website")}</h2>
            <p className="settings-help">
              {t(
                "Chỉ hoạt động trên website Anh cấp quyền. Nhận diện ô thẻ qua thuộc tính, không đọc dữ liệu Anh nhập.",
              )}
            </p>
            <button
              type="button"
              className="secondary full"
              disabled={working || origins.includes(ALL_HTTPS_SITES)}
              onClick={() => {
                const request = grantAllSites(chrome.permissions);
                void attempt(async () => {
                  if (!(await request))
                    report(t("Chưa được cấp quyền website."));
                  reload();
                });
              }}
            >
              {t(
                origins.includes(ALL_HTTPS_SITES)
                  ? "Đã cho phép tất cả website HTTPS"
                  : "Cho phép tất cả website HTTPS",
              )}
            </button>
            <p className="settings-help">
              {t(
                "Áp dụng cả website mới truy cập. Có thể thu hồi bên dưới. Tải lại trang đang mở để hiện nút lưu thẻ.",
              )}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                let pattern: string;
                try {
                  pattern = originPattern(origin);
                } catch {
                  report(
                    t("Nhập origin HTTPS hợp lệ, ví dụ https://example.com"),
                  );
                  return;
                }
                const request = grantDetection(pattern, chrome.permissions);
                void attempt(async () => {
                  if (!(await request)) {
                    report(t("Chưa được cấp quyền website."));
                    return;
                  }
                  setOrigin("");
                  reload();
                });
              }}
            >
              <Field label={t("Website HTTPS")}>
                <input
                  type="url"
                  required
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder={t("https://example.com")}
                />
              </Field>
              <button className="primary full" disabled={working}>
                {t("Cấp quyền website")}
              </button>
            </form>
            {origins.length ? (
              <ul className="origin-list">
                {origins.map((o) => (
                  <li key={o}>
                    <span>
                      {o === ALL_HTTPS_SITES ? t("Tất cả website HTTPS") : o}
                    </span>
                    <button
                      className="text-button"
                      onClick={() =>
                        void attempt(async () => {
                          await chrome.permissions.remove({ origins: [o] });
                          reload();
                        })
                      }
                    >
                      {t("Thu hồi")}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="settings-help">
                {t("Chưa cấp quyền cho website nào.")}
              </p>
            )}
          </section>
        </TabPanel>
      </Tabs>
      <footer className="settings-policy">
        <PrivacyLink />
      </footer>
      {imported && (
        <Modal
          title={t("Xem trước bản nhập")}
          onClose={() => setImported(null)}
        >
          <p>
            {imported.cards.length} {t("thẻ ·")} {imported.subscriptions.length}{" "}
            {t("dịch vụ")}
          </p>
          <p className="settings-help">
            {t(
              "Gộp giữ bản ghi hiện có nếu trùng ID. Thay thế xóa dữ liệu hiện tại; hãy giữ một bản sao lưu trước.",
            )}
          </p>
          <Field label={t("Cách nhập")}>
            <Select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="merge">
                {t("Gộp, giữ bản hiện có khi trùng ID")}
              </option>
              <option value="replace">{t("Thay thế toàn bộ vault")}</option>
            </Select>
          </Field>
          <button
            className="primary full"
            disabled={busy || working}
            onClick={() =>
              void attempt(async () => {
                await save(mergeBackup(vault, imported, mode));
                setImported(null);
                report(t("Đã lưu an toàn."));
              })
            }
          >
            {t("Xác nhận nhập")}
          </button>
        </Modal>
      )}
    </div>
  );
}
