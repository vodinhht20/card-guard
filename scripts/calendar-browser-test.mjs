import { chromium, expect } from "@playwright/test";
import { build } from "esbuild";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
const profile = await mkdtemp(`${tmpdir()}/cardguard-calendar-`);
let context;
try {
  const built = await build({
    entryPoints: ["scripts/store-fixture.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    target: "es2022",
  });
  const { createStoreBackup } = await import(
    `data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`
  );
  await writeFile(`${profile}/fixture.json`, await createStoreBackup());
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
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.setFixedTime(new Date("2026-11-18T05:00:00Z"));
  await page.setViewportSize({ width: 400, height: 600 });
  await page.goto(`chrome-extension://${id}/popup.html`);
  // The policy is available before unlocking and never loads remote content.
  const policyPromise = context.waitForEvent("page");
  await page.getByRole("link", { name: /Chính sách bảo mật/ }).click();
  const policy = await policyPromise;
  const policyRequests = [];
  policy.on("request", (request) => {
    if (/^https?:/.test(request.url())) policyRequests.push(request.url());
  });
  await policy.waitForLoadState();
  await expect(policy.locator("h1")).toHaveText("Chính sách bảo mật");
  await expect(policy.locator(".privacy-section")).toHaveCount(7);
  await policy.getByRole("button", { name: "EN", exact: true }).click();
  await expect(policy.locator("h1")).toHaveText("Privacy policy");
  await policy.getByRole("button", { name: "VI", exact: true }).click();
  await policy.setViewportSize({ width: 1000, height: 800 });
  await mkdir("test-results", { recursive: true });
  await policy.screenshot({
    path: "test-results/privacy-page.png",
    fullPage: true,
  });
  await policy.setViewportSize({ width: 320, height: 650 });
  expect(
    await policy.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await policy.getByRole("link", { name: /Sao lưu và bản nháp/ }).click();
  await expect(policy).toHaveURL(/#backup$/);
  expect(policyRequests).toEqual([]);
  await policy.close();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("abc123");
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill("abc123");
  await page.getByRole("button", { name: "Lịch nhắc", exact: true }).click();
  await expect(page.locator(".calendar-overview strong")).toHaveText([
    "0",
    "0",
    "0",
  ]);
  await expect(page.locator(".month-agenda")).toContainText(
    "Tháng này không có dịch vụ đến hạn.",
  );
  await page.getByRole("button", { name: "Thêm dịch vụ", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("tab", { name: "Dữ liệu", exact: true }).click();
  await page.getByLabel("Mật khẩu file sao lưu").fill("store-assets-fixture");
  await page
    .locator('input[type="file"]')
    .setInputFiles(`${profile}/fixture.json`);
  await page
    .getByRole("button", { name: "Xác nhận nhập", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const checkBars = async () => {
    const bars = page.locator(".week-bars");
    expect(
      await bars.evaluate((element) => {
        const columns = [...element.querySelectorAll(".week-column")];
        const tracks = columns.map((column) =>
          column.querySelector(".bar-track").getBoundingClientRect(),
        );
        const labels = columns.map((column) =>
          column.querySelector("small").getBoundingClientRect(),
        );
        return (
          tracks.every(
            (track) =>
              Math.abs(track.top - tracks[0].top) < 1 &&
              Math.abs(track.height - 85) < 1,
          ) &&
          labels.every(
            (label) =>
              Math.abs(label.top - labels[0].top) < 1 && label.height <= 19,
          ) &&
          columns.every(
            (column) =>
              column.querySelector("strong").textContent !== "0" ||
              column.querySelector(".bar-track span").getBoundingClientRect()
                .height === 0,
          )
        );
      }),
    ).toBe(true);
  };
  let stableLayout;
  for (const name of [
    "Tổng quan",
    "Thẻ của tôi",
    "Dịch vụ",
    "Lịch nhắc",
    "Cài đặt",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    const layout = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.getBoundingClientRect().height,
      appWidth: document.querySelector(".app").getBoundingClientRect().width,
      navWidth: document.querySelector(".bottom-nav").getBoundingClientRect()
        .width,
    }));
    if (stableLayout) expect(layout).toEqual(stableLayout);
    else stableLayout = layout;
    expect(layout.height).toBe(600);
    if (name === "Tổng quan") {
      await checkBars();
      await page
        .locator(".chart-surface")
        .last()
        .evaluate((element) => element.scrollIntoView({ block: "center" }));
      await page
        .locator(".chart-surface")
        .last()
        .screenshot({ path: "test-results/dashboard-weeks.png" });
    }
  }
  await page.getByRole("tab", { name: "Dữ liệu", exact: true }).click();
  await expect(page.locator(".storage-summary strong")).toHaveText([
    "2",
    "5",
    "1",
  ]);
  await mkdir("test-results", { recursive: true });
  const checkStats = async () => {
    expect(
      await page.locator(".storage-summary").evaluate((el) => {
        const cells = [...el.children];
        return (
          cells.every((cell) => {
            const number = cell.querySelector("strong").getBoundingClientRect();
            const label = cell.querySelector("small").getBoundingClientRect();
            return (
              label.top - number.bottom >= 5 && label.width <= cell.clientWidth
            );
          }) &&
          cells[1].getBoundingClientRect().left -
            cells[0].getBoundingClientRect().right >=
            7
        );
      }),
    ).toBe(true);
  };
  await checkStats();
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await page.locator(".storage-summary").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/backup-stats-dark.png" });
  await page.getByRole("button", { name: "Lịch nhắc", exact: true }).click();
  await expect(page.locator(".calendar-overview strong")).toHaveText([
    "3",
    "2",
    "1",
  ]);
  await page.screenshot({
    path: "test-results/calendar-dark.png",
    fullPage: true,
  });
  await page.locator('.month-cell[data-date="2026-11-21"]').click();
  await expect(page.locator(".month-agenda .due-event")).toHaveCount(1);
  await expect(page.locator(".month-agenda")).toContainText("YouTube Premium");
  await page.getByRole("button", { name: "Cả tháng", exact: true }).click();
  await page
    .locator(".calendar-filters")
    .getByRole("button", { name: "Hết dùng thử", exact: true })
    .click();
  await expect(page.locator(".month-agenda .due-event")).toHaveCount(2);
  await expect(page.locator(".month-cell .has-events")).toHaveCount(2);
  await page
    .getByRole("searchbox", { name: "Tìm trong lịch" })
    .fill("CANVA.com");
  await expect(page.locator(".month-agenda .due-event")).toHaveCount(1);
  await expect(page.locator(".month-agenda")).toContainText("Canva");
  await page.getByRole("searchbox", { name: "Tìm trong lịch" }).fill("missing");
  await expect(page.locator(".month-agenda")).toContainText(
    "Không có lịch phù hợp với bộ lọc.",
  );
  await page.getByRole("button", { name: "Xóa tìm kiếm", exact: true }).click();
  await page
    .locator(".calendar-filters")
    .getByRole("button", { name: "Tất cả", exact: true })
    .click();
  await page.getByRole("button", { name: "Tháng sau", exact: true }).click();
  await expect(page.locator(".calendar-overview strong")).toHaveText([
    "3",
    "0",
    "3",
  ]);
  await page.getByRole("button", { name: "Tháng này", exact: true }).click();
  await expect(page.locator(".month-agenda .due-event")).toHaveCount(3);
  await page.locator('.month-cell[data-date="2026-11-21"]').focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.locator(".month-agenda")).toContainText("Netflix");
  await page.locator(".month-agenda .due-event").click();
  await expect(page.getByRole("dialog")).toContainText("Netflix");
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByRole("button", { name: "Cả tháng", exact: true }).click();
  await page.evaluate(() => (document.documentElement.dataset.theme = "light"));
  await page.screenshot({
    path: "test-results/calendar-light.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 650 });
  await page.evaluate(() => document.body.classList.remove("popup"));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/calendar-narrow.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("tab", { name: "Dữ liệu", exact: true }).click();
  await checkStats();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 880, height: 900 });
  await page.getByRole("button", { name: "Lịch nhắc", exact: true }).click();
  await page.screenshot({
    path: "test-results/calendar-wide.png",
    fullPage: true,
  });
  await page.evaluate(() =>
    chrome.storage.local.set({ uiLanguage: "en", uiTextSize: "large" }),
  );
  await expect(page.locator(".calendar-hero h1")).toHaveText("Calendar");
  await page.setViewportSize({ width: 320, height: 650 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/calendar-english-large.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await checkBars();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Data", exact: true }).click();
  await checkStats();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    "Calendar and backup UI passed: empty state, add/open service, counts, filters/search, month navigation, keyboard selection, dark/light, 320/400/880px, English/large text, stable popup dimensions, aligned dashboard bars, local privacy page and separated backup statistics.",
  );
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
