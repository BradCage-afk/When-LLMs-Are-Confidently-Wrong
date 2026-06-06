"use client";

import { ResultRow } from "@/lib/types";
import { modelLabel } from "@/lib/theme";
import EmptyState from "@/components/EmptyState";

// Heatmap: rows = models, columns = domain × tier.
// Cell value = overconfidence = mean(confidence/100) − mean(score), 0..1ish.
export default function OverconfidenceHeatmap({
  rows,
  models,
  domains,
  tiers,
}: {
  rows: ResultRow[];
  models: string[];
  domains: string[];
  tiers: string[];
}) {
  const cols: { domain: string; tier: string; label: string }[] = [];
  for (const d of domains) {
    for (const t of tiers) {
      cols.push({ domain: d, tier: t, label: `${d.toUpperCase()} T${t}` });
    }
  }

  // aggregate
  const agg = new Map<string, { conf: number; score: number; n: number }>();
  for (const r of rows) {
    if (!models.includes(r.model)) continue;
    if (!domains.includes(r.domain)) continue;
    if (!tiers.includes(r.tier)) continue;
    const key = `${r.model}|${r.domain}|${r.tier}`;
    const cur = agg.get(key) ?? { conf: 0, score: 0, n: 0 };
    cur.conf += r.confidence_percent / 100;
    cur.score += r.score;
    cur.n += 1;
    agg.set(key, cur);
  }

  if (!rows.length || agg.size === 0) {
    return <EmptyState compact title="No per-question results yet" />;
  }

  const value = (model: string, domain: string, tier: string): number | null => {
    const cur = agg.get(`${model}|${domain}|${tier}`);
    if (!cur || cur.n === 0) return null;
    return cur.conf / cur.n - cur.score / cur.n;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left text-xs font-medium text-muted" />
            {cols.map((c) => (
              <th
                key={c.label}
                className="p-2 text-center text-[11px] font-medium text-muted"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m}>
              <td className="whitespace-nowrap p-2 text-xs font-medium text-white">
                {modelLabel(m)}
              </td>
              {cols.map((c) => {
                const v = value(m, c.domain, c.tier);
                return (
                  <td key={c.label} className="p-1">
                    <div
                      className="flex h-10 items-center justify-center rounded-md text-[11px] font-semibold"
                      style={cellStyle(v)}
                      title={
                        v === null
                          ? "no data"
                          : `Overconfidence ${(v * 100).toFixed(1)} pts`
                      }
                    >
                      {v === null ? "—" : `${(v * 100).toFixed(0)}`}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-muted">
        Cell = overconfidence in percentage points (mean confidence − mean
        accuracy). Redder = more overconfident.
      </p>
    </div>
  );
}

function cellStyle(v: number | null): React.CSSProperties {
  if (v === null) {
    return { background: "#161616", color: "#555" };
  }
  // Clamp into [-0.3, 0.6] for color scale. Positive (overconfident) -> red,
  // negative (underconfident) -> teal.
  const clamped = Math.max(-0.3, Math.min(0.6, v));
  let bg: string;
  if (clamped >= 0) {
    const t = clamped / 0.6; // 0..1
    bg = `rgba(255, ${Math.round(120 - 90 * t)}, ${Math.round(80 - 60 * t)}, ${0.25 + 0.6 * t})`;
  } else {
    const t = -clamped / 0.3;
    bg = `rgba(16, 163, 127, ${0.2 + 0.5 * t})`;
  }
  return { background: bg, color: "#fff" };
}
