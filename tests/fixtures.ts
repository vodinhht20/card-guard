import {
  emptyVault,
  newId,
  type PaymentCard,
  type Subscription,
} from "../src/core/schema";
export function card(patch: Partial<PaymentCard> = {}): PaymentCard {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    id: newId(),
    nickname: "Test wallet",
    network: "visa",
    first3: "123",
    last4: "4567",
    color: "mint",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}
export function service(patch: Partial<Subscription> = {}): Subscription {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    id: newId(),
    name: "Test service",
    domain: "example.com",
    cardId: null,
    status: "trial",
    trialEnd: "2026-11-25",
    renewalDate: null,
    recurrence: "none",
    amount: "99000",
    currency: "VND",
    billingUrl: "https://example.com/billing",
    cardRemoved: false,
    notes: "Synthetic fixture only",
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}
export function vaultFixture() {
  const v = emptyVault();
  const c = card();
  v.cards = [c];
  v.subscriptions = [service({ cardId: c.id })];
  return v;
}
