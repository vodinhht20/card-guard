import type { Subscription } from "./schema";
export interface ServicePreset {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly keywords: readonly string[];
}
// Curated local shortcuts, not a popularity ranking or confirmed subscription records.
export const SERVICE_PRESETS: readonly ServicePreset[] = [
  {
    id: "netflix",
    name: "Netflix",
    domain: "netflix.com",
    keywords: ["phim", "movies", "video"],
  },
  {
    id: "spotify",
    name: "Spotify",
    domain: "spotify.com",
    keywords: ["âm nhạc", "music", "podcast"],
  },
  {
    id: "youtube",
    name: "YouTube Premium",
    domain: "youtube.com",
    keywords: ["video", "âm nhạc", "music"],
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    domain: "chatgpt.com",
    keywords: ["openai", "ai", "trí tuệ nhân tạo"],
  },
  {
    id: "canva",
    name: "Canva",
    domain: "canva.com",
    keywords: ["thiết kế", "design"],
  },
  {
    id: "google-one",
    name: "Google One",
    domain: "one.google.com",
    keywords: ["lưu trữ", "storage", "drive", "gemini"],
  },
  {
    id: "icloud",
    name: "iCloud+",
    domain: "icloud.com",
    keywords: ["apple", "lưu trữ", "storage"],
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    domain: "microsoft.com",
    keywords: ["office", "word", "excel", "công việc"],
  },
  {
    id: "adobe",
    name: "Adobe Creative Cloud",
    domain: "adobe.com",
    keywords: ["photoshop", "thiết kế", "design"],
  },
  {
    id: "claude",
    name: "Claude",
    domain: "claude.ai",
    keywords: ["anthropic", "ai", "trí tuệ nhân tạo"],
  },
  {
    id: "notion",
    name: "Notion",
    domain: "notion.com",
    keywords: ["ghi chú", "notes", "công việc"],
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    domain: "github.com",
    keywords: ["lập trình", "code", "developer", "ai"],
  },
];
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}
export function searchServicePresets(query: string): readonly ServicePreset[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return SERVICE_PRESETS.filter((p) => {
    const searchable = normalize([p.name, p.domain, ...p.keywords].join(" "));
    return terms.every((term) => searchable.includes(term));
  });
}
export function findServicePreset(domain: string): ServicePreset | undefined {
  return SERVICE_PRESETS.find((p) => p.domain === domain);
}
export function applyServicePreset(
  draft: Subscription,
  id: string,
): Subscription {
  const preset = SERVICE_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error("Dịch vụ không có trong danh sách.");
  return {
    ...draft,
    name: preset.name,
    domain: preset.domain,
    billingUrl: draft.domain === preset.domain ? draft.billingUrl : "",
  };
}
export function useCustomService(draft: Subscription): Subscription {
  return { ...draft, name: "", domain: "", billingUrl: "" };
}
