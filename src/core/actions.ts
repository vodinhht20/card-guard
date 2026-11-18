import {
  cardSchema,
  subscriptionSchema,
  recordHistory,
  vaultSchema,
  type PaymentCard,
  type Subscription,
  type Vault,
} from "./schema";
export function saveCard(v: Vault, input: PaymentCard): Vault {
  const next = structuredClone(v),
    card = cardSchema.parse(input);
  const index = next.cards.findIndex((c) => c.id === card.id);
  if (index < 0) next.cards.push(card);
  else next.cards[index] = card;
  recordHistory(next, "card_saved", card.id);
  return vaultSchema.parse(next);
}
export function deleteCard(v: Vault, id: string): Vault {
  const next = structuredClone(v);
  if (next.subscriptions.some((s) => s.cardId === id))
    throw new Error(
      "Thẻ còn liên kết dịch vụ. Hãy gỡ liên kết hoặc lưu trữ thẻ.",
    );
  next.cards = next.cards.filter((c) => c.id !== id);
  recordHistory(next, "card_deleted", id);
  return vaultSchema.parse(next);
}
export function saveService(v: Vault, input: Subscription): Vault {
  const next = structuredClone(v),
    service = subscriptionSchema.parse(input);
  const index = next.subscriptions.findIndex((s) => s.id === service.id);
  if (index < 0) next.subscriptions.push(service);
  else next.subscriptions[index] = service;
  recordHistory(next, "service_saved", service.id);
  return vaultSchema.parse(next);
}
export function deleteService(v: Vault, id: string): Vault {
  const next = structuredClone(v);
  next.subscriptions = next.subscriptions.filter((s) => s.id !== id);
  recordHistory(next, "service_deleted", id);
  return vaultSchema.parse(next);
}
export function updateService(
  v: Vault,
  id: string,
  patch: Partial<
    Pick<Subscription, "status" | "cardRemoved" | "trialEnd" | "renewalDate">
  >,
): Vault {
  const service = v.subscriptions.find((s) => s.id === id);
  if (!service) throw new Error("Không tìm thấy dịch vụ.");
  return saveService(v, {
    ...service,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}
