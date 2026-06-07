"use client";

import { ResultRow } from "@/lib/types";
import { modelLabel, modelColor } from "@/lib/theme";
import EmptyState from "@/components/EmptyState";

// "How sure vs. how correct" — one row per model. A white dot marks how often
// the model was actually right; a colored dot marks how confident it claimed to
// be. The red bar between them is the overconfidence gap. Robust for this data
// (every model clusters at high confidence) where a calibration curve collapses.
export default function ConfidenceVsAccuracy({
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
  const agg = new Map<string, { conf: number; score: number; n: number }>();
  for (const r of rows) {
    if (!models.includes(r.model)) continue;
    if (!domains.includes(r.domain)) continue;
    if (!tiers.includes(r.tier)) continue;
    const cur = agg.get(r.model) ?? { conf: 0, score: 0, n: 0 };
    cur.conf += r.confidence_percent;
    cur.score += r.score * 100;
    cur.n += 1;
    agg.set(r.model, cur);
  }

  const data = models
    .map((m) => {
      const a = agg.get(m);
      if (!a || !a.n) return null;
      return { model: m, conf: a.conf / a.n, acc: a.score / a.n };
    })
    .filter((d): d is { model: string; conf: number; acc: number } => d !== null)
    .sort((a, b) => b.conf - b.acc - (a.conf - a.acc));

  if (!data.length) {
    return <EmptyState compact title="No per-question results yet" />;
  }

  return (
    <div className="space-y-5 py-2">
      {data.map((d) => {
        const gap = Math.max(0, d.conf - d.acc);
        return (
          <div
            key={d.model}
            className="grid grid-cols-[120px_1fr] items-center gap-3 sm:grid-cols-[160px_1fr]"
          >
            <div className="truncate text-xs font-medium text-white">
              {modelLabel(d.model)}
            </div>
            <div className="relative h-8">
              {/* baseline track */}
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
              {/* overconfidence gap bar */}
              <div
                className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${d.acc}%`,
                  width: `${gap}%`,
                  background:
                    "linear-gradient(90deg, rgba(255,90,70,0.25), rgba(255,70,55,0.85))",
                }}
                title={`Overconfidence gap: ${gap.toFixed(0)} pts`}
              />
              {/* accuracy dot (how often right) */}
              <Marker pos={d.acc} value={`${d.acc.toFixed(0)}%`} color="#ffffff" />
              {/* confidence dot (how sure) */}
              <Marker pos={d.conf} value={`${d.conf.toFixed(0)}%`} color={modelColor(d.model)} />
            </div>
          </div>
        );
      })}

      {/* x scale */}
      <div className="grid grid-cols-[120px_1fr] gap-3 sm:grid-cols-[160px_1fr]">
        <div />
        <div className="relative h-4 text-[10px] text-muted">
          {[0, 25, 50, 75, 100].map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2"
              style={{ left: `${t}%` }}
            >
              {t}%
            </span>
          ))}
        </div>
      </div>

      {/* legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-[11px] text-muted sm:pl-[172px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-white" />
          how often it&apos;s right
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          how confident it sounds
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-5 rounded-full bg-[rgba(255,70,55,0.85)]" />
          the gap = overconfidence
        </span>
      </div>
    </div>
  );
}

function Marker({
  pos,
  value,
  color,
}: {
  pos: number;
  value: string;
  color: string;
}) {
  return (
    <div
      className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${pos}%` }}
    >
      <span
        className="h-3.5 w-3.5 rounded-full ring-2 ring-card"
        style={{ background: color }}
      />
      <span className="mt-1 text-[10px] font-medium" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
