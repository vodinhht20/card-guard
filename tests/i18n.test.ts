import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import * as ts from "typescript";
import { en, translator } from "../src/ui/i18n";
import {
  detectionCopy,
  notificationCopy,
  readLanguage,
} from "../src/core/locale";
describe("Vietnamese and English interface", () => {
  it("translates every static Vietnamese UI phrase, including errors and accessibility labels", () => {
    const missing = new Set<string>();
    for (const file of readdirSync("src/ui").filter(
      (f) => /\.tsx?$/.test(f) && f !== "i18n.ts",
    )) {
      const source = ts.createSourceFile(
        file,
        readFileSync(`src/ui/${file}`, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      const visit = (node: ts.Node) => {
        if (
          ts.isStringLiteral(node) &&
          /[À-ỹĐđ]/.test(node.text) &&
          !en[node.text]
        )
          missing.add(node.text);
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect([...missing]).toEqual([]);
  });
  it("routes interpolated Vietnamese text through the translator", () => {
    const missing: string[] = [];
    for (const file of readdirSync("src/ui").filter((f) =>
      f.endsWith(".tsx"),
    )) {
      const source = ts.createSourceFile(
        file,
        readFileSync(`src/ui/${file}`, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      const visit = (node: ts.Node) => {
        if (
          ts.isTemplateExpression(node) &&
          /[À-ỹĐđ]/.test(
            [
              node.head.text,
              ...node.templateSpans.map((v) => v.literal.text),
            ].join(""),
          ) &&
          !(
            ts.isCallExpression(node.parent) &&
            node.parent.expression.getText(source) === "t"
          )
        )
          missing.push(file + ":" + node.getText(source));
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(missing).toEqual([]);
  });
  it("formats numeric labels and month/day navigation without translating user data", () => {
    const t = translator("en");
    expect(t("1 ngày")).toBe("1 day");
    expect(t("14 ngày")).toBe("14 days");
    expect(t("5 phút")).toBe("5 minutes");
    expect(t("Tuần 2")).toBe("Week 2");
    expect(t("Tháng 2")).toBe("February");
    expect(t("Ngày 01/12")).toBe("Date 12/01");
    expect(t("Trong tháng · 3")).toBe("This month · 3");
    expect(t("2 dịch vụ quá hạn")).toBe("2 overdue services");
    expect(t("Hết hạn 12/01/2026")).toBe("Expires 12/01/2026");
    expect(t("Netflix")).toBe("Netflix");
    expect(translator("vi")("Hiển thị")).toBe("Hiển thị");
  });
  it("accepts only known language preferences and localizes background/detector copy", () => {
    for (const value of [undefined, null, "fr", {}, 123, "vi"])
      expect(readLanguage(value)).toBe("vi");
    expect(readLanguage("en")).toBe("en");
    expect(notificationCopy("en").message).not.toMatch(/[À-ỹĐđ]/);
    expect(Object.values(detectionCopy("en")).join(" ")).not.toMatch(/[À-ỹĐđ]/);
    expect(notificationCopy("vi").snooze).toBe("Nhắc lại sau 1 giờ");
    expect(detectionCopy("vi").save).toBe("Lưu liên kết");
  });
});
