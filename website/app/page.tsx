"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CountUp from "@/components/CountUp";
import CalibrationGapChart from "@/components/charts/CalibrationGapChart";
import { loadMetrics } from "@/lib/data";
import { Metrics, emptyMetrics } from "@/lib/types";
import { modelLabel } from "@/lib/theme";

// Real answers pulled straight from the benchmark dataset — every one was given
// at 100% stated confidence and scored completely wrong by the judge.
const EXAMPLES = [
  {
    icon: "♟",
    domain: "Chess",
    model: "Llama 4 Scout",
    q: "Can a king deliver check to the opposing king?",
    said: "Yes.",
    truth:
      "No — the two kings can never stand next to each other, so a king can never check the other king.",
  },
  {
    icon: "🏎",
    domain: "Formula 1",
    model: "Llama 3.3 70B",
    q: "Does the F1 minimum weight include the driver?",
    said: "No.",
    truth: "Yes — the minimum-weight regulation includes the driver.",
  },
  {
    icon: "♟",
    domain: "Chess",
    model: "GPT-OSS 20B",
    q: 'Must you announce "check" in a FIDE-rated game?',
    said: "Yes — the Laws of Chess require it.",
    truth:
      "No — there is no rule anywhere requiring you to say “check” out loud.",
  },
  {
    icon: "🏎",
    domain: "Formula 1",
    model: "Llama 4 Scout",
    q: "Is crash-damage repair inside a team's cost cap?",
    said: "No.",
    truth:
      "Yes — crash-damage repair is generally counted within the cost cap.",
  },
];

const FINDINGS = [
  {
    stat: "37%",
    title: "Worse on the niche topic",
    body: "Every model was less calibrated on Formula 1 than on chess — the subject the internet has far less training data about. Unanimous: 5 of 5 models.",
  },
  {
    stat: "89%",
    title: "Sure, and flatly wrong",
    body: "Average confidence on the answers models got completely wrong. Not hedged, not uncertain — almost fully certain, and incorrect.",
  },
  {
    stat: "111",
    title: "Answers in the danger zone",
    body: "Answers that were over 70% confident and wrong — the genuinely risky ones. Formula 1 produced more of them than chess (68 vs 43).",
  },
];

export default function Home() {
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadMetrics()
      .then(setMetrics)
      .finally(() => setLoaded(true));
  }, []);

  const avgOverconfidence = computeAvgOverconfidenceOnWrong(metrics);
  const mostDangerous = computeMostDangerous(metrics);

  return (
    <div>
      {/* Hero */}
      <section className="relative pt-20 pb-16 sm:pt-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="grid-bg absolute inset-0" />
          <div className="glow-accent absolute -top-24 left-1/4 h-[420px] w-[520px] -translate-x-1/2" />
        </div>

        <div className="animate-fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          Research Benchmark · 5 models · 2 domains
        </div>
        <h1
          className="animate-fade-up max-w-4xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
          style={{ animationDelay: "0.05s" }}
        >
          We gave 5 LLMs 200 questions about Chess and F1.{" "}
          <span className="accent-gradient-text">
            Here&apos;s how confidently wrong they were.
          </span>
        </h1>
        <p
          className="animate-fade-up mt-6 max-w-2xl text-lg leading-relaxed text-muted"
          style={{ animationDelay: "0.12s" }}
        >
          Large language models will happily state a wrong rule with 95%
          confidence. We measured the gap between how sure they sound and how
          often they&apos;re right — across FIDE chess regulations and FIA
          Formula 1 sporting rules — to quantify calibration on niche,
          domain-specific knowledge.
        </p>
        <div
          className="animate-fade-up mt-9 flex flex-wrap items-center gap-3"
          style={{ animationDelay: "0.19s" }}
        >
          <Link href="/results" className="accent-btn">
            View the results
            <span className="ml-2">→</span>
          </Link>
          <Link
            href="/methodology"
            className="rounded-lg border border-border px-5 py-3 text-sm font-medium text-white transition-colors hover:border-accent/50"
          >
            How we measured it
          </Link>
        </div>
      </section>

      {/* The experiment — narrative */}
      <section className="border-t border-border py-16">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div>
            <p className="section-title mb-3">The experiment</p>
            <h2 className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
              Same models. One topic they&apos;ve seen a million times — and one
              they barely have.
            </h2>
          </div>
          <div className="space-y-4 text-[15px] leading-relaxed text-muted">
            <p>
              Chess is <span className="text-white">everywhere</span> online:
              millions of games, books, and explainers. The fine print of
              Formula 1&apos;s sporting and technical regulations is{" "}
              <span className="text-white">not</span>. That contrast is the
              whole design.
            </p>
            <p>
              We asked five models the same kind of question across both
              worlds — 200 in total, each sourced to the actual rulebook — and
              made every model{" "}
              <span className="text-accent">rate its own confidence</span> from
              0 to 100. A separate AI judge then scored each answer against the
              ground truth.
            </p>
            <p>
              An honest model should get <em>less</em> confident as it moves to
              the topic it knows less about. An overconfident one stays just as
              sure — and that gap, between sounding certain and being right, is
              exactly what&apos;s dangerous when you actually rely on these
              tools.
            </p>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="grid grid-cols-2 gap-4 border-y border-border py-10 lg:grid-cols-4">
        <Stat label="Questions asked" value={200} />
        <Stat label="Models tested" value={5} />
        <Stat
          label="Avg confidence on wrong answers"
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

      {/* Confidently wrong — real examples */}
      <section className="py-16">
        <p className="section-title mb-3">Confidently wrong, in their own words</p>
        <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
          Every one of these was answered at{" "}
          <span className="text-accent">100% confidence.</span>
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          Real answers straight from the benchmark — the model was completely
          certain, and completely wrong.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {EXAMPLES.map((ex) => (
            <ExampleCard key={ex.q} ex={ex} />
          ))}
        </div>
      </section>

      {/* Key findings */}
      <section className="border-t border-border py-16">
        <p className="section-title mb-3">What we found</p>
        <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
          The less a model knows, the more confidently it bluffs.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FINDINGS.map((f) => (
            <div key={f.stat} className="card p-6">
              <div className="text-4xl font-semibold tracking-tight text-accent">
                {f.stat}
              </div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Key finding chart */}
      <section className="py-16">
        <div className="card card-hover p-6 sm:p-8">
          <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="section-title mb-2">The headline chart</p>
              <h2 className="text-2xl font-semibold tracking-tight">
                The confidence gap
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                How far each model&apos;s stated confidence runs ahead of its
                actual accuracy, by domain. Solid bars are Chess, faded bars are
                F1. Taller means more confidently wrong.
              </p>
            </div>
            <Link
              href="/results"
              className="shrink-0 text-sm font-medium text-accent hover:underline"
            >
              Explore all the charts →
            </Link>
          </div>
          <CalibrationGapChart metrics={metrics} />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="pb-20">
        <div className="card relative overflow-hidden p-8 text-center sm:p-12">
          <div
            aria-hidden
            className="glow-accent pointer-events-none absolute -top-16 left-1/2 h-64 w-96 -translate-x-1/2"
          />
          <h2 className="mx-auto max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
            Dig into the full results — every model, every chart.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            Filter by model, domain, and difficulty; explore the danger zone,
            the leaderboard, and where each model breaks down.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/results" className="accent-btn">
              Explore the dashboard
              <span className="ml-2">→</span>
            </Link>
            <Link
              href="/benchmark"
              className="rounded-lg border border-border px-5 py-3 text-sm font-medium text-white transition-colors hover:border-accent/50"
            >
              Browse the questions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ExampleCard({
  ex,
}: {
  ex: {
    icon: string;
    domain: string;
    model: string;
    q: string;
    said: string;
    truth: string;
  };
}) {
  return (
    <div className="card card-hover flex flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="chip text-xs text-muted">
          <span aria-hidden>{ex.icon}</span> {ex.domain}
        </span>
        <span className="text-xs font-semibold text-accent">
          100% confident
        </span>
      </div>
      <p className="text-base font-medium leading-snug text-white">
        &ldquo;{ex.q}&rdquo;
      </p>
      <div className="mt-5 space-y-3 text-sm">
        <p className="flex gap-2">
          <span className="mt-0.5 text-red-400" aria-hidden>
            ✗
          </span>
          <span>
            <span className="text-muted">{ex.model} answered: </span>
            <span className="font-medium text-white">
              &ldquo;{ex.said}&rdquo;
            </span>
          </span>
        </p>
        <p className="flex gap-2">
          <span className="mt-0.5 text-accent" aria-hidden>
            ✓
          </span>
          <span className="leading-relaxed text-muted">{ex.truth}</span>
        </p>
      </div>
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

// Average confidence on wrong answers (percentage points), averaged across all
// model×domain combinations.
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
