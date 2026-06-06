# LinkedIn Post Template

> Fill the three `[[ ]]` placeholders from `analysis/metrics.json` after a run.
> Attach two images: **Graph 3** (`calibration_gap_bar.png`) and **Graph 7**
> (`model_leaderboard.png`).

---

I gave 5 large language models 200 questions about the rules of Chess and Formula 1.

Not to see if they were right — to see if they *knew* when they were right.

Here's the thing nobody talks about: a model that's wrong 40% of the time is
manageable. A model that's wrong 40% of the time *and 90% confident* is dangerous.
That second number is calibration, and almost nobody measures it.

So I built a benchmark. 100 FIDE chess questions, 100 FIA F1 regulation questions,
each sourced to the actual rulebook, split into three tiers: straightforward
facts, genuine edge cases, and traps where the intuitive answer is wrong. For
every answer, each model also rated its own confidence 0–100.

Three findings that surprised me:

🔹 **[[FINDING_1 — e.g. "Every model was better calibrated on Chess than on F1.
The average calibration error was XX% higher on F1."]]**

🔹 **[[FINDING_2 — e.g. "The most overconfident model averaged XX% confidence on
answers it got completely wrong."]]**

🔹 **[[FINDING_3 — e.g. "Across 1,000 answers, XXX landed in the danger zone:
over 70% confident and flatly incorrect."]]**

The pattern underneath all of it: models are most overconfident exactly where
their training data is thinnest. Chess is everywhere online. The fine print of F1
sporting regulations is not. The confidence didn't drop to match — and that gap is
the whole story.

The full dataset, methodology, evaluation code, and an interactive dashboard are
open. Links in the comments. 👇

#AI #LLM #MachineLearning #AIalignment #Calibration #OpenSource

---

**Image 1:** `analysis/graphs/calibration_gap_bar.png` — the hero chart: calibration
error on Chess vs. F1, per model.

**Image 2:** `analysis/graphs/model_leaderboard.png` — the composite leaderboard.
