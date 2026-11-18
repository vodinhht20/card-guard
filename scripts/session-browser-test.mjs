import { chromium, expect } from "@playwright/test";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { choose } from "./browser-helpers.mjs";
const profile = await mkdtemp(`${tmpdir()}/cardguard-remember-`),
  extension = resolve("dist");
const options = {
  headless: true,
  ...(process.env.CARDGUARD_CHROMIUM
    ? { executablePath: process.env.CARDGUARD_CHROMIUM }
    : {}),
  args: [
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
    "--no-sandbox",
  ],
};
let context;
try {
  context = await chromium.launchPersistentContext(profile, options);
  const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker")),
    id = new URL(worker.url()).host;
  let page = await context.newPage();
  await page.setViewportSize({ width: 400, height: 600 });
  page.setDefaultTimeout(12000);
  await page.goto(`chrome-extension://${id}/popup.html`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("abc123");
  await page.getByText("Ghi nhớ tôi", { exact: true }).click();
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill("abc123");
  await expect(
    page.getByRole("heading", { name: "Tổng quan", exact: true }),
  ).toBeVisible();
  await page.goto("about:blank");
  await page.goto(`chrome-extension://${id}/popup.html`);
  await expect(
    page.getByRole("heading", { name: "Tổng quan", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("tab", { name: "Bảo mật", exact: true }).click();
  await expect(page.getByText("Đã ghi nhớ", { exact: true })).toBeVisible();
  await choose(page, "Thời hạn ghi nhớ", "14 ngày");
  await choose(page, "Tự khóa", "Không tự khóa");
  await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Đã lưu an toàn." }),
  ).toBeVisible();
  const grantInfo = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("cardguard-remember", 1);
        r.onsuccess = () => {
          const db = r.result,
            q = db
              .transaction("sessions")
              .objectStore("sessions")
              .get("current");
          q.onsuccess = () => {
            const v = q.result;
            db.close();
            resolve(
              v
                ? {
                    days: v.days,
                    duration: v.expiresAt - v.createdAt,
                    extractable: v.deviceKey.extractable,
                    hasPassword: "password" in v,
                  }
                : null,
            );
          };
          q.onerror = () => reject(new Error("test read"));
        };
      }),
  );
  expect(grantInfo).toEqual({
    days: 14,
    duration: 14 * 86400000,
    extractable: false,
    hasPassword: false,
  });
  await context.close();
  context = await chromium.launchPersistentContext(profile, options);
  page = await context.newPage();
  await page.setViewportSize({ width: 400, height: 600 });
  page.setDefaultTimeout(12000);
  await page.goto(`chrome-extension://${id}/popup.html`);
  await expect(
    page.getByRole("heading", { name: "Tổng quan", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("tab", { name: "Giao diện", exact: true }).click();
  // Keyboard operation is supported alongside the pointer path in choose().
  const size = page
    .locator(".field")
    .filter({ has: page.locator("label").filter({ hasText: /^Cỡ chữ$/ }) })
    .getByRole("button");
  await size.press("ArrowDown");
  await page
    .getByRole("option", { name: "Lớn hơn", exact: true })
    .press("Enter");
  await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/settings.png", fullPage: true });
  await page.getByRole("tab", { name: "Bảo mật", exact: true }).click();
  await page.screenshot({
    path: "test-results/security-settings.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Hủy phiên ghi nhớ", exact: true })
    .click();
  await expect(
    page.getByText("Chưa bật ghi nhớ", { exact: true }),
  ).toBeVisible();
  await page.goto("about:blank");
  await page.goto(`chrome-extension://${id}/popup.html`);
  await expect(
    page.getByRole("heading", { name: "Mở khóa", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/unlock.png", fullPage: true });
  await page.getByText("Ghi nhớ tôi", { exact: true }).click();
  await page.getByLabel("Mật khẩu", { exact: true }).fill("abc123");
  await expect(
    page.getByRole("button", { name: "Cài đặt", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("button", { name: "Khóa ngay", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mở khóa", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Mở khóa", exact: true }),
  ).toBeVisible();
  // Expired persisted metadata must fail closed, even after the UI is destroyed.
  await page.getByText("Ghi nhớ tôi", { exact: true }).click();
  await page.getByLabel("Mật khẩu", { exact: true }).fill("abc123");
  await expect(
    page.getByRole("button", { name: "Cài đặt", exact: true }),
  ).toBeVisible();
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("cardguard-remember", 1);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("sessions", "readwrite"),
            store = tx.objectStore("sessions"),
            q = store.get("current");
          q.onsuccess = () => {
            const v = q.result;
            v.createdAt = Date.now() - 15 * 86400000;
            v.expiresAt = v.createdAt + v.days * 86400000;
            store.put(v, "current");
          };
          tx.oncomplete = () => {
            db.close();
            resolve(true);
          };
        };
      }),
  );
  await page.goto("about:blank");
  await page.goto(`chrome-extension://${id}/popup.html`);
  await expect(
    page.getByRole("heading", { name: "Mở khóa", exact: true }),
  ).toBeVisible();
  console.log(
    "Remembered-session browser passed: opt-in OTP unlock, automatic reopen and browser restart, 14-day configuration, custom selects, font settings, explicit revocation, Lock Now revocation, expired grant rejection.",
  );
} catch (error) {
  await mkdir("test-results", { recursive: true });
  for (const [i, p] of (context?.pages() ?? []).entries())
    if (p.url().startsWith("chrome-extension:")) {
      await p
        .screenshot({
          path: `test-results/sessions-failure-${i}.png`,
          fullPage: true,
        })
        .catch(() => undefined);
      await writeFile(
        `test-results/sessions-failure-${i}.txt`,
        await p.locator("body").ariaSnapshot(),
      ).catch(() => undefined);
    }
  throw error;
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
