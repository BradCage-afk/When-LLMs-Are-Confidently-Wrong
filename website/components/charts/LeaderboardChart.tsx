"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Metrics } from "@/lib/types";
import { CHART_GRID, CHART_TEXT, modelColor, modelLabel } from "@/lib/theme";
import EmptyState from "@/components/EmptyState";

// Horizontal bars of composite score, ranked desc.
export default function LeaderboardChart({ metrics }: { metrics: Metrics }) {
  const data = [...metrics.leaderboard]
    .sort((a, b) => b.composite_score - a.composite_score)
    .map((e) => ({
      model: e.model,
      label: modelLabel(e.model),
      composite: round(e.composite_score),
      fide: e.fide_accuracy,
      fia: e.fia_accuracy,
    }));

  if (!data.length) {
    return <EmptyState compact title="No leaderboard yet" />;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 56)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
      >
        <XAxis
          type="number"
          tick={{ fill: CHART_TEXT, fontSize: 12 }}
          axisLine={{ stroke: CHART_GRID }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tick={{ fill: "#ededed", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: "#0a0a0a", border: `1px solid ${CHART_GRID}` }}
          labelStyle={{ color: "#fff" }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          formatter={(v: number, n: string) => [v, n === "composite" ? "Composite score" : n]}
        />
        <Bar dataKey="composite" radius={[0, 4, 4, 0]} barSize={26}>
          {data.map((d) => (
            <Cell key={d.model} fill={modelColor(d.model)} />
          ))}
          <LabelList
            dataKey="composite"
            position="right"
            fill="#ededed"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}
