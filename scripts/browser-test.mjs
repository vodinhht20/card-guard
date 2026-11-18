import { choose, setDate, expectDate } from "./browser-helpers.mjs";
import { chromium, expect } from "@playwright/test";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
const extension = resolve("dist");
const profile = await mkdtemp(`${tmpdir()}/cardguard-browser-`);
const executablePath = process.env.CARDGUARD_CHROMIUM;
let context;
try {
  const launchOptions = {
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
      "--no-sandbox",
    ],
  };
  context = await chromium.launchPersistentContext(profile, launchOptions);
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await page.clock.setFixedTime(new Date("2026-11-18T05:00:00Z"));
  await page.setViewportSize({ width: 400, height: 600 });
  const errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  context.on("request", (req) => {
    if (/^https?:/.test(req.url())) requests.push(req.url());
  });
  await page.goto(`chrome-extension://${id}/popup.html`);
  await expect(
    page.getByRole("heading", { name: "Tạo mật khẩu" }),
  ).toBeVisible();
  await page.getByLabel("Mật khẩu", { exact: true }).fill("abc12");
  await expect(
    page.getByRole("heading", { name: "Tạo mật khẩu" }),
  ).toBeVisible();
  await page.getByLabel("Mật khẩu", { exact: true }).fill("abc123");
  await expect(
    page.getByLabel("Xác nhận mật khẩu", { exact: true }),
  ).toBeFocused();
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill("abc124");
  await expect(page.getByRole("alert")).toHaveText("Mật khẩu chưa khớp.");
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill("abc123");
  await expect(
    page.getByRole("button", { name: "Cài đặt", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thêm thẻ", exact: true }).click();
  await page.getByLabel("4 số cuối").fill("45");
  await expect(
    page.getByRole("status").filter({ hasText: "Đã giữ bản nháp" }),
  ).toBeVisible();
  await page.goto("about:blank");
  await page.goto(`chrome-extension://${id}/popup.html`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("abc123");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("4 số cuối")).toHaveValue("45");
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Thêm thẻ", exact: true }).click();
  await page.getByRole("button", { name: "＋ Tùy chọn thêm" }).click();
  await page.getByLabel("Biệt danh thẻ").fill("Test personal wallet");
  await page.getByLabel("4 số cuối").fill("4567");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Thêm dịch vụ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chọn dịch vụ phổ biến" }),
  ).toBeVisible();
  await expect(page.getByLabel("Website", { exact: true })).not.toBeVisible();
  await mkdir("test-results", { recursive: true });
  await page
    .getByRole("dialog")
    .screenshot({ path: "test-results/service-picker.png" });
  await page.getByLabel("Tìm dịch vụ").fill("NETFLIX");
  await page
    .getByRole("button", { name: "Netflix netflix.com", exact: true })
    .click();
  await expect(page.locator(".selected-preset")).toContainText("Netflix");
  await expect(page.getByLabel("Website", { exact: true })).not.toBeVisible();
  await choose(page, "Trạng thái", "Dùng thử");
  await setDate(page, "Ngày kết thúc dùng thử", "2026-12-01");
  await expect(
    page.getByRole("status").filter({ hasText: "Đã giữ bản nháp" }),
  ).toBeVisible();
  await page.goto("about:blank");
  await page.goto(`chrome-extension://${id}/popup.html`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("abc123");
  await expect(page.locator(".selected-preset")).toContainText("Netflix");
  await expectDate(page, "Ngày kết thúc dùng thử", "2026-12-01");
  await page.getByRole("button", { name: "Đổi dịch vụ", exact: true }).click();
  await expect(page.getByLabel("Tìm dịch vụ")).toHaveValue("NETFLIX");
  await page.getByLabel("Tìm dịch vụ").fill("am nhac");
  await page
    .getByRole("button", { name: "Spotify spotify.com", exact: true })
    .click();
  await expect(page.locator(".selected-preset")).toContainText("Spotify");
  await expectDate(page, "Ngày kết thúc dùng thử", "2026-12-01");
  await page.getByRole("button", { name: "Đổi dịch vụ", exact: true }).click();
  await page.getByLabel("Tìm dịch vụ").fill("missing-service-fixture");
  await expect(
    page.getByText("Không tìm thấy dịch vụ. Bạn có thể tạo dịch vụ riêng.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Dịch vụ khác/ }).click();
  await expect(page.getByLabel("Website", { exact: true })).toHaveValue("");

  await page.getByRole("button", { name: "＋ Tùy chọn thêm" }).click();
  await page.getByLabel("Tên dịch vụ").fill("Test subscription");
  await page.getByLabel("Website", { exact: true }).fill("example.com");
  await choose(page, "Thẻ liên kết", "Test personal wallet · •••• 4567");
  await choose(page, "Trạng thái", "Dùng thử");
  await setDate(page, "Ngày kết thúc dùng thử", "2026-12-01");
  await expect(
    page.getByRole("status").filter({ hasText: "Đã giữ bản nháp" }),
  ).toBeVisible();
  await page.goto("about:blank");
  await page.goto(`chrome-extension://${id}/popup.html`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("abc123");
  await expect(page.getByLabel("Website", { exact: true })).toHaveValue(
    "example.com",
  );
  await expect(page.getByLabel("Tên dịch vụ")).toHaveValue("Test subscription");
  await expectDate(page, "Ngày kết thúc dùng thử", "2026-12-01");
  const ephemeral = await worker.evaluate(() =>
    chrome.storage.session.get(null),
  );
  expect(JSON.stringify(ephemeral)).not.toContain("Test subscription");
  expect(JSON.stringify(ephemeral)).not.toContain("Test personal wallet");
  expect(JSON.stringify(ephemeral)).not.toContain("abc123");

  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Lịch nhắc", exact: true }).click();
  await expect(page.locator(".upcoming-events")).toContainText(
    "Test subscription",
  );
  await expect(page.locator(".month-agenda")).toContainText(
    "Tháng này không có dịch vụ đến hạn.",
  );
  await page.getByRole("button", { name: "Tháng sau", exact: true }).click();
  await expect(
    page.locator('.month-cell[data-date="2026-12-01"] .month-event-mark'),
  ).toHaveText("1");
  await expect(page.locator(".month-agenda")).toContainText(
    "Test subscription",
  );
  const beforeDay = await worker.evaluate(
    async () =>
      (await chrome.storage.session.get("workspace:popup"))["workspace:popup"]
        ?.ciphertext,
  );
  await page.locator('.month-cell[data-date="2026-12-01"]').click();
  await expect(
    page.getByRole("heading", { name: "Ngày 01/12", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      worker.evaluate(
        async () =>
          (await chrome.storage.session.get("workspace:popup"))[
            "workspace:popup"
          ]?.ciphertext,
      ),
    )
    .not.toBe(beforeDay);
  await page.goto("about:blank");
  await page.goto(`chrome-extension://${id}/popup.html`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("abc123");
  await expect(
    page.getByRole("heading", { name: "Ngày 01/12", exact: true }),
  ).toBeVisible();
  await page.locator(".month-agenda").getByRole("button").click();
  await expect(page.getByRole("dialog")).toContainText("Test subscription");
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await choose(page, "Năm", "2028");
  await choose(page, "Tháng", "Tháng 2");
  await expect(
    page.locator('.month-cell[data-date="2028-02-29"]'),
  ).toBeVisible();
  await expect(page.locator(".month-agenda")).toContainText(
    "Tháng này không có dịch vụ đến hạn.",
  );
  await page.locator('.month-cell[data-date="2028-02-28"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.locator('.month-cell[data-date="2028-02-29"]'),
  ).toBeFocused();
  await page.getByRole("button", { name: "Tháng này", exact: true }).click();
  await choose(page, "Tháng", "Tháng 12");
  await mkdir("test-results", { recursive: true });
  await page.locator(".month-section").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/calendar.png", fullPage: true });
  await page.getByRole("button", { name: "Dịch vụ", exact: true }).click();
  await page
    .getByRole("button")
    .filter({ hasText: "Test subscription" })
    .click();
  await page.getByRole("button", { name: "Đánh dấu đã gỡ thẻ" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button")
    .filter({ hasText: "Test subscription" })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Dùng thử", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Đã yêu cầu hủy", exact: true })
    .click();
  await page
    .getByRole("button")
    .filter({ hasText: "Test subscription" })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Chờ xác nhận hủy", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Xác nhận đã hủy", exact: true })
    .click();
  await page
    .getByRole("button")
    .filter({ hasText: "Test subscription" })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Đã hủy", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  const storage = await worker.evaluate(() => chrome.storage.local.get(null));
  if (
    JSON.stringify(storage).includes("Test personal wallet") ||
    JSON.stringify(storage).includes("Test subscription")
  )
    throw new Error("Plaintext in storage");
  if (storage.reminders.length)
    throw new Error("Cancelled plan still scheduled");
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("tab", { name: "Dữ liệu", exact: true }).click();
  await page
    .getByLabel("Mật khẩu file sao lưu")
    .fill("separate backup passphrase");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất bản sao lưu" }).click();
  const backup = await download;
  const backupPath = await backup.path();
  await page
    .getByLabel("Mật khẩu file sao lưu")
    .fill("separate backup passphrase");
  await page.locator("input[type=file]").setInputFiles(backupPath);
  await expect(
    page.getByRole("heading", { name: "Xem trước bản nhập" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận nhập" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Thẻ của tôi", exact: true }).click();
  await expect(page.locator(".payment-card")).toHaveCount(1);
  await page.screenshot({ path: "test-results/cards.png" });
  await page.getByRole("button", { name: "Tổng quan", exact: true }).click();
  await mkdir("test-results", { recursive: true });
  await expect(page.locator(".header")).toHaveCount(0);
  await page.screenshot({ path: "test-results/popup.png", fullPage: false });
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("button", { name: "Khóa ngay" }).click();
  await expect(page.getByRole("heading", { name: "Mở khóa" })).toBeVisible();
  await page.getByLabel("Mật khẩu", { exact: true }).fill("bad123");
  await expect(page.getByRole("alert")).toContainText("Không thể mở khóa");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("abc123");
  await expect(
    page.getByRole("button", { name: "Cài đặt", exact: true }),
  ).toBeVisible();
  // Another UI context starts locked; closing/reopening never restores a decryption key.
  const side = await context.newPage();
  await side.goto(`chrome-extension://${id}/sidepanel.html`);
  await expect(side.getByRole("heading", { name: "Mở khóa" })).toBeVisible();
  await side.getByLabel("Mật khẩu", { exact: true }).fill("abc123");
  await expect(
    side.getByRole("button", { name: "Cài đặt", exact: true }),
  ).toBeVisible();
  await side.setViewportSize({ width: 440, height: 900 });
  await side.screenshot({ path: "test-results/sidepanel.png", fullPage: true });
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("button", { name: "Khóa ngay" }).click();
  await expect(side.getByRole("heading", { name: "Mở khóa" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Mở khóa" })).toBeVisible();
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
  // Isolated website fixture: deliberately make any payment input value read fail.
  const fixture = await context.newPage();
  await fixture.route("https://fixture.example/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<h1>Start 7-day free trial</h1><button>Add payment method</button><form><input value="synthetic-secret"><h2>Private payment form</h2></form>',
    }),
  );
  await fixture.addInitScript(() => {
    window.__messages = [];
    const original = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (options) {
      const root = original.call(this, options);
      window.__hintRoot = root;
      return root;
    };
    Object.defineProperty(HTMLInputElement.prototype, "value", {
      get() {
        throw new Error("Forbidden payment value read");
      },
      configurable: true,
    });
    window.chrome.runtime = {
      id: "test",
      onMessage: { addListener() {} },
      sendMessage: async (m) => {
        if (m.type === "UI_LANGUAGE") return { ok: true, language: "vi" };
        window.__messages.push(m);
        return { ok: true };
      },
    };
  });
  await fixture.goto("https://fixture.example/billing");
  const fixtureErrors = [];
  fixture.on("pageerror", (e) => fixtureErrors.push(e.message));
  await fixture.addScriptTag({ path: resolve("dist/content.js") });
  await fixture
    .waitForFunction(() => !!window.__hintRoot, {}, { timeout: 5000 })
    .catch(async () => {
      throw new Error(
        JSON.stringify({
          errors: fixtureErrors,
          state: await fixture.evaluate(() => ({
            runtime: !!window.chrome?.runtime,
            labels: [...document.querySelectorAll("h1,button")].map((el) => [
              el.textContent,
              el.checkVisibility(),
            ]),
            root: !!window.__hintRoot,
          })),
        }),
      );
    });
  await fixture.evaluate(() =>
    window.__hintRoot.querySelector("button").click(),
  );
  const messages = await fixture.evaluate(() => window.__messages);
  expect(messages).toEqual([
    {
      type: "DETECTION",
      domain: "fixture.example",
      confidence: "high",
      kind: "trial",
      trialDays: 7,
    },
  ]);
  expect(fixtureErrors).toEqual([]);
  // Restart the entire isolated browser, preserving only its temporary on-disk profile.
  await context.close();
  context = await chromium.launchPersistentContext(profile, launchOptions);
  const restarted = await context.newPage();
  await restarted.goto(`chrome-extension://${id}/popup.html`);
  await expect(
    restarted.getByRole("heading", { name: "Mở khóa" }),
  ).toBeVisible();
  await restarted.getByLabel("Mật khẩu", { exact: true }).fill("abc123");
  await expect(
    restarted.getByRole("button", { name: "Cài đặt", exact: true }),
  ).toBeVisible();
  await restarted
    .getByRole("button", { name: "Thẻ của tôi", exact: true })
    .click();
  await expect(
    restarted.getByText("Test personal wallet", { exact: true }),
  ).toBeVisible();
  console.log(
    "Browser passed: local service catalog/search/preset switching/custom fallback/restored selection, OTP-style six-character passwords, last4-only cards, custom date/select controls, encrypted form continuation after popup page closure, vault lifecycle and browser restart, card/service/link/review, independent removal/cancellation, encrypted storage, backup export/import, popup/sidepanel UI, lock propagation, no extension external requests, detection never reads payment input values.",
  );
} catch (error) {
  await mkdir("test-results", { recursive: true });
  for (const [i, p] of (context?.pages() ?? []).entries())
    if (p.url().startsWith("chrome-extension:")) {
      await p
        .screenshot({
          path: `test-results/browser-failure-${i}.png`,
          fullPage: true,
        })
        .catch(() => undefined);
      await writeFile(
        `test-results/browser-failure-${i}.txt`,
        await p.locator("body").ariaSnapshot(),
      ).catch(() => undefined);
    }
  throw error;
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
