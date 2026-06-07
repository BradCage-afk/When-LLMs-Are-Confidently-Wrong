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
            title="How confident vs. how correct"
            description="Each line is a model. We plot how confident it claimed to be (left → right) against how often it was actually right (bottom → top). The grey diagonal is the honest ideal: say 80%, be right 80% of the time. Notice how every model's points pile up on the far right — they answer almost everything at 90–100% confidence, whether or not they're correct."
          >
            <CalibrationCurveChart metrics={metrics} models={models} domains={domains} />
          </ChartCard>

          <ChartCard
            index={2}
            title="Overconfidence heatmap — sure minus correct"
            description="For each model we take its average confidence and subtract how often it was actually right. So a model that sounds 90% sure but is only 60% correct scores +30 — it's 30 points more confident than it should be. The redder and bigger the number, the more overconfident. Columns split each domain into difficulty tiers (T1 = basic facts → T3 = traps)."
          >
            <OverconfidenceHeatmap rows={rows} models={models} domains={domains} tiers={tiers} />
          </ChartCard>

          <ChartCard
            index={3}
            title="The confidence gap — Chess vs. F1"
            description="The headline chart. Each bar is how far a model's confidence runs ahead of its real accuracy — think of a short bar as 'humble and honest' and a tall bar as 'confidently wrong.' Solid bars are Chess, faded bars are F1. The bars get taller on F1 for almost every model — the topic the internet has far less training data about."
          >
            <CalibrationGapChart metrics={metrics} />
          </ChartCard>

          <ChartCard
            index={4}
            title="The danger zone — confidently wrong answers"
            description="Every dot is a single answer. The red zone holds the dangerous ones: the model was very sure (70%+ confident) and still got it wrong. A model with lots of red dots is one you can't trust to know when it doesn't know."
          >
            <DangerScatter rows={rows} models={models} domains={domains} tiers={tiers} />
          </ChartCard>

          <ChartCard
            index={5}
            title="Accuracy as questions get harder"
            description="How each model's accuracy falls from easy to hard questions — Tier 1 is basic facts, Tier 3 is deliberate traps where the obvious answer is wrong. Chess and F1 are shown side by side."
          >
            <AccuracyByTierChart metrics={metrics} models={models} domains={domains} />
          </ChartCard>

          <ChartCard
            index={6}
            title="Strengths and weaknesses by topic"
            description="Zooms inside each domain to show where a model is strong or shaky. Greener cells are topics it handles well; redder cells are where it struggles."
          >
            <SubtopicHeatmap metrics={metrics} models={models} domains={domains} />
          </ChartCard>

          <ChartCard
            index={7}
            title="Overall leaderboard"
            description="One ranking that blends three things into a single score: how often a model is right, how honest its confidence is, and how rarely it's confidently wrong. Higher is better."
          >
            <LeaderboardChart metrics={metrics} />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
