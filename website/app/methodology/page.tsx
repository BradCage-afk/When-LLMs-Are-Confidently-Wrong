import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology — LLM Calibration",
};

export default function MethodologyPage() {
  return (
    <div className="py-12">
      <header className="mb-10">
        <p className="section-title mb-3">Research Methodology</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          How we measured confident wrongness
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          A reproducible protocol for probing whether large language models know
          what they don&apos;t know about two niche, well-documented rulebooks.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav className="hidden lg:block">
          <ul className="sticky top-24 space-y-2 text-sm text-muted">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="hover:text-white">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-3xl space-y-12">
          <Section id="questions" title="1. Writing & sourcing the questions">
            <p>
              We authored 200 questions — 100 on the{" "}
              <strong className="text-white">FIDE Laws of Chess</strong> and 100
              on the <strong className="text-white">FIA Formula 1 Sporting
              Regulations</strong>. Both bodies publish official, versioned
              rulebooks, so every question has a single defensible correct
              answer with a citable source.
            </p>
            <p>
              Questions are stratified into three difficulty tiers:
            </p>
            <ul className="ml-5 list-disc space-y-1 text-muted">
              <li>
                <strong className="text-white">Tier 1 — Common:</strong> rules a
                casual fan would plausibly know.
              </li>
              <li>
                <strong className="text-white">Tier 2 — Intermediate:</strong>{" "}
                edge cases that trip up regular players/viewers.
              </li>
              <li>
                <strong className="text-white">Tier 3 — Obscure:</strong>{" "}
                deep-cut regulations rarely encountered in practice.
              </li>
            </ul>
            <p>
              Each question is tagged with a subtopic (e.g. castling, en passant,
              parc fermé, track limits) and a deliberately plausible{" "}
              <em>common misconception</em> — the wrong answer a confident person
              would give — so we can detect whether models echo folk beliefs.
            </p>
          </Section>

          <Section id="confidence" title="2. Extracting confidence (two-prompt A/B)">
            <p>
              Confidence was elicited with a two-prompt design to avoid
              contaminating the answer with the self-assessment:
            </p>
            <ol className="ml-5 list-decimal space-y-1 text-muted">
              <li>
                <strong className="text-white">Prompt A (answer):</strong> the
                model answers the question normally, with no mention of
                confidence.
              </li>
              <li>
                <strong className="text-white">Prompt B (confidence):</strong>{" "}
                the model is shown its own answer and asked for a calibrated
                probability (0–100%) that the answer is correct.
              </li>
            </ol>
            <p>
              Splitting the elicitation keeps the answer free of hedging language
              and yields a numeric confidence we can compare directly against
              empirical accuracy. Temperature was held low and fixed across all
              five models for comparability.
            </p>
          </Section>

          <Section id="scoring" title="3. Scoring answers (GPT-4o judge)">
            <p>
              Each answer was graded by a GPT-4o judge against the reference
              answer and explanation, on a three-point scale:
            </p>
            <ul className="ml-5 list-disc space-y-1 text-muted">
              <li>
                <strong className="text-white">1.0</strong> — fully correct.
              </li>
              <li>
                <strong className="text-white">0.5</strong> — partially correct
                or correct-but-incomplete.
              </li>
              <li>
                <strong className="text-white">0.0</strong> — wrong, including
                confidently stating the common misconception.
              </li>
            </ul>
            <p>
              From these scores we compute accuracy, Expected Calibration Error
              (ECE), an overconfidence score (mean confidence minus mean
              accuracy), and a <em>danger-zone</em> count: answers given with
              ≥70% confidence that scored below 0.5.
            </p>
          </Section>

          <Section id="metrics" title="4. Metrics">
            <ul className="ml-5 list-disc space-y-1 text-muted">
              <li>
                <strong className="text-white">Accuracy</strong> — mean score
                over questions.
              </li>
              <li>
                <strong className="text-white">ECE</strong> — weighted gap
                between confidence and accuracy across 10 confidence buckets.
              </li>
              <li>
                <strong className="text-white">Overconfidence score</strong> —
                mean confidence minus accuracy; positive means confidently
                wrong.
              </li>
              <li>
                <strong className="text-white">Composite score</strong> — a
                single ranking blending accuracy and calibration quality.
              </li>
            </ul>
          </Section>

          <Section id="limitations" title="5. Limitations & caveats">
            <ul className="ml-5 list-disc space-y-2 text-muted">
              <li>
                <strong className="text-white">Judge bias.</strong> Using GPT-4o
                as the grader may modestly favor GPT-4o&apos;s own phrasing. We
                mitigate with strict reference answers but do not eliminate it.
              </li>
              <li>
                <strong className="text-white">Snapshot in time.</strong> Model
                versions and rulebook editions are fixed at evaluation time;
                results may shift with updates.
              </li>
              <li>
                <strong className="text-white">Domain choice.</strong> Chess and
                F1 are unusually well-documented; findings may not generalize to
                fuzzier domains.
              </li>
              <li>
                <strong className="text-white">Sample size.</strong> 100
                questions per domain is enough to surface trends but not to make
                fine-grained per-subtopic claims with tight confidence intervals.
              </li>
              <li>
                <strong className="text-white">Confidence elicitation.</strong>{" "}
                Self-reported probabilities are themselves a model behavior, not
                ground truth about internal certainty.
              </li>
            </ul>
          </Section>

          <Section id="cite" title="6. How to cite">
            <p>If you use this benchmark or its data, please cite it as:</p>
            <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 text-xs text-muted">
{`@misc{llm_calibration_chess_f1,
  title        = {LLM Confidence Calibration on
                  Domain-Specific Knowledge:
                  FIDE Chess vs FIA Formula 1},
  year         = {2026},
  note         = {Open research benchmark.
                  Dataset and methodology available.}
}`}
            </pre>
            <p className="text-muted">
              The full question set and per-answer results are downloadable from
              the{" "}
              <a href="/benchmark" className="text-accent hover:underline">
                Benchmark
              </a>{" "}
              page.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

const sections = [
  { id: "questions", title: "Questions" },
  { id: "confidence", title: "Confidence" },
  { id: "scoring", title: "Scoring" },
  { id: "metrics", title: "Metrics" },
  { id: "limitations", title: "Limitations" },
  { id: "cite", title: "Citation" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-4 leading-relaxed text-[15px] text-[#cfcfcf]">
        {children}
      </div>
    </section>
  );
}
