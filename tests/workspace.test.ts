import { describe, it, expect } from "vitest";
import { VaultSession } from "../src/core/repository";
import {
  emptyWorkspace,
  newCardDraft,
  newServiceDraft,
  prepareQuickCard,
  prepareQuickService,
  workspaceSchema,
} from "../src/core/workspace";
import { seal, open, validatePassword } from "../src/core/crypto";
import { emptyVault } from "../src/core/schema";
import { card, service, vaultFixture } from "./fixtures";
const exclusive = <T>(fn: () => Promise<T>) => fn();
function memory() {
  let data: unknown;
  return {
    read: async () => structuredClone(data),
    write: async (value: unknown) => {
      data = structuredClone(value);
    },
  };
}
describe("six-character password policy", () => {
  it("rejects 0–5 and over 256 characters, accepts exactly six and preserves older vaults", async () => {
    for (const value of ["", "12345", "x".repeat(257)])
      expect(() => validatePassword(value)).toThrow();
    const v = emptyVault();
    expect((await open(await seal(v, "abc123"), "abc123")).vault).toEqual(v);
    expect(
      (
        await open(
          await seal(v, "existing longer password"),
          "existing longer password",
        )
      ).vault,
    ).toEqual(v);
  });
});
describe("quick-create defaults and validation", () => {
  it("requires separate card fragments and makes nickname optional without mutating a draft", () => {
    const draft = { ...newCardDraft(), last4: "4567" };
    expect(prepareQuickCard(draft).nickname).toBe("VISA • 4567");
    expect(draft.nickname).toBe("");
    expect(prepareQuickCard({ ...draft, nickname: "My card" }).nickname).toBe(
      "My card",
    );
    expect(
      prepareQuickCard({ ...draft, first3: "123" }).first3,
    ).toBeUndefined();
    expect(newCardDraft()).not.toHaveProperty("first3");
    expect(() =>
      prepareQuickCard({ ...draft, last4: "1234567890123456" }),
    ).toThrow();
  });
  it("prefills a sole active card, keeps multiple choices explicit and never guesses trial dates", () => {
    const v = vaultFixture();
    expect(newServiceDraft(v).cardId).toBe(v.cards[0].id);
    v.cards.push(card());
    expect(newServiceDraft(v).cardId).toBeNull();
    v.cards.forEach((c) => (c.status = "archived"));
    expect(newServiceDraft(v).cardId).toBeNull();
    const suggested = newServiceDraft(v, {
      type: "DETECTION",
      domain: "example.com",
      kind: "trial",
      confidence: "high",
      trialDays: 7,
    });
    expect(suggested.trialEnd).toBeNull();
    expect(suggested.status).toBe("trial");
  });
  it("normalizes a domain/HTTPS URL, defaults name to domain and preserves advanced values", () => {
    const draft = {
      ...newServiceDraft(emptyVault()),
      domain: "https://Example.com/billing?source=manual",
      notes: "Test note",
    };
    const result = prepareQuickService(draft);
    expect(result.name).toBe("example.com");
    expect(result.domain).toBe("example.com");
    expect(result.notes).toBe("Test note");
    expect(result.billingUrl).toBe("");
    expect(prepareQuickService({ ...draft, name: "Custom" }).name).toBe(
      "Custom",
    );
    for (const domain of [
      "http://example.com",
      "https://user:pass@example.com",
      "https://example.com:8443",
      "not a domain",
    ])
      expect(() => prepareQuickService({ ...draft, domain })).toThrow();
    expect(() =>
      prepareQuickService({ ...draft, status: "trial", trialEnd: null }),
    ).toThrow();
  });
});
describe("encrypted workspace continuation (memory fakes only)", () => {
  it("restores incomplete forms/navigation after context closure and unlock without adding records", async () => {
    const storage = memory(),
      first = new VaultSession(storage, exclusive);
    await first.create("abc123");
    const snapshot = {
      ...emptyWorkspace(),
      page: "services" as const,
      dialog: { type: "card" as const },
      query: "Example",
      advanced: true,
      cardDraft: {
        ...newCardDraft(),
        nickname: "Unfinished private card",
        first3: "12",
        last4: "45",
      },
    };
    const protectedDraft = await first.protectWorkspace(snapshot);
    const json = JSON.stringify(protectedDraft);
    expect(json).not.toContain("Unfinished private card");
    expect(json).not.toContain("first3");
    expect(json).not.toContain("abc123");
    expect(Object.keys(protectedDraft).sort()).toEqual([
      "ciphertext",
      "iv",
      "vaultVersion",
      "version",
    ]);
    const pending = first.restoreWorkspace(protectedDraft);
    first.lock();
    await expect(pending).rejects.toThrow("Phiên đã khóa.");
    await expect(first.restoreWorkspace(protectedDraft)).rejects.toThrow();
    const reopened = new VaultSession(storage, exclusive);
    const vault = await reopened.unlock("abc123");
    expect(await reopened.restoreWorkspace(protectedDraft)).toEqual(snapshot);
    expect(vault.cards).toHaveLength(0);
    expect((await reopened.protectWorkspace(snapshot)).iv).not.toBe(
      protectedDraft.iv,
    );
  });
  it("rejects corrupted drafts and discards a draft after the vault changes", async () => {
    const storage = memory(),
      s = new VaultSession(storage, exclusive);
    const v = await s.create("abc123");
    const draft = await s.protectWorkspace({
      ...emptyWorkspace(),
      dialog: { type: "service" },
      serviceDraft: newServiceDraft(v),
    });
    await expect(
      s.restoreWorkspace({
        ...draft,
        ciphertext:
          (draft.ciphertext[0] === "A" ? "B" : "A") + draft.ciphertext.slice(1),
      }),
    ).rejects.toThrow();
    v.cards.push(card());
    await s.save(v);
    expect(await s.restoreWorkspace(draft)).toBeNull();
    const latest = await s.protectWorkspace(emptyWorkspace());
    await expect(
      s.restoreWorkspace({ ...draft, vaultVersion: latest.vaultVersion }),
    ).rejects.toThrow();
  });
  it("rejects untrusted fields and secrets while allowing incomplete draft fields", () => {
    expect(
      workspaceSchema.parse({
        ...emptyWorkspace(),
        serviceDraft: { ...service(), name: "", domain: "unfinished" },
      }).serviceDraft?.domain,
    ).toBe("unfinished");
    expect(
      workspaceSchema.safeParse({ ...emptyWorkspace(), password: "secret" })
        .success,
    ).toBe(false);
    expect(
      workspaceSchema.safeParse({
        ...emptyWorkspace(),
        cardDraft: { ...card(), cvv: "123" },
      }).success,
    ).toBe(false);
    expect(
      workspaceSchema.safeParse({
        ...emptyWorkspace(),
        serviceDraft: { ...service(), notes: "1234 5678 9012 3456" },
      }).success,
    ).toBe(false);
  });
  it("does not protect work after auto-lock expiry", async () => {
    let now = 0;
    const s = new VaultSession(memory(), exclusive, () => now);
    await s.create("abc123");
    now = 301000;
    await expect(s.protectWorkspace(emptyWorkspace())).rejects.toThrow("khóa");
    expect(s.unlocked).toBe(false);
  });
});
