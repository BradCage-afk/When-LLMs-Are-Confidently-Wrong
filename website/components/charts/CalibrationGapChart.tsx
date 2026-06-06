"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Metrics } from "@/lib/types";
import {
  CHART_GRID,
  CHART_TEXT,
  modelColor,
  modelLabel,
} from "@/lib/theme";
import EmptyState from "@/components/EmptyState";

// Calibration gap = (mean confidence − accuracy) per model per domain.
// Bars grouped FIDE vs FIA per model.
export default function CalibrationGapChart({
  metrics,
  height = 340,
}: {
  metrics: Metrics;
  height?: number;
}) {
  const data = (metrics.models.length ? metrics.models : []).map((m) => {
    const fide = metrics.per_model_domain[`${m}_fide`];
    const fia = metrics.per_model_domain[`${m}_fia`];
    return {
      model: m,
      label: modelLabel(m),
      fide: fide ? round(fide.overconfidence_score) : 0,
      fia: fia ? round(fia.overconfidence_score) : 0,
    };
  });

  if (!data.length) {
    return <EmptyState compact title="No calibration data yet" />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={CHART_GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: CHART_TEXT, fontSize: 12 }}
          axisLine={{ stroke: CHART_GRID }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: CHART_TEXT, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          unit="pp"
          label={{
            value: "Overconfidence (pts)",
            angle: -90,
            position: "insideLeft",
            fill: CHART_TEXT,
            fontSize: 11,
            dy: 60,
          }}
        />
        <Tooltip
          contentStyle={{ background: "#0a0a0a", border: `1px solid ${CHART_GRID}` }}
          labelStyle={{ color: "#fff" }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="fide" name="FIDE (Chess)" radius={[3, 3, 0, 0]}>
          {data.map((d) => (
            <Cell key={`fide-${d.model}`} fill={modelColor(d.model)} />
          ))}
        </Bar>
        <Bar dataKey="fia" name="FIA (F1)" radius={[3, 3, 0, 0]}>
          {data.map((d) => (
            <Cell
              key={`fia-${d.model}`}
              fill={modelColor(d.model)}
              fillOpacity={0.45}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}
