"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Metrics } from "@/lib/types";
import { CHART_GRID, CHART_TEXT, TIERS, modelColor, modelLabel } from "@/lib/theme";
import EmptyState from "@/components/EmptyState";

// Two subplots side by side: FIDE | FIA. Each plots accuracy by tier per model.
export default function AccuracyByTierChart({
  metrics,
  models,
  domains,
}: {
  metrics: Metrics;
  models: string[];
  domains: string[];
}) {
  const panels = domains.length ? domains : [];
  const hasAny = models.some((m) =>
    panels.some((d) => metrics.per_model_domain[`${m}_${d}`])
  );

  if (!hasAny) {
    return <EmptyState compact title="No tier accuracy data yet" />;
  }

  return (
    <div className={`grid gap-6 ${panels.length > 1 ? "lg:grid-cols-2" : "grid-cols-1"}`}>
      {panels.map((domain) => {
        const data = TIERS.map((tier) => {
          const row: Record<string, number | string> = { tier: `Tier ${tier}` };
          for (const m of models) {
            const pmd = metrics.per_model_domain[`${m}_${domain}`];
            const v = pmd?.per_tier?.[tier]?.accuracy;
            if (v !== undefined) row[m] = round(v * 100);
          }
          return row;
        });
        return (
          <div key={domain}>
            <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted">
              {domain.toUpperCase()}
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis
                  dataKey="tier"
                  tick={{ fill: CHART_TEXT, fontSize: 12 }}
                  axisLine={{ stroke: CHART_GRID }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: CHART_TEXT, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{ background: "#0a0a0a", border: `1px solid ${CHART_GRID}` }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(v: number, key: string) => [`${v}%`, modelLabel(key)]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => modelLabel(v)} />
                {models.map((m) => (
                  <Line
                    key={m}
                    dataKey={m}
                    name={m}
                    stroke={modelColor(m)}
                    strokeWidth={2}
                    strokeDasharray={domain === "fia" ? "6 4" : undefined}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}
