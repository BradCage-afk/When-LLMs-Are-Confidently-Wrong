"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Metrics } from "@/lib/types";
import {
  CHART_GRID,
  CHART_TEXT,
  domainDash,
  modelColor,
  modelLabel,
} from "@/lib/theme";
import EmptyState from "@/components/EmptyState";

// Calibration curves: x = mean confidence, y = actual accuracy.
// One line per selected model×domain. Diagonal = perfect calibration.
export default function CalibrationCurveChart({
  metrics,
  models,
  domains,
}: {
  metrics: Metrics;
  models: string[];
  domains: string[];
}) {
  const series: {
    key: string;
    model: string;
    domain: string;
    points: { x: number; y: number }[];
  }[] = [];

  for (const model of models) {
    for (const domain of domains) {
      const pmd = metrics.per_model_domain[`${model}_${domain}`];
      if (!pmd || !pmd.calibration_curve?.length) continue;
      const points = pmd.calibration_curve
        .filter((b) => b.count > 0)
        .map((b) => ({
          x: round(b.mean_confidence),
          y: round(b.actual_accuracy * 100),
        }));
      if (points.length) {
        series.push({ key: `${model}_${domain}`, model, domain, points });
      }
    }
  }

  if (!series.length) {
    return <EmptyState compact title="No calibration curves yet" />;
  }

  return (
    <ResponsiveContainer width="100%" height={380}>
      <LineChart margin={{ top: 10, right: 16, left: -8, bottom: 4 }}>
        <CartesianGrid stroke={CHART_GRID} />
        <XAxis
          type="number"
          dataKey="x"
          domain={[0, 100]}
          tick={{ fill: CHART_TEXT, fontSize: 12 }}
          axisLine={{ stroke: CHART_GRID }}
          tickLine={false}
          label={{
            value: "Stated confidence (%)",
            position: "insideBottom",
            fill: CHART_TEXT,
            fontSize: 11,
            dy: 14,
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          domain={[0, 100]}
          tick={{ fill: CHART_TEXT, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          label={{
            value: "Actual accuracy (%)",
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
          formatter={(v: number | string, n: string) => [`${v}`, n]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {/* Perfect calibration diagonal */}
        <ReferenceLine
          segment={[
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ]}
          stroke="#555"
          strokeDasharray="4 4"
          ifOverflow="extendDomain"
        />
        {series.map((s) => (
          <Line
            key={s.key}
            data={s.points}
            dataKey="y"
            name={`${modelLabel(s.model)} · ${s.domain.toUpperCase()}`}
            stroke={modelColor(s.model)}
            strokeWidth={2}
            strokeDasharray={domainDash(s.domain)}
            dot={{ r: 2.5, fill: modelColor(s.model) }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
