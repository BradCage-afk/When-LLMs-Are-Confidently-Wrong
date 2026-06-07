"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CountUp from "@/components/CountUp";
import CalibrationGapChart from "@/components/charts/CalibrationGapChart";
import { loadMetrics } from "@/lib/data";
import { Metrics, emptyMetrics } from "@/lib/types";
import { modelLabel } from "@/lib/theme";

export default function Home() {
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadMetrics()
      .then(setMetrics)
      .finally(() => setLoaded(true));
  }, []);

  // Derived headline stats
  const avgOverconfidence = computeAvgOverconfidenceOnWrong(metrics);
  const mostDangerous = computeMostDangerous(metrics);

  return (
    <div>
      {/* Hero */}
      <section className="relative pt-20 pb-16 sm:pt-28">
        {/* Backdrop: faint instrument-panel grid (no glossy gradient) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="grid-bg absolute inset-0" />
        </div>

        <div className="chip animate-fade-up mb-6 text-xs text-cloud">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          Research Benchmark · 5 models · 2 domains
        </div>
        <h1
          className="animate-fade-up max-w-4xl text-4xl font-light leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl lg:text-6xl"
          style={{ animationDelay: "0.05s" }}
        >
          We gave 5 LLMs 200 questions about Chess and F1.{" "}
          <span className="text-accent">
            Here&apos;s how confidently wrong they were.
          </span>
        </h1>
        <p
          className="animate-fade-up mt-6 max-w-2xl text-lg leading-relaxed text-cloud"
          style={{ animationDelay: "0.12s" }}
        >
          Large language models will happily state a wrong rule with 95%
          confidence. We measured the gap between{" "}
          <span className="em-violet">how sure they sound</span> and{" "}
          <span className="em-violet">how often they&apos;re right</span> — across
          FIDE chess regulations and FIA Formula 1 sporting rules — to quantify
          calibration on niche, domain-specific knowledge.
        </p>
        <div
          className="animate-fade-up mt-9 flex flex-wrap items-center gap-3"
          style={{ animationDelay: "0.19s" }}
        >
          <Link href="/results" className="accent-btn">
            View the results
            <span className="ml-2">→</span>
          </Link>
          <Link href="/methodology" className="ghost-btn">
            How we measured it
          </Link>
        </div>
      </section>

      {/* Stat strip */}
      <section className="grid grid-cols-2 gap-4 border-y border-border py-10 lg:grid-cols-4">
        <Stat label="Questions asked" value={200} />
        <Stat label="Models tested" value={5} />
        <Stat
          label="Avg overconfidence on wrong answers"
          value={loaded ? avgOverconfidence : 0}
          suffix="%"
          decimals={1}
        />
        <StatText
          label="Most dangerous model"
          value={loaded ? mostDangerous.label : "—"}
          sub={
            loaded && mostDangerous.count > 0
              ? `${mostDangerous.count} answers in the danger zone`
              : "awaiting data"
          }
        />
      </section>

      {/* Key finding teaser */}
      <section className="py-16">
        <div className="card card-hover p-6 sm:p-8">
          <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="section-title mb-2">This is the key finding</p>
              <h2 className="text-2xl font-semibold tracking-tight">
                The calibration gap
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                How far each model&apos;s stated confidence exceeds its actual
                accuracy, split by domain. Solid bars are FIDE (Chess), faded
                bars are FIA (Formula 1). Bigger means more confidently wrong.
              </p>
            </div>
            <Link
              href="/results"
              className="shrink-0 text-sm font-medium text-accent hover:underline"
            >
              Explore all 7 charts →
            </Link>
          </div>
          <CalibrationGapChart metrics={metrics} />
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  decimals = 0,
}: {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  return (
    <div>
      <div className="text-4xl font-semibold tracking-tight text-accent sm:text-5xl">
        <CountUp value={value} suffix={suffix} decimals={decimals} />
      </div>
      <div className="mt-2 text-xs uppercase tracking-wide text-muted">
        {label}
      </div>
    </div>
  );
}

function StatText({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div>
      <div className="text-3xl font-semibold tracking-tight text-accent sm:text-4xl">
        {value}
      </div>
      <div className="mt-2 text-xs uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="mt-1 text-[11px] text-muted/70">{sub}</div>
    </div>
  );
}

// Average overconfidence on wrong answers, in percentage points. The published
// overconfidence_score is already expressed in percentage points (0..100), so
// we just average it across all model×domain combos.
function computeAvgOverconfidenceOnWrong(m: Metrics): number {
  const vals = Object.values(m.per_model_domain).map(
    (d) => d.overconfidence_score
  );
  if (!vals.length) return 0;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 10) / 10;
}

function computeMostDangerous(m: Metrics): {
  label: string;
  count: number;
} {
  let best = { model: "", count: -1 };
  for (const model of m.models) {
    const count =
      (m.per_model_domain[`${model}_fide`]?.dangerous_zone_count ?? 0) +
      (m.per_model_domain[`${model}_fia`]?.dangerous_zone_count ?? 0);
    if (count > best.count) best = { model, count };
  }
  if (best.model === "") return { label: "—", count: 0 };
  return { label: modelLabel(best.model), count: best.count };
}
