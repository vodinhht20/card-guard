import { seal } from "../src/core/crypto";
import { emptyVault, newId, type Subscription } from "../src/core/schema";
export async function createStoreBackup() {
  const vault = emptyVault(),
    now = "2026-11-18T05:00:00.000Z";
  vault.cards = [
    {
      id: newId(),
      nickname: "Everyday",
      network: "visa",
      last4: "1234",
      color: "blue",
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: newId(),
      nickname: "Online",
      network: "mastercard",
      last4: "9087",
      color: "violet",
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
  ];
  const services: [string, string, Subscription["status"], string, string][] = [
    ["Netflix", "netflix.com", "active", "2026-11-22", "259000"],
    ["YouTube Premium", "youtube.com", "trial", "2026-11-21", ""],
    ["Canva", "canva.com", "trial", "2026-11-30", ""],
    ["Spotify", "spotify.com", "active", "2026-12-03", "59000"],
    ["ChatGPT", "chatgpt.com", "active", "2026-12-01", "20"],
  ];
  vault.subscriptions = services.map(
    ([name, domain, status, date, amount], i) => ({
      id: newId(),
      name,
      domain,
      status,
      trialEnd: status === "trial" ? date : null,
      renewalDate: status === "trial" ? null : date,
      recurrence: status === "trial" ? "none" : "monthly",
      cardId: vault.cards[i % 2].id,
      amount,
      currency: name === "ChatGPT" ? "USD" : "VND",
      billingUrl: "",
      cardRemoved: false,
      notes: "",
      createdAt: now,
      updatedAt: now,
    }),
  );
  return JSON.stringify(await seal(vault, "store-assets-fixture"));
}
