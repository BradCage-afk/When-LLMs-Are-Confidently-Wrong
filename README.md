# LLM Confidence Calibration on Domain-Specific Knowledge

**FIDE Chess Rules vs. FIA Formula 1 Regulations**

An open research benchmark measuring not just whether large language models are
*right*, but whether they *know when they're right*. We ask 5 open-weight LLMs
200 carefully sourced rules questions across two domains and compare their stated
confidence to their actual accuracy.

## The research question

Models are trained on far more chess content than Formula 1 regulation text. If a
model's calibration (how well its confidence tracks its accuracy) degrades on the
sparser domain, that tells us something important: **models are most dangerously
overconfident exactly where their training data is thin.** This benchmark
quantifies that gap.

## Key findings

Scored across 1,000 answers (5 models × 200 questions) by a GPT-4o-mini judge
against ground truth:

- **Every model was worse calibrated on F1 than on Chess — unanimously.** Average
  Expected Calibration Error was **37% higher on FIA Formula 1 (0.358) than on
  FIDE Chess (0.261)**, and the effect held for all 5 of 5 models. Accuracy fell
  the same way: 72% on chess → 60% on F1.
- **The models were ~92% confident, on average, on the answers they got flatly
  wrong.** Of **117 completely-incorrect answers, 111 landed in the "danger zone"**
  — over 70% confident *and* wrong — and F1 produced more of them than chess
  (68 vs 43).
- **Scale bought calibration, not just accuracy.** GPT-OSS 120B led on both
  accuracy (88% chess / 80% F1) and stability (smallest chess→F1 calibration gap,
  +0.049). The mid-size models were the most overconfident.

> ⚠️ **Honest caveat:** some models barely modulate confidence at all — Llama 4
> Scout stated 100% confidence on 96% of its answers, Llama 3.3 70B on 88%. They
> are "confident by default" rather than calibrated, which inflates their
> overconfidence on wrong answers.

### Leaderboard

| Rank | Model | Composite | Chess acc. | F1 acc. | Calibration gap (F1−Chess ECE) |
|-----:|-------|:---------:|:----------:|:-------:|:------------------------------:|
| 1 | **GPT-OSS 120B** | 0.721 | 88% | 80% | +0.049 |
| 2 | Qwen3 32B | 0.595 | 79% | 62% | +0.135 |
| 3 | GPT-OSS 20B | 0.587 | 77% | 60% | +0.136 |
| 4 | Llama 3.3 70B | 0.470 | 62% | 50% | +0.095 |
| 5 | Llama 4 Scout | 0.426 | 57% | 49% | +0.070 |

*Composite = 0.5·accuracy + 0.3·(1−ECE) + 0.2·(1−overconfidence). Lower
calibration gap = confidence holds up better as the domain gets harder.*

## What's in here

```
llm-calibration/
├── benchmark/        200 sourced questions (FIDE + FIA) + schema
├── evaluation/       run_evaluation.py (answer + confidence), score_answers.py (judge)
├── analysis/         compute_metrics.py, generate_graphs.py, results CSV + metrics
├── mock/             generate_mock_data.py — renders the whole site with no API keys
├── website/          Next.js 14 + TypeScript + Tailwind + Recharts dashboard
├── run_all.sh        evaluation → scoring → metrics → graphs → website sync
└── LINKEDIN_POST.md  the writeup, with final numbers
```

The benchmark has three difficulty tiers per domain: **Tier 1** factual,
**Tier 2** edge cases/procedure, **Tier 3** traps where the intuitive answer is
wrong. Every question is sourced (FIDE Laws of Chess 2023 / 2024 FIA F1 Sporting
& Technical Regulations) and flags the common misconception it targets.

## Models evaluated

Five open-weight models, all served via **Groq**:

| Model | Family |
|-------|--------|
| GPT-OSS 120B | OpenAI (open weights) |
| GPT-OSS 20B | OpenAI (open weights) |
| Llama 3.3 70B | Meta |
| Llama 4 Scout | Meta |
| Qwen3 32B | Alibaba |

**Judge:** GPT-4o-mini (OpenAI), scoring every answer 1.0 / 0.5 / 0.0 against the
provided ground-truth answer.

## Quick start (no API keys needed)

```bash
pip install -r requirements.txt
python mock/generate_mock_data.py          # realistic mock data + metrics
python analysis/generate_graphs.py         # publication-quality graphs
cd website && npm install && npm run dev    # open http://localhost:3000
```

The repo also ships with the **real** scored dataset (`analysis/master_results.csv`,
`analysis/metrics.json`), so the site renders the actual results out of the box.

## Reproducing the real evaluation

```bash
cp .env.example .env          # add GROQ_API_KEY (models) + OPENAI_API_KEY (judge)
pip install -r requirements.txt
./run_all.sh                   # evaluate → score → metrics → graphs → sync
```

Any model whose API key is missing is skipped automatically. Scoring is
**resumable** (cached per answer) and retries with exponential backoff.

### How it works
1. **Answer extraction** — each model answers the question directly (no hedging).
2. **Confidence extraction** — in the *same* conversation, the model rates its
   confidence 0–100 in strict JSON.
3. **Scoring** — a GPT-4o-mini judge scores each answer 1.0 / 0.5 / 0.0 against
   ground truth (cached in `analysis/score_cache.json`).
4. **Metrics** — accuracy, Expected Calibration Error (10 buckets), overconfidence
   on wrong answers, per-tier and per-subtopic breakdowns, and the FIDE↔FIA
   calibration gap.

## Website

Dark, data-forward Next.js dashboard with four routes: landing (`/`), interactive
results (`/results`), dataset explorer (`/benchmark`), and methodology
(`/methodology`). Data loads at runtime from `public/data/`, so the site builds
and deploys as a static export.

### Deploy
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
