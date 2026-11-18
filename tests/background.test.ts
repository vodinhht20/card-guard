const { clearGrant } = vi.hoisted(() => ({
  clearGrant: vi.fn(async () => {}),
}));
vi.mock("../src/core/rememberedSession", () => ({
  IndexedDbRememberStore: class {
    clear = clearGrant;
  },
}));
import { beforeEach, describe, expect, it, vi } from "vitest";
import { opaque, buildSchedule } from "../src/core/reminders";
import { vaultFixture } from "./fixtures";
function event() {
  const listeners: Function[] = [];
  return {
    listeners,
    addListener: vi.fn((fn: Function) => listeners.push(fn)),
  };
}
function area(state: Record<string, unknown>) {
  return {
    setAccessLevel: vi.fn(async () => {}),
    get: vi.fn(async (keys: string | string[] | null) =>
      keys === null
        ? structuredClone(state)
        : Object.fromEntries(
            (Array.isArray(keys) ? keys : [keys]).map((k) => [
              k,
              structuredClone(state[k]),
            ]),
          ),
    ),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(state, structuredClone(items));
    }),
    remove: vi.fn(async (key: string) => {
      delete state[key];
    }),
    clear: vi.fn(async () => {
      for (const k of Object.keys(state)) delete state[k];
    }),
  };
}
function browser(data: Record<string, unknown> = {}) {
  const session: Record<string, unknown> = {};
  const api = {
    storage: { local: area(data), session: area(session) },
    runtime: {
      id: "test-extension",
      getURL: (path: string) => `chrome-extension://test-extension${path}`,
      onInstalled: event(),
      onStartup: event(),
      onMessage: event(),
    },
    alarms: {
      create: vi.fn(async () => {}),
      clear: vi.fn(async () => true),
      onAlarm: event(),
    },
    notifications: {
      create: vi.fn(async () => "cardguard-reminder"),
      clear: vi.fn(async () => true),
      onButtonClicked: event(),
      onClicked: event(),
    },
    action: {
      setBadgeText: vi.fn(async () => {}),
      setBadgeBackgroundColor: vi.fn(async () => {}),
    },
    permissions: {
      getAll: vi.fn(async () => ({ origins: [] })),
      contains: vi.fn(async () => true),
      onAdded: event(),
      onRemoved: event(),
    },
    scripting: {
      getRegisteredContentScripts: vi.fn(async () => []),
      registerContentScripts: vi.fn(async () => {}),
      unregisterContentScripts: vi.fn(async () => {}),
    },
    tabs: { query: vi.fn(async () => []), sendMessage: vi.fn(async () => {}) },
    sidePanel: { open: vi.fn(async () => {}) },
    windows: { getLastFocused: vi.fn(async () => ({ id: 1 })) },
  };
  return { api, data, session };
}
const ui = {
  id: "test-extension",
  url: "chrome-extension://test-extension/popup.html",
};
const web = {
  id: "test-extension",
  url: "https://example.com/billing",
  frameId: 0,
  tab: { id: 1 },
};
const signal = {
  type: "DETECTION",
  domain: "example.com",
  confidence: "high",
  kind: "trial",
  trialDays: 7,
};
async function start(data: Record<string, unknown> = {}) {
  const b = browser(data);
  vi.stubGlobal("chrome", b.api);
  await import("../src/background/index");
  await vi.waitFor(() => expect(b.api.alarms.create).toHaveBeenCalled());
  return b;
}
async function send(
  b: ReturnType<typeof browser>,
  message: unknown,
  sender = ui,
): Promise<any> {
  return new Promise((resolve) =>
    b.api.runtime.onMessage.listeners[0](message, sender, resolve),
  );
}
beforeEach(() => {
  clearGrant.mockReset();
  clearGrant.mockResolvedValue(undefined);
  vi.resetModules();
  vi.unstubAllGlobals();
});
describe("worker trust boundaries and MV3 lifecycle (fake Chrome only)", () => {
  it("restricts storage to trusted contexts and rejects web/forged/unknown commands", async () => {
    const b = await start();
    expect(b.api.storage.local.setAccessLevel).toHaveBeenCalledWith({
      accessLevel: "TRUSTED_CONTEXTS",
    });
    expect(await send(b, { type: "LOCK_ALL" }, web)).toEqual({ ok: false });
    expect(
      await send(b, { type: "LOCK_ALL" }, { ...ui, id: "foreign" }),
    ).toEqual({ ok: false });
    expect(
      await send(
        b,
        { type: "LOCK_ALL" },
        { ...ui, url: "https://test-extension/popup.html" },
      ),
    ).toEqual({ ok: false });
    expect(await send(b, { type: "LOCK_ALL", password: "secret" })).toEqual({
      ok: false,
    });
    expect(b.session.lockSignal).toBeUndefined();
    expect(await send(b, { type: "LOCK_ALL" })).toEqual({ ok: true });
    expect(b.session.lockSignal).toBeTypeOf("string");
  });
  it("revokes before broadcasting Lock Now, forgets without locking, and reports deletion failures", async () => {
    const b = await start();
    expect(await send(b, { type: "FORGET_SESSION" }, web)).toEqual({
      ok: false,
    });
    expect(clearGrant).not.toHaveBeenCalled();
    expect(await send(b, { type: "FORGET_SESSION" })).toEqual({ ok: true });
    expect(clearGrant).toHaveBeenCalledTimes(1);
    expect(b.session.lockSignal).toBeUndefined();
    clearGrant.mockImplementationOnce(async () => {
      expect(b.session.lockSignal).toBeUndefined();
    });
    expect(await send(b, { type: "LOCK_ALL" })).toEqual({ ok: true });
    expect(b.session.lockSignal).toBeTypeOf("string");
    delete b.session.lockSignal;
    clearGrant.mockRejectedValueOnce(new Error("test storage failure"));
    expect(await send(b, { type: "LOCK_ALL" })).toEqual({ ok: false });
    expect(b.session.lockSignal).toBeUndefined();
  });
  it("reveals only the UI language to a verified granted top-frame website", async () => {
    const b = await start({ uiLanguage: "en" });
    expect(await send(b, { type: "UI_LANGUAGE" }, web)).toEqual({
      ok: true,
      language: "en",
    });
    expect(await send(b, { type: "UI_LANGUAGE", extra: "no" }, web)).toEqual({
      ok: false,
    });
    expect(
      await send(b, { type: "UI_LANGUAGE" }, { ...web, frameId: 1 }),
    ).toEqual({ ok: false });
    expect(
      await send(b, { type: "UI_LANGUAGE" }, { ...web, id: "foreign" }),
    ).toEqual({ ok: false });
    expect(
      await send(
        b,
        { type: "UI_LANGUAGE" },
        { ...web, url: "http://example.com" },
      ),
    ).toEqual({ ok: false });
    b.api.permissions.contains.mockResolvedValue(false);
    expect(await send(b, { type: "UI_LANGUAGE" }, web)).toEqual({ ok: false });
  });
  it("accepts only top-frame matching granted-origin allowlisted detection hints", async () => {
    const b = await start();
    expect(await send(b, { ...signal, domain: "other.example" }, web)).toEqual({
      ok: false,
    });
    expect(await send(b, signal, { ...web, frameId: 2 })).toEqual({
      ok: false,
    });
    expect(
      await send(b, { ...signal, value: "payment sentinel" }, web),
    ).toEqual({ ok: false });
    b.api.permissions.contains.mockResolvedValue(false);
    expect(await send(b, signal, web)).toEqual({ ok: false });
    expect(b.session.suggestion).toBeUndefined();
    b.api.permissions.contains.mockResolvedValue(true);
    expect(await send(b, signal, web)).toEqual({ ok: true });
    expect(b.session.suggestion).toEqual({
      ...signal,
      expiresAt: expect.any(Number),
    });
    expect(b.data.suggestion).toBeUndefined();
  });
  it("validates card-button suggestions against sender, frame and permission", async () => {
    const b = await start();
    const cardSignal = { ...signal, kind: "card", trialDays: null };
    expect(await send(b, cardSignal, { ...web, frameId: 1 })).toEqual({
      ok: false,
    });
    expect(await send(b, { ...cardSignal, last4: "1234" }, web)).toEqual({
      ok: false,
    });
    b.api.permissions.contains.mockResolvedValue(false);
    expect(await send(b, cardSignal, web)).toEqual({ ok: false });
    expect(b.session.suggestion).toBeUndefined();
    b.api.permissions.contains.mockResolvedValue(true);
    expect(await send(b, cardSignal, web)).toEqual({ ok: true });
    expect(b.session.suggestion).toEqual({
      ...cardSignal,
      expiresAt: expect.any(Number),
    });
  });
  it("registers an explicit user grant for all HTTPS sites", async () => {
    const b = await start();
    b.api.permissions.getAll.mockResolvedValue({
      origins: ["https://*/*", "http://*/*", "<all_urls>"] as never[],
    });
    for (const fn of b.api.permissions.onAdded.listeners) fn();
    await vi.waitFor(() =>
      expect(b.api.scripting.registerContentScripts).toHaveBeenCalledWith([
        expect.objectContaining({ matches: ["https://*/*"], allFrames: false }),
      ]),
    );
  });
  it("version-checks schedules and applies reminder actions to latest state", async () => {
    const v = vaultFixture(),
      items = await buildSchedule(v, [], "2026-11-18");
    for (const r of items) r.at = Date.now() + 86400000;
    const b = await start({ vault: { ciphertext: "encrypted fixture" } });
    const command = {
      type: "SCHEDULE",
      items,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      version: await opaque("encrypted fixture"),
    };
    expect(await send(b, { ...command, version: "0".repeat(64) })).toEqual({
      ok: false,
    });
    expect(await send(b, command)).toEqual({ ok: true });
    expect(
      await send(b, {
        type: "REMINDER_ACTION",
        id: items[0].id,
        action: "snooze",
      }),
    ).toEqual({ ok: true });
    expect((b.data.reminders as any[])[0].snoozeUntil).toBeGreaterThan(
      Date.now(),
    );
    expect(
      await send(b, {
        type: "REMINDER_ACTION",
        id: items[0].id,
        action: "dismiss",
      }),
    ).toEqual({ ok: true });
    expect((b.data.reminders as any[])[0].delivered).toBe(true);
  });
  it("reconstructs alarms and sends one generic notice while locked without decryption", async () => {
    const items = await buildSchedule(vaultFixture(), [], "2026-11-18");
    for (const r of items) r.at = Date.now() - 1000;
    const b = await start({ reminders: items });
    await vi.waitFor(() =>
      expect(b.api.notifications.create).toHaveBeenCalledTimes(1),
    );
    const notice = b.api.notifications.create.mock.calls[0] as unknown as [
      string,
      { message: string },
    ];
    expect(notice[1].message).toBe(
      "Bạn có đăng ký cần kiểm tra trong CardGuard.",
    );
    expect(JSON.stringify(notice)).not.toContain("Test service");
    for (const fn of b.api.runtime.onStartup.listeners) fn();
    await send(b, { type: "REFRESH_SCHEDULE" });
    expect(b.api.notifications.create).toHaveBeenCalledTimes(1);
    expect(b.api.alarms.create).toHaveBeenCalledWith("cardguard-check", {
      periodInMinutes: 30,
    });
  });
  it("registers only explicit top-frame origins and stops resident scripts after revocation", async () => {
    const b = await start();
    b.api.permissions.getAll.mockResolvedValue({
      origins: ["https://example.com/*"] as never[],
    });
    for (const fn of b.api.permissions.onAdded.listeners) fn();
    await vi.waitFor(() =>
      expect(b.api.scripting.registerContentScripts).toHaveBeenCalledWith([
        expect.objectContaining({
          matches: ["https://example.com/*"],
          allFrames: false,
          js: ["content.js"],
        }),
      ]),
    );
    b.api.tabs.query.mockResolvedValue([{ id: 1 }] as never[]);
    for (const fn of b.api.permissions.onRemoved.listeners) fn();
    await vi.waitFor(() =>
      expect(b.api.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: "STOP_DETECTION",
      }),
    );
  });
});
