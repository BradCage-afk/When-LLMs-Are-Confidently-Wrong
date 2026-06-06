# LLM Confidence Calibration on Domain-Specific Knowledge

**FIDE Chess Rules vs. FIA Formula 1 Regulations**

An open research benchmark measuring not just whether large language models are
*right*, but whether they *know when they're right*. We ask 5 LLMs 200 carefully
sourced rules questions across two domains and compare their stated confidence to
their actual accuracy.

## The research question

Frontier models are trained on far more chess content than Formula 1 regulation
text. If a model's calibration (how well its confidence tracks its accuracy)
degrades on the sparser domain, that tells us something important: **models are
most dangerously overconfident exactly where their training data is thin.** This
benchmark quantifies that gap.

## Key findings

> Findings below are filled in after a real evaluation run. The numbers ship as
> placeholders; the mock pipeline produces structurally identical data so every
> chart and page renders immediately.

- **[FINDING_1]** — the calibration gap between FIDE and FIA across models.
- **[FINDING_2]** — the most overconfident model on wrong answers.
- **[FINDING_3]** — the "dangerous zone" (confidence > 70%, score = 0) count.

## What's in here

```
llm-calibration/
├── benchmark/        200 sourced questions (FIDE + FIA) + schema
├── evaluation/       run_evaluation.py (two-prompt A/B), score_answers.py (judge)
├── analysis/         compute_metrics.py, generate_graphs.py, results CSV + metrics
├── mock/             generate_mock_data.py — renders the whole site with no API keys
├── website/          Next.js 14 + TypeScript + Tailwind + Recharts dashboard
├── run_all.sh        evaluation → scoring → metrics → graphs → website sync
└── LINKEDIN_POST.md  ready-to-post writeup template
```

The benchmark has three difficulty tiers per domain: **Tier 1** factual,
**Tier 2** edge cases/procedure, **Tier 3** traps where the intuitive answer is
wrong. Every question is sourced (FIDE Laws of Chess 2023 / 2024 FIA F1 Sporting
& Technical Regulations) and flags the common misconception it targets.

## Quick start (no API keys needed)

```bash
pip install -r requirements.txt
python mock/generate_mock_data.py          # realistic mock data + metrics
python analysis/generate_graphs.py         # 7 publication-quality graphs
cd website && npm install && npm run dev    # open http://localhost:3000
```

## Running the real evaluation

```bash
cp .env.example .env          # fill in the API keys you have
pip install -r requirements.txt
./run_all.sh                   # evaluate → score → metrics → graphs → sync
```

Models queried: **GPT-4o** (OpenAI), **Claude Sonnet** (Anthropic),
**Gemini 1.5 Pro** (Google), **Llama 3 70B** (Groq), **Mistral Large** (Mistral).
Any model whose API key is missing is skipped automatically. The runner is
resumable, retries with exponential backoff, and shows a progress bar.

### How it works
1. **Answer extraction** — each model answers the question directly (no hedging).
2. **Confidence extraction** — in the *same* conversation, the model rates its
   confidence 0–100 in strict JSON.
3. **Scoring** — a GPT-4o judge scores each answer 1.0 / 0.5 / 0.0 against ground
   truth.
4. **Metrics** — accuracy, Expected Calibration Error (10 buckets), overconfidence
   on wrong answers, per-tier and per-subtopic breakdowns, and the FIDE↔FIA
   calibration gap.

## Website

Dark, data-forward Next.js dashboard with four routes: landing (`/`), interactive
results (`/results`), dataset explorer (`/benchmark`), and methodology
(`/methodology`). Data loads at runtime from `public/data/`, so the site builds
and deploys as a static export.

### Deploy
Static export — deploy to Vercel in one line:

```bash
cd website && npx vercel --prod
```

## Citing this benchmark

```bibtex
@misc{llm_calibration_chess_f1_2026,
  title  = {LLM Confidence Calibration on Domain-Specific Knowledge:
            FIDE Chess vs. FIA Formula 1},
  year   = {2026},
  note   = {Open research benchmark, 200 sourced questions across two domains}
}
```

Dataset and methodology are freely available. Contributions and replications welcome.
