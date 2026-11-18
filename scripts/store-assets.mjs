import { chromium, expect } from "@playwright/test";
import { build } from "esbuild";
import {
  mkdtemp,
  rm,
  mkdir,
  readFile,
  writeFile,
  copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { choose } from "./browser-helpers.mjs";
const out = "release/store-assets",
  profile = await mkdtemp(`${tmpdir()}/cardguard-store-`),
  extension = resolve("dist");
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
const context = await chromium.launchPersistentContext(profile, {
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
const views = [
  {
    id: "overview",
    vi: "Tổng quan",
    en: "Overview",
    title: {
      vi: "Thẻ & dịch vụ.\nTrong tầm tay.",
      en: "Cards & services.\nAt a glance.",
    },
    detail: {
      vi: "Theo dõi những lần gia hạn sắp tới.",
      en: "Keep upcoming renewals in view.",
    },
  },
  {
    id: "cards",
    vi: "Thẻ của tôi",
    en: "My cards",
    title: {
      vi: "Gọn từng thẻ.\nRõ từng liên kết.",
      en: "Your cards.\nClearly connected.",
    },
    detail: {
      vi: "Nhận biết bằng 4 số cuối.",
      en: "Identify cards by their last 4 digits.",
    },
  },
  {
    id: "calendar",
    vi: "Lịch nhắc",
    en: "Calendar",
    title: {
      vi: "Biết trước hạn.\nChủ động hơn.",
      en: "See what’s due.\nStay in control.",
    },
    detail: {
      vi: "Lịch tháng & danh sách 30 ngày.",
      en: "Monthly calendar & a 30-day agenda.",
    },
  },
  {
    id: "settings",
    vi: "Cài đặt",
    en: "Settings",
    title: {
      vi: "Hiển thị rõ.\nThao tác gọn.",
      en: "Easy to read.\nSimple to use.",
    },
    detail: {
      vi: "Tùy chọn chữ, giao diện và bảo mật.",
      en: "Choose your text size, theme and security.",
    },
  },
  {
    id: "unlock",
    title: {
      vi: "Mở khóa nhanh.\nDữ liệu ở lại.",
      en: "Unlock simply.\nKeep data local.",
    },
    detail: {
      vi: "6 ký tự. Ghi nhớ phiên tùy chọn.",
      en: "6 characters. Optional remembered sessions.",
    },
  },
];
const shots = { vi: {}, en: {} };
let page;
const noVietnamese = async (p) => {
  // React Aria keeps the previous locale's transient announcement in a body-level live log.
  // Check the current app and its portals, including form/dialog copy.
  const content = (
    await p.locator("#root, .modal-overlay, .control-popover").allInnerTexts()
  )
    .join(" ")
    .replaceAll("Tiếng Việt", "");
  expect(content).not.toMatch(/[À-ỹĐđ]/);
};
try {
  const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker")),
    id = new URL(worker.url()).host;
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  await page.setViewportSize({ width: 400, height: 600 });
  await page.clock.setFixedTime(new Date("2026-11-18T05:00:00Z"));
  const errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  context.on("request", (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await page.goto(`chrome-extension://${id}/popup.html`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("abc123");
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill("abc123");
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
  for (const lang of ["vi", "en"]) {
    await mkdir(`${out}/${lang}`, { recursive: true });
    if (lang === "en") {
      await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
      await page.getByRole("tab", { name: "Giao diện", exact: true }).click();
      await choose(page, "Ngôn ngữ", "English");
      await page
        .getByRole("button", { name: "Lưu cài đặt", exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    }
    for (const view of views.filter((v) => v.id !== "unlock")) {
      await page.getByRole("button", { name: view[lang], exact: true }).click();
      const toast = page.getByRole("button", {
        name: lang === "en" ? "Dismiss message" : "Đóng thông báo",
        exact: true,
      });
      if (await toast.isVisible()) await toast.click();
      if (view.id === "calendar") {
        await choose(
          page,
          lang === "en" ? "Month" : "Tháng",
          lang === "en" ? "December" : "Tháng 12",
        );
      }
      if (view.id === "calendar")
        await page
          .locator(".month-section")
          .evaluate((el) => el.scrollIntoView({ block: "start" }));
      if (lang === "en") await noVietnamese(page);
      expect(
        await page
          .locator("body")
          .evaluate((el) => getComputedStyle(el).fontSize),
      ).toBe("16px");
      // No horizontal overflow at the primary popup width.
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      shots[lang][view.id] = await page.screenshot();
    }
    await page
      .getByRole("button", {
        name: lang === "en" ? "Settings" : "Cài đặt",
        exact: true,
      })
      .click();
    if (lang === "en") {
      for (const tab of ["Security", "Reminders", "Data", "Website"]) {
        await page.getByRole("tab", { name: tab, exact: true }).click();
        await noVietnamese(page);
      }
      await page.getByRole("button", { name: "My cards", exact: true }).click();
      await page.getByRole("button", { name: "Add card", exact: true }).click();
      await expect(page.getByLabel("Last 4 digits")).toBeVisible();
      await noVietnamese(page);
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("button", { name: "Calendar", exact: true }).click();
      await choose(page, "Month", "December");
      await noVietnamese(page);
      await page.getByRole("button", { name: "Settings", exact: true }).click();
    }
    await page
      .getByRole("button", {
        name: lang === "en" ? "Lock now" : "Khóa ngay",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: lang === "en" ? "Unlock" : "Mở khóa",
        exact: true,
      }),
    ).toBeVisible();
    if (lang === "en") await noVietnamese(page);
    shots[lang].unlock = await page.screenshot();
    await page
      .getByLabel(lang === "en" ? "Password" : "Mật khẩu", { exact: true })
      .fill("abc123");
    await expect(
      page.getByRole("button", {
        name: lang === "en" ? "Settings" : "Cài đặt",
        exact: true,
      }),
    ).toBeVisible();
  }
  // Reminder configuration has only selectable offsets and persists through a reload.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Reminders", exact: true }).click();
  await expect(
    page.locator('.settings-tab-panel input:not([type="checkbox"])'),
  ).toHaveCount(0);
  const offset = page
    .locator(".reminder-presets button")
    .filter({ hasText: /^14 days$/ });
  await expect(offset).toHaveAttribute("aria-pressed", "false");
  await offset.click();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page.reload();
  await page.getByLabel("Password", { exact: true }).fill("abc123");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Reminders", exact: true }).click();
  await expect(offset).toHaveAttribute("aria-pressed", "true");
  // Preference persists on the lock screen and after popup destruction; large text has one inherited body size.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Appearance", exact: true }).click();
  await choose(page, "Text size", "Larger");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect
    .poll(() =>
      page.locator("body").evaluate((el) => getComputedStyle(el).fontSize),
    )
    .toBe("18px");
  // Reproduce the reported large-font layout at popup and narrow side-panel widths.
  await choose(page, "Appearance", "Dark");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  const side = await context.newPage();
  await side.goto(`chrome-extension://${id}/sidepanel.html`);
  await side.getByLabel("Password", { exact: true }).fill("abc123");
  await side.getByRole("button", { name: "Settings", exact: true }).click();
  for (const language of ["vi", "en"])
    for (const size of ["comfortable", "large"])
      for (const width of [320, 400]) {
        await side.setViewportSize({ width, height: 600 });
        await side.evaluate(
          async ({ language, size }) => {
            await chrome.storage.local.set({
              uiLanguage: language,
              uiTextSize: size,
            });
          },
          { language, size },
        );
        await expect(side.locator("html")).toHaveAttribute("lang", language);
        await expect(side.locator("html")).toHaveAttribute(
          "data-text-size",
          size,
        );
        const problems = await side.evaluate(() => {
          const errors = [];
          if (document.documentElement.scrollWidth > innerWidth)
            errors.push("horizontal overflow");
          for (const label of document.querySelectorAll(
            ".bottom-nav button span,.settings-tab span",
          )) {
            const r = label.getBoundingClientRect(),
              p = label.parentElement.getBoundingClientRect();
            if (r.left < p.left + 1 || r.right > p.right - 1)
              errors.push(label.textContent + ": overflow");
            if (r.height > parseFloat(getComputedStyle(label).lineHeight) + 2)
              errors.push(label.textContent + ": wrapped");
          }
          return errors;
        });
        expect(problems).toEqual([]);
        if (language === "vi" && size === "large")
          await side.screenshot({
            path: `test-results/large-dark-vi-${width}.png`,
          });
        await side
          .getByRole("button", {
            name: language === "vi" ? "Lịch nhắc" : "Calendar",
            exact: true,
          })
          .click();
        await expect(side.locator(".due-event").first()).toBeVisible();
        const calendarProblems = await side.evaluate(() => {
          const problems = [];
          if (document.documentElement.scrollWidth > innerWidth)
            problems.push("calendar overflow");
          for (const row of document.querySelectorAll(".due-event")) {
            const date = row.querySelector(".due-event-date"),
              info = row.querySelector(".due-event-info");
            const dr = date.getBoundingClientRect(),
              ir = info.getBoundingClientRect();
            if (dr.right >= ir.left) problems.push("date overlaps service");
            for (const child of date.children) {
              const r = child.getBoundingClientRect();
              if (
                r.left < dr.left ||
                r.right > dr.right ||
                child.scrollWidth > child.clientWidth + 1
              )
                problems.push("date text overflow");
            }
            if (info.scrollWidth > info.clientWidth + 1)
              problems.push("service text overflow");
          }
          return problems;
        });
        expect(calendarProblems).toEqual([]);
        if (language === "vi" && size === "large")
          await side.screenshot({
            path: `test-results/calendar-large-dark-vi-${width}.png`,
          });
        await side
          .getByRole("button", {
            name: language === "vi" ? "Cài đặt" : "Settings",
            exact: true,
          })
          .click();
      }
  await side.evaluate(async () => {
    await chrome.storage.local.set({ uiLanguage: "en", uiTextSize: "large" });
  });
  await side.close();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Lock now", exact: true }).click();
  await page.goto("about:blank");
  await page.goto(`chrome-extension://${id}/popup.html`);
  await expect(
    page.getByRole("heading", { name: "Unlock", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.locator("body").evaluate((el) => getComputedStyle(el).fontSize),
    )
    .toBe("18px");
  await page.getByLabel("Password", { exact: true }).fill("bad123");
  await expect(page.getByRole("alert")).toContainText("Unable to unlock");
  await noVietnamese(page);
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
  // Compose store artwork from real UI captures, rendered locally without remote fonts/assets.
  const artwork = await context.newPage();
  const icon = await readFile("assets/icon.svg", "utf8"),
    iconData = `data:image/svg+xml;base64,${Buffer.from(icon).toString("base64")}`;
  for (const lang of ["vi", "en"]) {
    for (const [i, view] of views.entries()) {
      await artwork.setViewportSize({ width: 1280, height: 800 });
      await artwork.setContent(
        `<style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#eff5ff;color:#17365b}.orb{position:absolute;right:-180px;top:-280px;width:850px;height:850px;border:100px solid #e1ecff;border-radius:50%}.brand{position:absolute;left:72px;top:62px;display:flex;align-items:center;gap:8px;font-size:28px;font-weight:700}.brand img{width:56px;height:56px}.copy{position:absolute;left:82px;top:245px;width:590px}h1{font-size:49px;letter-spacing:-2px;line-height:1.15;margin:0 0 24px;white-space:pre-line}p{font-size:22px;line-height:1.5;margin:0;max-width:520px;color:#506786}.demo{position:absolute;left:82px;bottom:67px;font-size:16px;color:#61758e}.frame{position:absolute;left:775px;top:100px;width:402px;height:602px;border-radius:20px;overflow:hidden;border:1px solid #d3e1f4;box-shadow:0 22px 65px #184c9226}.frame img{display:block;width:400px;height:600px}</style><div class="orb"></div><div class="brand"><img src="${iconData}">CardGuard</div><div class="copy"><h1>${view.title[lang]}</h1><p>${view.detail[lang]}</p></div><div class="demo">${lang === "vi" ? "Dữ liệu minh họa · Lưu trên thiết bị" : "Demo data · Stored on your device"}</div><div class="frame"><img src="data:image/png;base64,${shots[lang][view.id].toString("base64")}"></div>`,
      );
      await artwork.screenshot({
        path: `${out}/${lang}/${String(i + 1).padStart(2, "0")}-${view.id}-1280x800.png`,
      });
    }
    await artwork.setViewportSize({ width: 440, height: 280 });
    await artwork.setContent(
      `<style>body{margin:0;font-family:Arial,sans-serif;color:#fff;background:#215ac0}main{padding:26px 32px}img{width:68px;height:68px;filter:drop-shadow(0 4px 10px #123c8222)}h1{font-size:36px;letter-spacing:-1.5px;margin:12px 0 6px}p{font-size:20px;margin:0;line-height:1.4}</style><main><img src="${iconData}"><h1>CardGuard</h1><p>${lang === "vi" ? "Thẻ & lịch gia hạn" : "Cards & renewal reminders"}</p></main>`,
    );
    await artwork.screenshot({ path: `${out}/${lang}/promo-440x280.png` });
    await artwork.setViewportSize({ width: 1400, height: 560 });
    await artwork.setContent(
      `<style>body{margin:0;font-family:Arial,sans-serif;background:#eff5ff;color:#17365b}main{padding:50px 80px}.brand{display:flex;align-items:center;font-size:26px;font-weight:700;gap:8px}.brand img{width:52px;height:52px}h1{font-size:52px;letter-spacing:-2px;line-height:1.15;white-space:pre-line;margin:62px 0 22px}p{font-size:22px;color:#506786}.screen{position:absolute;right:170px;top:40px;width:320px;border:1px solid #d3e1f4;border-radius:18px;box-shadow:0 20px 65px #184c9226}</style><main><div class="brand"><img src="${iconData}">CardGuard</div><h1>${views[0].title[lang]}</h1><p>${views[0].detail[lang]}</p></main><img class="screen" src="data:image/png;base64,${shots[lang].overview.toString("base64")}">`,
    );
    await artwork.screenshot({ path: `${out}/${lang}/marquee-1400x560.png` });
  }
  for (const size of [16, 32, 48, 128])
    await copyFile(`public/icon${size}.png`, `${out}/icon${size}.png`);
  await copyFile("assets/icon.svg", `${out}/icon.svg`);
  console.log(
    "Store assets passed: VI/EN real UI captures, five 1280x800 screenshots per language, 440x280 promo, 1400x560 marquee, icons; language coverage, persistent 16/18px typography and VI/EN dark layouts at 320/400px verified.",
  );
} catch (error) {
  if (page) {
    await mkdir("test-results", { recursive: true });
    await page
      .screenshot({ path: "test-results/store-failure.png", fullPage: true })
      .catch(() => {});
    await writeFile(
      "test-results/store-failure.txt",
      await page
        .locator("body")
        .ariaSnapshot()
        .catch(() => ""),
    );
  }
  throw error;
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
}
