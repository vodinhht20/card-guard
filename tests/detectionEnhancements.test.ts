import { describe, expect, it, vi } from "vitest";
import {
  ALL_HTTPS_SITES,
  grantAllSites,
  isDetectionOrigin,
  isCardNumberField,
  signalSchema,
} from "../src/core/detection";
const field = (attributes = {}) => ({
  type: "text",
  autocomplete: null,
  name: null,
  id: null,
  ...attributes,
});
describe("card field metadata recognition", () => {
  it.each(["cc-number", "section-checkout billing cc-number", "CC-NUMBER"])(
    "recognizes %s without payment values",
    (autocomplete) => {
      expect(isCardNumberField(field({ autocomplete }))).toBe(true);
    },
  );
  it.each([
    "cardnumber",
    "card-number",
    "card_number",
    "cc-number",
    "creditCardNumber",
    "cardNo",
  ])("recognizes exact field identity %s", (name) => {
    expect(isCardNumberField(field({ name }))).toBe(true);
    expect(isCardNumberField(field({ id: name, type: "tel" }))).toBe(true);
  });
  it.each(["cc-csc", "cc-exp", "cc-name", "email"])(
    "rejects unrelated autocomplete %s",
    (autocomplete) => {
      expect(isCardNumberField(field({ autocomplete }))).toBe(false);
    },
  );
  it("does not mistake passwords, hidden fields, expiry, CVV, unrelated numeric fields or fuzzy names for card numbers", () => {
    for (const type of ["password", "hidden", "email", "submit", "date"])
      expect(
        isCardNumberField(field({ type, autocomplete: "cc-number" })),
      ).toBe(false);
    for (const name of [
      "number",
      "cvv",
      "cardholder",
      "card-number-error",
      "phone",
      "cardExpiry",
    ])
      expect(isCardNumberField(field({ name }))).toBe(false);
    expect(
      isCardNumberField(field({ name: "cardNumber", autocomplete: "cc-csc" })),
    ).toBe(false);
    expect(isCardNumberField(field())).toBe(false);
  });
  it("accepts only allowlisted metadata signals and rejects captured card values", () => {
    const signal = {
      type: "DETECTION",
      domain: "example.com",
      confidence: "high",
      kind: "card",
      trialDays: null,
    };
    expect(signalSchema.safeParse(signal).success).toBe(true);
    expect(signalSchema.safeParse({ ...signal, last4: "4567" }).success).toBe(
      false,
    );
    expect(
      signalSchema.safeParse({ ...signal, value: "synthetic-secret" }).success,
    ).toBe(false);
  });
});
describe("optional broad site permissions", () => {
  it.each([true, false])(
    "returns the browser permission decision %s",
    async (granted) => {
      const request = vi.fn(async () => granted);
      expect(await grantAllSites({ request })).toBe(granted);
      expect(request).toHaveBeenCalledExactlyOnceWith({
        origins: [ALL_HTTPS_SITES],
      });
    },
  );
  it("propagates browser failures without granting access", async () => {
    await expect(
      grantAllSites({
        request: vi.fn().mockRejectedValue(new Error("permission failed")),
      }),
    ).rejects.toThrow("permission failed");
  });
  it("supports broad HTTPS and explicit origins without accepting other match patterns", () => {
    for (const pattern of [ALL_HTTPS_SITES, "https://example.com/*"])
      expect(isDetectionOrigin(pattern)).toBe(true);
    for (const pattern of [
      "<all_urls>",
      "http://*/*",
      "file:///*",
      "https://*.example.com/*",
      "https://example.com/path",
      "invalid",
    ])
      expect(isDetectionOrigin(pattern)).toBe(false);
  });
});
