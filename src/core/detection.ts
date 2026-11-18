import { z } from "zod";
import { domainSchema } from "./schema";
export type DetectionInput = { pathname: string; labels: string[] };
export type DetectionResult = {
  confidence: "low" | "medium" | "high";
  kind: "trial" | "payment";
  trialDays: 3 | 7 | 14 | 30 | null;
};
export interface DetectionAdapter {
  id: string;
  detect(input: DetectionInput): DetectionResult | null;
}
// Generic, conservative adapter. No claim that a platform-specific flow has completed.
const generic: DetectionAdapter = {
  id: "generic-v1",
  detect({ pathname, labels }) {
    const path =
      /\/(?:billing|payments?|subscriptions?|checkout|trial)(?:\/|$)/i.test(
        pathname,
      );
    const text = labels
      .slice(0, 30)
      .map((x) => x.slice(0, 160))
      .join(" ")
      .toLowerCase();
    const trial =
      /(?:free trial|start.{0,12}trial|dùng thử|trial period)/i.test(text);
    const payment =
      /(?:add.{0,20}(?:card|payment method)|payment method|thêm.{0,12}thẻ|phương thức thanh toán)/i.test(
        text,
      );
    if (!path && !(trial && payment)) return null;
    if (!trial && !payment)
      return { confidence: "low", kind: "payment", trialDays: null };
    const match = text.match(
      /\b(3|7|14|30)[ -]day.{0,12}(?:free )?trial|(?:dùng thử).{0,12}\b(3|7|14|30)\s*ngày/i,
    );
    return {
      confidence: path && trial && payment ? "high" : "medium",
      kind: trial ? "trial" : "payment",
      trialDays: match
        ? (Number(match[1] ?? match[2]) as 3 | 7 | 14 | 30)
        : null,
    };
  },
};
export const adapters: DetectionAdapter[] = [generic];
export function detect(input: DetectionInput): DetectionResult | null {
  return adapters.map((a) => a.detect(input)).find(Boolean) ?? null;
}
export const signalSchema = z
  .object({
    type: z.literal("DETECTION"),
    domain: domainSchema,
    confidence: z.enum(["medium", "high"]),
    kind: z.enum(["trial", "payment", "card"]),
    trialDays: z.union([
      z.literal(3),
      z.literal(7),
      z.literal(14),
      z.literal(30),
      z.null(),
    ]),
  })
  .strict();
export type DetectionSignal = z.infer<typeof signalSchema>;
export function originPattern(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    throw new Error(
      "Dùng origin HTTPS, không kèm cổng hoặc thông tin đăng nhập.",
    );
  domainSchema.parse(url.hostname);
  return `${url.origin}/*`;
}
export async function grantDetection(
  origin: string,
  api: Pick<typeof chrome.permissions, "request">,
): Promise<boolean> {
  return api.request({ origins: [originPattern(origin)] });
}

// Optional broad access is requested only from an explicit settings action.
export const ALL_HTTPS_SITES = "https://*/*";
export function grantAllSites(
  api: Pick<typeof chrome.permissions, "request">,
): Promise<boolean> {
  return api.request({ origins: [ALL_HTTPS_SITES] });
}
export function isDetectionOrigin(pattern: string): boolean {
  if (pattern === ALL_HTTPS_SITES) return true;
  try {
    return originPattern(pattern) === pattern;
  } catch {
    return false;
  }
}

export type CardFieldAttributes = {
  autocomplete: string | null;
  name: string | null;
  id: string | null;
  type: string;
};
// Match field metadata only. Never inspect the text typed by the user.
export function isCardNumberField(field: CardFieldAttributes): boolean {
  if (!["text", "tel", "number"].includes(field.type)) return false;
  const tokens = (field.autocomplete ?? "").toLowerCase().split(/\s+/);
  if (tokens.includes("cc-number")) return true;
  if (tokens.some((token) => token.startsWith("cc-"))) return false;
  return [field.name, field.id].some((attribute) =>
    /^(?:card[-_ ]?(?:number|no)|cc[-_ ]?(?:number|no)|credit[-_ ]?card[-_ ]?number)$/i.test(
      attribute ?? "",
    ),
  );
}
