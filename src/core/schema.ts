import { z } from "zod";

// Free text is bounded and rejects card-number-shaped sequences, even with separators.
export const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (v) => !/(?:\d[ -]?){12,19}/.test(v),
      "Không nhập số thẻ đầy đủ hoặc dữ liệu bí mật.",
    );
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T12:00:00Z`);
    return (
      Number.isFinite(d.getTime()) &&
      d.toISOString().slice(0, 10) === v &&
      +v.slice(0, 4) >= 2000 &&
      +v.slice(0, 4) <= 2100
    );
  }, "Ngày không hợp lệ (2000–2100).");
export const httpsUrl = z
  .string()
  .max(2048)
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Chỉ chấp nhận URL HTTPS không có thông tin đăng nhập.");
export const domainSchema = z
  .string()
  .max(253)
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
    "Nhập domain, ví dụ example.com.",
  );
export const cardSchema = z
  .object({
    id: z.string().uuid(),
    nickname: text(60).pipe(z.string().min(1)),
    network: z.enum(["visa", "mastercard", "jcb", "other"]),
    first3: z
      .string()
      .regex(/^\d{3}$/)
      .optional(),
    last4: z.string().regex(/^\d{4}$/),
    color: z.enum(["mint", "blue", "violet"]).default("mint"),
    status: z.enum(["active", "archived"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const statusSchema = z.enum([
  "trial",
  "active",
  "expiring",
  "cancellation_pending",
  "cancelled",
  "expired",
  "archived",
]);
export const subscriptionFieldsSchema = z
  .object({
    id: z.string().uuid(),
    name: text(100).pipe(z.string().min(1)),
    domain: domainSchema,
    cardId: z.string().uuid().nullable(),
    status: statusSchema,
    trialEnd: dateOnly.nullable(),
    renewalDate: dateOnly.nullable(),
    recurrence: z.enum(["none", "monthly", "yearly"]),
    amount: z
      .string()
      .regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/)
      .or(z.literal("")),
    currency: z.enum(["VND", "USD", "EUR"]),
    billingUrl: httpsUrl,
    cardRemoved: z.boolean(),
    notes: text(1000),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const subscriptionSchema = subscriptionFieldsSchema
  .refine(
    (v) => v.recurrence === "none" || !!v.renewalDate,
    "Cần ngày gia hạn cho lịch định kỳ.",
  )
  .refine(
    (v) => v.status !== "trial" || !!v.trialEnd,
    "Cần ngày kết thúc dùng thử.",
  );
export const settingsSchema = z
  .object({
    autoLockMinutes: z.number().int().min(0).max(60),
    rememberDays: z.number().int().min(1).max(14).default(7),
    textSize: z.enum(["comfortable", "large"]).default("comfortable"),
    dashboardChart: z.boolean().default(true),
    reminderDays: z
      .array(z.number().int().min(0).max(30))
      .min(1)
      .max(10)
      .refine((v) => new Set(v).size === v.length),
    theme: z.enum(["light", "dark", "system"]),
    language: z.enum(["vi", "en"]),
  })
  .strict();
export const vaultSchema = z
  .object({
    schemaVersion: z.literal(1),
    cards: z.array(cardSchema).max(2000),
    subscriptions: z.array(subscriptionSchema).max(5000),
    settings: settingsSchema,
    history: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            at: z.string().datetime(),
            action: z.enum([
              "card_saved",
              "card_deleted",
              "service_saved",
              "service_deleted",
              "imported",
              "settings_saved",
            ]),
            recordId: z.string().uuid().nullable(),
          })
          .strict(),
      )
      .max(500),
  })
  .strict()
  .superRefine((v, ctx) => {
    for (const list of [v.cards, v.subscriptions]) {
      if (new Set(list.map((x) => x.id)).size !== list.length)
        ctx.addIssue({ code: "custom", message: "Trùng ID." });
    }
    const cards = new Set(v.cards.map((c) => c.id));
    if (v.subscriptions.some((s) => s.cardId && !cards.has(s.cardId)))
      ctx.addIssue({ code: "custom", message: "Liên kết thẻ không tồn tại." });
  });
export type PaymentCard = z.infer<typeof cardSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type Vault = z.infer<typeof vaultSchema>;
export type Settings = Vault["settings"];
export const emptyVault = (): Vault => ({
  schemaVersion: 1,
  cards: [],
  subscriptions: [],
  history: [],
  settings: {
    autoLockMinutes: 5,
    rememberDays: 7,
    textSize: "comfortable",
    dashboardChart: true,
    reminderDays: [7, 3, 1, 0],
    theme: "system",
    language: "vi",
  },
});
export const newId = () => crypto.randomUUID();
export function recordHistory(
  v: Vault,
  action: Vault["history"][number]["action"],
  recordId: string | null = null,
) {
  v.history = [
    ...v.history,
    { id: newId(), at: new Date().toISOString(), action, recordId },
  ].slice(-500);
}
