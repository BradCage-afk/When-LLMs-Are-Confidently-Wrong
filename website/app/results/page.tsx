"use client";

import { useEffect, useMemo, useState } from "react";
import { loadMetrics, loadResults } from "@/lib/data";
import { Metrics, ResultRow, emptyMetrics } from "@/lib/types";
import { MODELS, ModelKey } from "@/lib/theme";
import {
  DomainFilter,
  ModelChips,
  SegmentedControl,
  TierFilter,
} from "@/components/Filters";
import ChartCard from "@/components/ChartCard";
import CalibrationCurveChart from "@/components/charts/CalibrationCurveChart";
import OverconfidenceHeatmap from "@/components/charts/OverconfidenceHeatmap";
import CalibrationGapChart from "@/components/charts/CalibrationGapChart";
import DangerScatter from "@/components/charts/DangerScatter";
import AccuracyByTierChart from "@/components/charts/AccuracyByTierChart";
import SubtopicHeatmap from "@/components/charts/SubtopicHeatmap";
import LeaderboardChart from "@/components/charts/LeaderboardChart";
import EmptyState from "@/components/EmptyState";

const ALL_MODELS = MODELS.map((m) => m.key);

export default function ResultsPage() {
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics());
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [selectedModels, setSelectedModels] = useState<ModelKey[]>(ALL_MODELS);
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("both");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");

  useEffect(() => {
    Promise.all([loadMetrics(), loadResults()])
      .then(([m, r]) => {
        setMetrics(m);
        setRows(r);
      })
      .finally(() => setLoaded(true));
  }, []);

  const toggleModel = (m: ModelKey) =>
    setSelectedModels((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );

  const models = selectedModels.length ? selectedModels : ALL_MODELS;
  const domains = useMemo(
    () => (domainFilter === "both" ? ["fide", "fia"] : [domainFilter]),
    [domainFilter]
  );
  const tiers = useMemo(
    () => (tierFilter === "all" ? ["1", "2", "3"] : [tierFilter]),
    [tierFilter]
  );

  const hasData =
    Object.keys(metrics.per_model_domain).length > 0 || rows.length > 0;

  return (
    <div className="py-12">
      <header className="mb-8">
        <p className="section-title mb-3">Interactive Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Results
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Every figure updates with the filters below. FIDE is drawn with solid
          lines, FIA with dashed lines.
        </p>
      </header>

      {/* Filter bar */}
      <div className="sticky top-16 z-30 -mx-4 mb-8 border-y border-border bg-background/90 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <ModelChips selected={selectedModels} onToggle={toggleModel} />
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">
                Domain
              </p>
              <SegmentedControl<DomainFilter>
                value={domainFilter}
                onChange={setDomainFilter}
                options={[
                  { value: "fide", label: "FIDE" },
                  { value: "fia", label: "FIA" },
                  { value: "both", label: "Both" },
                ]}
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">
                Tier
              </p>
              <SegmentedControl<TierFilter>
                value={tierFilter}
                onChange={setTierFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "1", label: "1" },
                  { value: "2", label: "2" },
                  { value: "3", label: "3" },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {!loaded ? (
        <div className="py-20 text-center text-sm text-muted">Loading…</div>
      ) : !hasData ? (
        <EmptyState
          title="No data yet — run the pipeline"
          hint="Generate /data/metrics.json and /data/master_results.csv, then reload."
        />
      ) : (
        <div className="space-y-6">
          <ChartCard
            index={1}
            title="Calibration curves"
            description="Stated confidence vs. actual accuracy. The dashed diagonal is perfect calibration; points below it mean the model was more confident than correct."
          >
            <CalibrationCurveChart metrics={metrics} models={models} domains={domains} />
          </ChartCard>

          <ChartCard
            index={2}
            title="Overconfidence heatmap"
            description="Mean confidence minus mean accuracy (percentage points) for each model across domain and difficulty tier."
          >
            <OverconfidenceHeatmap rows={rows} models={models} domains={domains} tiers={tiers} />
          </ChartCard>

          <ChartCard
            index={3}
            title="Calibration gap — FIDE vs FIA"
            description="The headline number: how much each model's confidence exceeds its accuracy, by domain."
          >
            <CalibrationGapChart metrics={metrics} />
          </ChartCard>

          <ChartCard
            index={4}
            title="Danger-zone scatter"
            description="Each point is one answer. High confidence (≥70%) with a wrong answer (score <0.5) lands in the red danger zone — confidently wrong."
          >
            <DangerScatter rows={rows} models={models} domains={domains} tiers={tiers} />
          </ChartCard>

          <ChartCard
            index={5}
            title="Accuracy by difficulty tier"
            description="Accuracy across tiers 1–3, split into FIDE and FIA subplots."
          >
            <AccuracyByTierChart metrics={metrics} models={models} domains={domains} />
          </ChartCard>

          <ChartCard
            index={6}
            title="Subtopic failure heatmaps"
            description="Where each model is strong or weak within a domain, by subtopic."
          >
            <SubtopicHeatmap metrics={metrics} models={models} domains={domains} />
          </ChartCard>

          <ChartCard
            index={7}
            title="Composite leaderboard"
            description="Overall ranking combining accuracy and calibration into a single composite score."
          >
            <LeaderboardChart metrics={metrics} />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
