import { expect } from "@playwright/test";
const escape = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function field(page, label) {
  return page.locator(".field").filter({
    has: page
      .locator("label")
      .filter({ hasText: new RegExp(`^${escape(label)}$`) }),
  });
}
export async function choose(page, label, option) {
  const trigger = field(page, label).getByRole("button");
  const selected = await trigger.innerText();
  await trigger.click();
  await expect(trigger).toHaveText(selected);
  await page.getByRole("option", { name: option, exact: true }).click();
}
export async function setDate(page, label, value) {
  const [year, month, day] = value.split("-").map(Number);
  await field(page, label)
    .getByRole("button", { name: /^Mở lịch/ })
    .click();
  const calendar = page.locator(".calendar-dialog");
  const text = await calendar.locator(".calendar-heading").innerText(),
    numbers = text.match(/\d+/g)?.map(Number);
  if (!numbers || numbers.length < 2)
    throw new Error(`Calendar heading not recognized: ${text}`);
  const [currentMonth, currentYear] = numbers;
  const delta = (year - currentYear) * 12 + month - currentMonth;
  if (Math.abs(delta) > 120)
    throw new Error("Fixture date is too far from calendar focus");
  for (let i = 0; i < Math.abs(delta); i++)
    await calendar
      .getByRole("button", {
        name: delta > 0 ? "Tháng sau" : "Tháng trước",
        exact: true,
      })
      .click();
  await calendar
    .locator(".calendar-cell:visible")
    .filter({ hasText: new RegExp(`^${day}$`) })
    .click();
  await expectDate(page, label, value);
}
export async function expectDate(page, label, value) {
  const [year, month, day] = value.split("-").map(Number);
  await expect
    .poll(async () =>
      (await field(page, label).getByRole("spinbutton").allTextContents()).map(
        Number,
      ),
    )
    .toEqual([day, month, year]);
}
