// Model display names + colors. Single source of truth used everywhere.

export type ModelKey =
  | "gpt_oss_120b"
  | "llama33_70b"
  | "llama4_scout"
  | "qwen3_32b"
  | "gpt_oss_20b";

export type DomainKey = "fide" | "fia";

export interface ModelMeta {
  key: ModelKey;
  label: string;
  color: string;
}

export const MODELS: ModelMeta[] = [
  { key: "gpt_oss_120b", label: "GPT-OSS 120B (OpenAI)", color: "#10a37f" },
  { key: "llama33_70b", label: "Llama 3.3 70B (Meta)", color: "#6e42f5" },
  { key: "llama4_scout", label: "Llama 4 Scout (Meta)", color: "#4285f4" },
  { key: "qwen3_32b", label: "Qwen3 32B (Alibaba)", color: "#ff6b35" },
  { key: "gpt_oss_20b", label: "GPT-OSS 20B (OpenAI)", color: "#c17d3c" },
];

export const MODEL_BY_KEY: Record<ModelKey, ModelMeta> = MODELS.reduce(
  (acc, m) => {
    acc[m.key] = m;
    return acc;
  },
  {} as Record<ModelKey, ModelMeta>
);

export function modelLabel(key: string): string {
  return MODEL_BY_KEY[key as ModelKey]?.label ?? key;
}

export function modelColor(key: string): string {
  return MODEL_BY_KEY[key as ModelKey]?.color ?? "#888888";
}

export const DOMAINS: { key: DomainKey; label: string }[] = [
  { key: "fide", label: "FIDE (Chess)" },
  { key: "fia", label: "FIA (Formula 1)" },
];

export function domainLabel(key: string): string {
  return DOMAINS.find((d) => d.key === key)?.label ?? key;
}

// FIDE = solid lines, FIA = dashed lines.
export function domainDash(domain: string): string | undefined {
  return domain === "fia" ? "6 4" : undefined;
}

export const ACCENT = "#e8ff47";
export const CHART_GRID = "#222222";
export const CHART_TEXT = "#888888";
export const TIERS = ["1", "2", "3"] as const;
