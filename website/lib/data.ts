// Client-side data loaders. All fetch at runtime so `next build` never needs
// the data files to exist. Each loader degrades gracefully to an empty value.

import { parseCSV } from "./csv";
import {
  BenchmarkQuestion,
  Metrics,
  ResultRow,
  emptyMetrics,
} from "./types";

async function safeFetch(path: string): Promise<Response | null> {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  }
}

export async function loadMetrics(): Promise<Metrics> {
  const res = await safeFetch("/data/metrics.json");
  if (!res) return emptyMetrics();
  try {
    const json = (await res.json()) as Partial<Metrics>;
    return {
      models: json.models ?? [],
      domains: json.domains ?? [],
      per_model_domain: json.per_model_domain ?? {},
      calibration_gaps: json.calibration_gaps ?? {},
      leaderboard: json.leaderboard ?? [],
    };
  } catch {
    return emptyMetrics();
  }
}

export async function loadResults(): Promise<ResultRow[]> {
  const res = await safeFetch("/data/master_results.csv");
  if (!res) return [];
  try {
    const text = await res.text();
    const rows = parseCSV(text);
    return rows.map((r) => ({
      question_id: r.question_id ?? "",
      domain: r.domain ?? "",
      tier: r.tier ?? "",
      subtopic: r.subtopic ?? "",
      model: r.model ?? "",
      confidence_percent: Number(r.confidence_percent ?? 0),
      score: Number(r.score ?? 0),
      justification: r.justification ?? "",
      common_misconception: r.common_misconception ?? "",
    }));
  } catch {
    return [];
  }
}

export async function loadBenchmark(
  domain: "fide" | "fia"
): Promise<BenchmarkQuestion[]> {
  const res = await safeFetch(`/benchmark/${domain}_questions.json`);
  if (!res) return [];
  try {
    const json = await res.json();
    if (!Array.isArray(json)) return [];
    return json as BenchmarkQuestion[];
  } catch {
    return [];
  }
}

export async function loadAllBenchmark(): Promise<BenchmarkQuestion[]> {
  const [fide, fia] = await Promise.all([
    loadBenchmark("fide"),
    loadBenchmark("fia"),
  ]);
  return [...fide, ...fia];
}
