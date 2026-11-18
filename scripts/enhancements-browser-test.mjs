import { chromium, expect } from "@playwright/test";
import { mkdtemp, mkdir, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

// Isolated temporary browser profile; synthetic HTML and fake content messaging only.
const profile = await mkdtemp(`${tmpdir()}/cardguard-enhancements-`);
let context;
try {
  const extension = resolve("dist");
  context = await chromium.launchPersistentContext(profile, {
    headless: true,
    ...(process.env.CARDGUARD_CHROMIUM
      ? { executablePath: process.env.CARDGUARD_CHROMIUM }
      : {}),
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
      "--no-sandbox",
    ],
  });
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.setViewportSize({ width: 400, height: 600 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`chrome-extension://${id}/popup.html`);
  await expect(page.locator(".auth-brand")).toContainText(
    `v${JSON.parse(await readFile("dist/manifest.json", "utf8")).version}`,
  );
  expect(
    await page
      .locator(".auth-art")
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  ).toBe(true);
  expect(
    await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('16px "Noto Sans"');
    }),
  ).toBe(true);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/enhanced-gate.png" });
  await page.getByLabel("Mật khẩu", { exact: true }).fill("abc123");
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill("abc123");
  await expect(
    page.getByRole("heading", { name: "Tổng quan", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thêm dịch vụ", exact: true }).click();
  await expect(page.locator(".preset-grid img")).toHaveCount(12);
  expect(
    await page
      .locator(".preset-grid img")
      .evaluateAll((images) =>
        images.every((img) => img.complete && img.naturalWidth > 0),
      ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/enhanced-service-logos.png" });
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("tab", { name: "Website", exact: true }).click();
  await page.evaluate(() => {
    window.__permissionRequests = [];
    chrome.permissions.request = async (request) => {
      window.__permissionRequests.push(request);
      return false;
    };
  });
  await page
    .getByRole("button", { name: "Cho phép tất cả website HTTPS", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Chưa được cấp quyền website." }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.__permissionRequests)).toEqual([
    { origins: ["https://*/*"] },
  ]);
  await page.evaluate(() => {
    chrome.permissions.request = async () => true;
    chrome.permissions.getAll = async () => ({ origins: ["https://*/*"] });
    chrome.permissions.remove = async (request) => {
      window.__removed = request;
      return true;
    };
  });
  await page
    .getByRole("button", { name: "Cho phép tất cả website HTTPS", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Đã cho phép tất cả website HTTPS",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Thu hồi", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__removed))
    .toEqual({ origins: ["https://*/*"] });
  expect(errors).toEqual([]);

  const fixture = await context.newPage();
  await fixture.setViewportSize({ width: 900, height: 650 });
  await fixture.route("https://fixture.example/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<style>body{padding:60px;font:16px sans-serif}input{display:block;width:280px;height:40px;margin:12px}</style><h1>Payment details</h1><form><input autocomplete="cc-number" value="synthetic-secret"><input autocomplete="cc-csc"><input autocomplete="cc-exp"><button>Pay</button></form>',
    }),
  );
  await fixture.addInitScript(() => {
    window.__messages = [];
    window.__listeners = [];
    window.__roots = [];
    window.__submits = 0;
    const original = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (options) {
      const root = original.call(this, options);
      window.__roots.push(root);
      return root;
    };
    Object.defineProperty(HTMLInputElement.prototype, "value", {
      get() {
        throw new Error("Forbidden card value read");
      },
      configurable: true,
    });
    window.chrome.runtime = {
      id: "test",
      onMessage: {
        addListener(listener) {
          window.__listeners.push(listener);
        },
      },
      sendMessage: async (message) => {
        if (message.type === "UI_LANGUAGE") return { ok: true, language: "vi" };
        window.__messages.push(message);
        return { ok: !window.__fail };
      },
    };
    document.addEventListener("submit", (event) => {
      event.preventDefault();
      window.__submits++;
    });
  });
  await fixture.goto("https://fixture.example/checkout");
  const fixtureErrors = [];
  fixture.on("pageerror", (error) => fixtureErrors.push(error.message));
  await fixture.clock.install();
  await fixture.addScriptTag({ path: resolve("dist/content.js") });
  const buttons = fixture.locator("[data-cardguard-control]");
  await expect(buttons).toHaveCount(1);
  await fixture.evaluate(() =>
    window.__roots[0].querySelector("button").click(),
  );
  await expect
    .poll(() => fixture.evaluate(() => window.__messages))
    .toEqual([
      {
        type: "DETECTION",
        domain: "fixture.example",
        confidence: "high",
        kind: "card",
        trialDays: null,
      },
    ]);
  expect(await fixture.evaluate(() => window.__submits)).toBe(0);
  await fixture.screenshot({ path: "test-results/enhanced-card-button.png" });
  await fixture.clock.fastForward(31000);
  await fixture.evaluate(() => {
    const input = document.createElement("input");
    input.name = "cardNumber";
    document.querySelector("form").append(input);
  });
  await fixture.clock.fastForward(1500);
  await expect(buttons).toHaveCount(2);
  await fixture.evaluate(() => {
    document.querySelector('[autocomplete="cc-number"]').remove();
  });
  await fixture.clock.fastForward(1500);
  await expect(buttons).toHaveCount(1);
  await fixture.evaluate(() => {
    window.__fail = true;
    window.__roots.at(-1).querySelector("button").click();
  });
  await expect
    .poll(() =>
      fixture.evaluate(
        () => window.__roots.at(-1).querySelector("button").title,
      ),
    )
    .toContain("Chưa mở được");
  // Dismissing the subscription hint must not disable the independent card controls.
  await fixture.evaluate(() => {
    document.querySelector("h1").textContent = "Start 7-day free trial";
    document.querySelector("form button").textContent = "Add payment method";
    const heading = document.createElement("button");
    heading.textContent = "Add payment method";
    document.body.append(heading);
  });
  await fixture.clock.fastForward(1500);
  await expect(fixture.locator("#cardguard-hint")).toHaveCount(1);
  await fixture.evaluate(() =>
    window.__roots
      .find((root) => root.querySelector("section"))
      .querySelectorAll("button")[1]
      .click(),
  );
  await expect(fixture.locator("#cardguard-hint")).toHaveCount(0);
  await expect(buttons).toHaveCount(1);
  await fixture.evaluate(() =>
    window.__listeners.forEach((listener) =>
      listener({ type: "STOP_DETECTION" }, { id: "test" }),
    ),
  );
  await expect(buttons).toHaveCount(0);
  await fixture.evaluate(() =>
    document.body.append(document.createElement("input")),
  );
  await fixture.clock.fastForward(1500);
  await expect(buttons).toHaveCount(0);
  expect(fixtureErrors).toEqual([]);
  console.log(
    "Focused browser checks passed: local font/art/version, 12 logos, permission denial/grant/revoke, card-only control, no field value reads or form submission, late SPA fields, errors and shutdown.",
  );
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
