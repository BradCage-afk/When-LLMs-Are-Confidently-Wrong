"use client";

import {
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ResultRow } from "@/lib/types";
import { CHART_GRID, CHART_TEXT, modelColor, modelLabel } from "@/lib/theme";
import EmptyState from "@/components/EmptyState";

// Scatter: x = confidence (0-100), y = score (0,0.5,1).
// Ref lines at confidence=70 and score=0.5. Danger zone = high conf + wrong.
export default function DangerScatter({
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
  const filtered = rows.filter(
    (r) =>
      models.includes(r.model) &&
      domains.includes(r.domain) &&
      tiers.includes(r.tier)
  );

  if (!filtered.length) {
    return <EmptyState compact title="No per-question results yet" />;
  }

  // Group by model for colored series. Jitter score slightly for visibility.
  const byModel = new Map<string, { x: number; y: number; raw: ResultRow }[]>();
  for (const r of filtered) {
    const arr = byModel.get(r.model) ?? [];
    const jitter = (Math.random() - 0.5) * 0.06;
    arr.push({ x: r.confidence_percent, y: r.score + jitter, raw: r });
    byModel.set(r.model, arr);
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 10, right: 16, left: -4, bottom: 8 }}>
        <CartesianGrid stroke={CHART_GRID} />
        {/* Danger zone: confidence >= 70 and score < 0.5 */}
        <ReferenceArea
          x1={70}
          x2={100}
          y1={-0.1}
          y2={0.5}
          fill="#ff3b3b"
          fillOpacity={0.08}
          stroke="#ff3b3b"
          strokeOpacity={0.3}
          label={{ value: "DANGER ZONE", fill: "#ff6b6b", fontSize: 11, position: "insideTopRight" }}
        />
        <XAxis
          type="number"
          dataKey="x"
          domain={[0, 100]}
          name="Confidence"
          unit="%"
          tick={{ fill: CHART_TEXT, fontSize: 12 }}
          axisLine={{ stroke: CHART_GRID }}
          tickLine={false}
          label={{ value: "Stated confidence (%)", position: "insideBottom", fill: CHART_TEXT, fontSize: 11, dy: 16 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          domain={[-0.1, 1.1]}
          ticks={[0, 0.5, 1]}
          name="Score"
          tick={{ fill: CHART_TEXT, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          label={{ value: "Score (correctness)", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 11, dy: 50 }}
        />
        <ZAxis range={[28, 28]} />
        <ReferenceLine x={70} stroke="#555" strokeDasharray="4 4" />
        <ReferenceLine y={0.5} stroke="#555" strokeDasharray="4 4" />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          contentStyle={{ background: "#0a0a0a", border: `1px solid ${CHART_GRID}` }}
          content={<ScatterTooltip />}
        />
        {Array.from(byModel.entries()).map(([model, pts]) => (
          <Scatter
            key={model}
            name={modelLabel(model)}
            data={pts}
            fill={modelColor(model)}
            fillOpacity={0.6}
            isAnimationActive={false}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const raw: ResultRow = payload[0]?.payload?.raw;
  if (!raw) return null;
  return (
    <div className="rounded-lg border border-border bg-[#0a0a0a] p-3 text-xs">
      <div className="font-semibold text-white">{modelLabel(raw.model)}</div>
      <div className="text-muted">
        {raw.domain.toUpperCase()} · Tier {raw.tier} · {raw.subtopic}
      </div>
      <div className="mt-1">
        Confidence:{" "}
        <span className="text-accent">{raw.confidence_percent}%</span> · Score:{" "}
        <span className="text-accent">{raw.score}</span>
      </div>
    </div>
  );
}
