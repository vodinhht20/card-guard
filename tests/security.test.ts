import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { seal } from "../src/core/crypto";
import { buildSchedule } from "../src/core/reminders";
import { vaultFixture } from "./fixtures";
const read = (p: string) => readFileSync(resolve(p), "utf8");
describe("privacy/security regressions", () => {
  it("persists only encrypted records and anonymous scheduling metadata", async () => {
    const v = vaultFixture();
    const storage = JSON.stringify({
      vault: await seal(v, "security test password"),
      reminders: await buildSchedule(v, [], "2026-11-18"),
    });
    for (const value of [
      v.cards[0].nickname,
      v.subscriptions[0].name,
      v.subscriptions[0].domain,
      v.subscriptions[0].notes,
      "first3",
      "last4",
      "cardId",
    ])
      expect(storage).not.toContain(value);
    const schedule = await buildSchedule(v, [], "2026-11-18");
    expect(Object.keys(schedule[0]).sort()).toEqual([
      "at",
      "delivered",
      "dueAt",
      "group",
      "id",
      "snoozeUntil",
    ]);
  });
  it("has no install-time hosts, sync, incognito, remote connections or forbidden permissions", () => {
    const m = JSON.parse(read("public/manifest.json"));
    expect(m.manifest_version).toBe(3);
    expect(m.host_permissions).toBeUndefined();
    expect(m.content_scripts).toBeUndefined();
    expect(m.incognito).toBe("not_allowed");
    expect(m.permissions).toEqual([
      "storage",
      "alarms",
      "notifications",
      "sidePanel",
      "scripting",
    ]);
    expect(m.content_security_policy.extension_pages).toContain(
      "connect-src 'none'",
    );
  });
  it("content script never reads form values, storage, input events, payment network or vault", () => {
    const content = read("src/content/index.ts");
    for (const pattern of [
      /\.value\b/,
      /storage\./,
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /addEventListener\(['"](?:input|change|submit|keydown)/,
      /iframe\s*\./,
      /vault/i,
      /console\./,
    ])
      expect(content).not.toMatch(pattern);
    expect(content).toContain("window.top !== window");
    expect(content).toContain("form,[contenteditable],#cardguard-hint");
  });
  it("runtime has no remote transmission/logging APIs or HTML injection sinks", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? walk(`${dir}/${e.name}`)
          : /\.tsx?$/.test(e.name)
            ? [`${dir}/${e.name}`]
            : [],
      );
    for (const file of walk("src")) {
      const source = read(file);
      for (const pattern of [
        /\bfetch\s*\(/,
        /XMLHttpRequest/,
        /sendBeacon/,
        /WebSocket/,
        /chrome\.storage\.sync/,
        /localStorage/,
        /console\.(log|error|warn|debug)/,
        /dangerouslySetInnerHTML/,
        /\.innerHTML\s*=/,
        /\beval\s*\(/,
      ])
        expect(source, `${file}: ${pattern}`).not.toMatch(pattern);
    }
  });
  it("worker sends generic locked notifications and validates sender and schemas", () => {
    const worker = read("src/background/index.ts");
    expect(worker).toContain("const copy = notificationCopy(");
    expect(worker).toContain("message: copy.message");
    expect(worker).toContain("sender.frameId !== 0");
    expect(worker).toContain("chrome.permissions.contains");
    expect(worker).toContain("commandSchema.safeParse");
    expect(worker).not.toContain("deriveKey");
    expect(worker).not.toContain("decrypt(");
  });
});
