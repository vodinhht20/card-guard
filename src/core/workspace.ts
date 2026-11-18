import { z } from "zod";
import {
  cardSchema,
  dateOnly,
  subscriptionFieldsSchema,
  subscriptionSchema,
  text,
  newId,
  type PaymentCard,
  type Subscription,
  type Vault,
  domainSchema,
} from "./schema";
import { signalSchema } from "./detection";
import { decode, encode } from "./crypto";
const cardDraftSchema = cardSchema.extend({
  nickname: text(60),
  first3: z.string().max(3).optional(),
  last4: z.string().max(4),
});
const serviceDraftSchema = subscriptionFieldsSchema.extend({
  name: text(100),
  domain: text(2048),
  amount: text(12),
  billingUrl: text(2048),
});
const dialogSchema = z
  .union([
    z.object({ type: z.literal("card"), card: cardSchema.optional() }).strict(),
    z
      .object({
        type: z.literal("service"),
        service: subscriptionSchema.optional(),
        suggestion: signalSchema.optional(),
      })
      .strict(),
    z.object({ type: z.literal("card-detail"), card: cardSchema }).strict(),
    z
      .object({
        type: z.literal("service-detail"),
        service: subscriptionSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("delete"),
        kind: z.enum(["card", "service"]),
        id: z.string().uuid(),
      })
      .strict(),
  ])
  .nullable();
export const workspaceSchema = z
  .object({
    page: z.enum(["dashboard", "cards", "services", "calendar", "settings"]),
    dialog: dialogSchema,
    calendarMonth: z
      .string()
      .refine((v) => dateOnly.safeParse(`${v}-01`).success)
      .nullable()
      .default(null),
    calendarDay: dateOnly.nullable().default(null),
    query: text(253),
    filter: z.string().max(30),
    cardDraft: cardDraftSchema.nullable(),
    serviceDraft: serviceDraftSchema.nullable(),
    serviceEntryMode: z.enum(["choose", "preset", "manual"]).default("manual"),
    serviceSearch: text(100).default(""),
    advanced: z.boolean(),
    preview: z.boolean(),
  })
  .strict();
export type WorkspaceSnapshot = z.infer<typeof workspaceSchema>;
export type WorkspaceDialog = WorkspaceSnapshot["dialog"];
const protectedWorkspaceSchema = z
  .object({
    version: z.literal(1),
    iv: z.string().length(16),
    ciphertext: z.string().max(100_000),
    vaultVersion: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type ProtectedWorkspace = z.infer<typeof protectedWorkspaceSchema>;
const aad = (salt: string, version: string) =>
  new TextEncoder().encode(`CardGuard|workspace|v1|${salt}|${version}`);
export async function encryptWorkspace(
  input: WorkspaceSnapshot,
  key: CryptoKey,
  salt: string,
  vaultVersion: string,
): Promise<ProtectedWorkspace> {
  const state = workspaceSchema.parse(input),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(salt, vaultVersion) },
    key,
    new TextEncoder().encode(JSON.stringify(state)),
  );
  return {
    version: 1,
    iv: encode(iv),
    ciphertext: encode(new Uint8Array(ciphertext)),
    vaultVersion,
  };
}
export async function decryptWorkspace(
  input: unknown,
  key: CryptoKey,
  salt: string,
  vaultVersion: string,
): Promise<WorkspaceSnapshot | null> {
  const envelope = protectedWorkspaceSchema.parse(input);
  if (envelope.vaultVersion !== vaultVersion) return null;
  const bytes = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: decode(envelope.iv),
      additionalData: aad(salt, vaultVersion),
    },
    key,
    decode(envelope.ciphertext),
  );
  return workspaceSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
}
export function emptyWorkspace(): WorkspaceSnapshot {
  return {
    page: "dashboard",
    dialog: null,
    calendarMonth: null,
    calendarDay: null,
    query: "",
    filter: "all",
    cardDraft: null,
    serviceDraft: null,
    serviceEntryMode: "choose",
    serviceSearch: "",
    advanced: false,
    preview: false,
  };
}
export function newCardDraft(): PaymentCard {
  const now = new Date().toISOString();
  return {
    id: newId(),
    nickname: "",
    network: "visa",
    last4: "",
    color: "blue",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}
export function newServiceDraft(
  vault: Vault,
  suggestion?: z.infer<typeof signalSchema>,
): Subscription {
  const now = new Date().toISOString(),
    active = vault.cards.filter((c) => c.status === "active");
  return {
    id: newId(),
    name: "",
    domain: suggestion?.domain ?? "",
    cardId: active.length === 1 ? active[0].id : null,
    status: suggestion?.kind === "trial" ? "trial" : "active",
    trialEnd: null,
    renewalDate: null,
    recurrence: "none",
    amount: "",
    currency: "VND",
    billingUrl: "",
    notes: "",
    cardRemoved: false,
    createdAt: now,
    updatedAt: now,
  };
}
export function prepareQuickCard(input: PaymentCard): PaymentCard {
  const { first3: legacyFirst3, ...card } = input;
  return cardSchema.parse({
    ...card,
    nickname:
      input.nickname.trim() ||
      `${input.network.toUpperCase()} • ${input.last4}`,
    updatedAt: new Date().toISOString(),
  });
}
export function prepareQuickService(input: Subscription): Subscription {
  let domain = input.domain.trim().toLowerCase();
  if (domain.includes("://")) {
    const u = new URL(domain);
    if (u.protocol !== "https:" || u.username || u.password || u.port)
      throw new Error("Chỉ nhập website HTTPS.");
    domain = u.hostname;
  }
  domain = domainSchema.parse(domain);
  return subscriptionSchema.parse({
    ...input,
    domain,
    name: input.name.trim() || domain,
    updatedAt: new Date().toISOString(),
  });
}
