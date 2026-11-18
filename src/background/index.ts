import { notificationCopy, readLanguage } from "../core/locale";
import { IndexedDbRememberStore } from "../core/rememberedSession";
import { z } from "zod";
import { signalSchema } from "../core/detection";
import {
  opaque,
  rebaseTimeZone,
  reconcile,
  scheduleSchema,
  type Reminder,
} from "../core/reminders";
import { syncDetectionScripts } from "./permissions";
const UI_PATHS = new Set(["/popup.html", "/sidepanel.html"]);
function trusted(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id) return false;
  try {
    const u = new URL(sender.url ?? "");
    return (
      u.protocol === "chrome-extension:" &&
      u.hostname === chrome.runtime.id &&
      UI_PATHS.has(u.pathname)
    );
  } catch {
    return false;
  }
}
// Single worker queue serializes all schedule updates and deliveries.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn);
  queue = result.catch(() => undefined);
  return result;
}
const initAccess = chrome.storage.local.setAccessLevel({
  accessLevel: "TRUSTED_CONTEXTS",
});
const sessionAccess = chrome.storage.session.setAccessLevel({
  accessLevel: "TRUSTED_CONTEXTS",
});
const io = {
  async load(): Promise<Reminder[]> {
    const data = await chrome.storage.local.get(["reminders", "reminderZone"]);
    let schedule = scheduleSchema.parse(data.reminders ?? []);
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof data.reminderZone === "string" && data.reminderZone !== zone) {
      schedule = rebaseTimeZone(schedule, data.reminderZone);
      await chrome.storage.local.set({
        reminders: schedule,
        reminderZone: zone,
      });
    }
    return schedule;
  },
  async save(reminders: Reminder[]) {
    await chrome.storage.local.set({ reminders });
  },
  async notify(ids: string[]) {
    await chrome.storage.local.set({ lastNoticeIds: ids });
    const copy = notificationCopy(
      readLanguage((await chrome.storage.local.get("uiLanguage")).uiLanguage),
    );
    await chrome.notifications.create("cardguard-reminder", {
      type: "basic",
      iconUrl: "icon128.png",
      title: "CardGuard",
      message: copy.message,
      buttons: [{ title: copy.snooze }, { title: copy.dismiss }],
    });
  },

  async alarm(when: number | null) {
    await chrome.alarms.clear("cardguard-next");
    if (when) await chrome.alarms.create("cardguard-next", { when });
  },
  async badge(count: number) {
    await chrome.action.setBadgeText({ text: count ? String(count) : "" });
    await chrome.action.setBadgeBackgroundColor({ color: "#245cbe" });
  },
};
async function wake() {
  await Promise.all([initAccess, sessionAccess]);
  await chrome.alarms.create("cardguard-check", { periodInMinutes: 30 });
  await serial(() => reconcile(io));
}
chrome.runtime.onInstalled.addListener(() => {
  void wake().catch(() => undefined);
  void syncDetectionScripts().catch(() => undefined);
});
chrome.runtime.onStartup.addListener(() => {
  void wake().catch(() => undefined);
  void chrome.storage.session.clear();
  void serial(syncDetectionScripts).catch(() => undefined);
});
chrome.alarms.onAlarm.addListener(() => {
  void serial(() => reconcile(io)).catch(() => undefined);
});
chrome.permissions.onAdded.addListener(() => {
  void serial(syncDetectionScripts).catch(() => undefined);
});
chrome.permissions.onRemoved.addListener(() => {
  void serial(async () => {
    await syncDetectionScripts();
    // Existing content scripts stay resident after revocation; stop their limited observer and hint.
    for (const tab of await chrome.tabs.query({})) {
      if (tab.id)
        await chrome.tabs
          .sendMessage(tab.id, { type: "STOP_DETECTION" })
          .catch(() => undefined);
    }
    await chrome.storage.session.remove("suggestion");
  }).catch(() => undefined);
});
const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("REFRESH_SCHEDULE") }).strict(),
  z
    .object({
      type: z.literal("SCHEDULE"),
      items: scheduleSchema,
      version: z.string().regex(/^[a-f0-9]{64}$/),
      timeZone: z.string().min(1).max(100),
    })
    .strict(),
  z
    .object({
      type: z.literal("REMINDER_ACTION"),
      id: z.string().regex(/^[a-f0-9]{64}$/),
      action: z.enum(["snooze", "dismiss"]),
    })
    .strict(),
  z.object({ type: z.literal("LOCK_ALL") }).strict(),
  z.object({ type: z.literal("FORGET_SESSION") }).strict(),
]);
chrome.runtime.onMessage.addListener((raw: unknown, sender, respond) => {
  if (trusted(sender)) {
    const parsed = commandSchema.safeParse(raw);
    if (!parsed.success) {
      respond({ ok: false });
      return;
    }
    const msg = parsed.data;
    void serial(async () => {
      await initAccess;
      if (msg.type === "LOCK_ALL" || msg.type === "FORGET_SESSION")
        await new IndexedDbRememberStore().clear();
      if (msg.type === "LOCK_ALL")
        await chrome.storage.session.set({ lockSignal: crypto.randomUUID() });
      if (msg.type === "SCHEDULE") {
        const { vault } = await chrome.storage.local.get("vault");
        if (!vault || (await opaque(vault.ciphertext)) !== msg.version)
          return { ok: false };
        if (msg.timeZone !== Intl.DateTimeFormat().resolvedOptions().timeZone)
          return { ok: false };
        // Preserve worker delivery progress if the UI calculated while a notification fired.
        const old = new Map((await io.load()).map((r) => [r.id, r]));
        const items = msg.items.map((r) => ({
          ...r,
          delivered: old.get(r.id)?.delivered ?? r.delivered,
          snoozeUntil: old.get(r.id)?.snoozeUntil ?? r.snoozeUntil,
        }));
        await chrome.storage.local.set({
          reminders: items,
          reminderZone: msg.timeZone,
        });
      }
      if (msg.type === "REMINDER_ACTION") {
        const schedule = await io.load();
        const item = schedule.find((r) => r.id === msg.id);
        if (!item) return { ok: false };
        item.delivered = msg.action === "dismiss";
        item.snoozeUntil =
          msg.action === "snooze" ? Date.now() + 3600000 : null;
        await io.save(schedule);
      }
      if (msg.type !== "LOCK_ALL" && msg.type !== "FORGET_SESSION")
        await reconcile(io);
      return { ok: true };
    }).then(respond, () => respond({ ok: false }));
    return true;
  }
  if (
    z
      .object({ type: z.literal("UI_LANGUAGE") })
      .strict()
      .safeParse(raw).success
  ) {
    if (
      sender.id !== chrome.runtime.id ||
      sender.frameId !== 0 ||
      !sender.tab?.id
    ) {
      respond({ ok: false });
      return;
    }
    void (async () => {
      const url = new URL(sender.url ?? "");
      if (
        url.protocol !== "https:" ||
        url.port ||
        url.username ||
        url.password ||
        !(await chrome.permissions.contains({ origins: [`${url.origin}/*`] }))
      )
        return { ok: false };
      return {
        ok: true,
        language: readLanguage(
          (await chrome.storage.local.get("uiLanguage")).uiLanguage,
        ),
      };
    })().then(respond, () => respond({ ok: false }));
    return true;
  }
  const signal = signalSchema.safeParse(raw);
  if (
    !signal.success ||
    sender.id !== chrome.runtime.id ||
    sender.frameId !== 0 ||
    !sender.tab?.id
  ) {
    respond({ ok: false });
    return;
  }
  let origin: string;
  try {
    const url = new URL(sender.url ?? "");
    if (
      url.protocol !== "https:" ||
      url.hostname !== signal.data.domain ||
      url.port ||
      url.username ||
      url.password
    )
      throw new Error();
    origin = `${url.origin}/*`;
  } catch {
    respond({ ok: false });
    return;
  }
  // Only the click path sends this message. Open immediately to preserve the user gesture.
  const panel = chrome.sidePanel.open({ tabId: sender.tab.id }).then(
    () => true,
    () => false,
  );
  void (async () => {
    if (!(await chrome.permissions.contains({ origins: [origin] })))
      return { ok: false };
    await sessionAccess;
    await chrome.storage.session.set({
      suggestion: { ...signal.data, expiresAt: Date.now() + 10 * 60_000 },
    });
    const opened = await panel;
    return { ok: opened };
  })().then(respond, () => respond({ ok: false }));
  return true;
});
chrome.notifications.onButtonClicked.addListener((id, button) => {
  if (id !== "cardguard-reminder") return;
  void serial(async () => {
    if (button === 0) {
      const schedule = await io.load();
      const now = Date.now();
      const { lastNoticeIds } = await chrome.storage.local.get("lastNoticeIds");
      const ids = new Set(Array.isArray(lastNoticeIds) ? lastNoticeIds : []);
      for (const r of schedule)
        if (ids.has(r.id)) {
          r.delivered = false;
          r.snoozeUntil = now + 3600000;
        }
      await io.save(schedule);
      await reconcile(io);
    }
    await chrome.notifications.clear(id);
  }).catch(() => undefined);
});
chrome.notifications.onClicked.addListener((id) => {
  if (id === "cardguard-reminder")
    void chrome.windows
      .getLastFocused()
      .then((w) =>
        w.id === undefined
          ? undefined
          : chrome.sidePanel.open({ windowId: w.id }),
      )
      .catch(() => undefined);
});
void wake().catch(() => undefined);
