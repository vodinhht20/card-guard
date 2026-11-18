import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  SERVICE_PRESETS,
  searchServicePresets,
  applyServicePreset,
  findServicePreset,
  useCustomService,
} from "../src/core/serviceCatalog";
import { domainSchema } from "../src/core/schema";
import {
  emptyWorkspace,
  newServiceDraft,
  prepareQuickService,
  workspaceSchema,
} from "../src/core/workspace";
import { service, vaultFixture } from "./fixtures";
describe("local popular-service shortcuts", () => {
  it("bundles an offline SVG logo for every preset without remote references", () => {
    for (const preset of SERVICE_PRESETS) {
      const logo = readFileSync(`public/services/${preset.id}.svg`, "utf8");
      expect(logo).toContain("<svg");
      expect(logo).not.toMatch(
        /<(?:script|image|foreignObject)\b|(?:href|src)=/i,
      );
    }
  });
  it("uses unique IDs and valid domains with no prices, trial periods, external assets or billing assumptions", () => {
    expect(SERVICE_PRESETS).toHaveLength(12);
    expect(new Set(SERVICE_PRESETS.map((p) => p.id)).size).toBe(
      SERVICE_PRESETS.length,
    );
    expect(new Set(SERVICE_PRESETS.map((p) => p.domain)).size).toBe(
      SERVICE_PRESETS.length,
    );
    for (const p of SERVICE_PRESETS) {
      expect(domainSchema.safeParse(p.domain).success).toBe(true);
      expect(Object.keys(p).sort()).toEqual([
        "domain",
        "id",
        "keywords",
        "name",
      ]);
    }
  });
  it("searches names, domains and Vietnamese keywords without case/diacritic sensitivity", () => {
    expect(searchServicePresets("  NETFLIX  ").map((p) => p.id)).toEqual([
      "netflix",
    ]);
    expect(searchServicePresets("one.google.com").map((p) => p.id)).toEqual([
      "google-one",
    ]);
    expect(searchServicePresets("am nhac").map((p) => p.id)).toEqual([
      "spotify",
      "youtube",
    ]);
    expect(searchServicePresets(" THIẾT KẾ ").map((p) => p.id)).toEqual([
      "canva",
      "adobe",
    ]);
    expect(searchServicePresets("github code").map((p) => p.id)).toEqual([
      "github-copilot",
    ]);
    expect(searchServicePresets("missing-service-fixture")).toHaveLength(0);
    expect(searchServicePresets("")).toEqual(SERVICE_PRESETS);
  });
  it("prefills only service identity, preserving user-entered dates, card and billing settings", () => {
    const v = vaultFixture(),
      draft = service({ cardId: v.cards[0].id, notes: "Private note" }),
      original = structuredClone(draft);
    const result = applyServicePreset(draft, "netflix");
    expect(result).toEqual({
      ...draft,
      name: "Netflix",
      domain: "netflix.com",
      billingUrl: "",
    });
    expect(result.id).toBe(draft.id);
    expect(result.trialEnd).toBe(draft.trialEnd);
    expect(result.amount).toBe(draft.amount);
    expect(draft).toEqual(original);
    expect(v.subscriptions).toHaveLength(1);
    expect(prepareQuickService(result).name).toBe("Netflix");
  });
  it("does not invent an expiry date or a plan and retains same-domain billing links", () => {
    const v = vaultFixture(),
      draft = newServiceDraft(v);
    const result = applyServicePreset(draft, "spotify");
    expect(result.renewalDate).toBeNull();
    expect(result.trialEnd).toBeNull();
    expect(result.amount).toBe("");
    expect(result.recurrence).toBe("none");
    const same = applyServicePreset(
      { ...result, billingUrl: "https://spotify.com/account" },
      "spotify",
    );
    expect(same.billingUrl).toBe("https://spotify.com/account");
    expect(() => applyServicePreset(draft, "unknown")).toThrow();
    expect(findServicePreset("spotify.com")?.id).toBe("spotify");
    expect(findServicePreset("spotify.com.evil.example")).toBeUndefined();
  });
  it("supports custom entry without stale preset identity or billing links", () => {
    const draft = service({ name: "Netflix", domain: "netflix.com" }),
      custom = useCustomService(draft);
    expect(custom).toEqual({ ...draft, name: "", domain: "", billingUrl: "" });
    expect(draft.domain).toBe("netflix.com");
  });
  it("restores old drafts in manual mode and preserves preset selection/search in new drafts", () => {
    const { serviceEntryMode, serviceSearch, ...legacy } = emptyWorkspace();
    expect(workspaceSchema.parse(legacy).serviceEntryMode).toBe("manual");
    const current = {
      ...emptyWorkspace(),
      serviceEntryMode: "preset" as const,
      serviceSearch: "netflix",
      serviceDraft: applyServicePreset(
        newServiceDraft(vaultFixture()),
        "netflix",
      ),
    };
    expect(workspaceSchema.parse(current)).toEqual(current);
    expect(
      workspaceSchema.safeParse({ ...current, serviceEntryMode: "unsafe" })
        .success,
    ).toBe(false);
  });
});
