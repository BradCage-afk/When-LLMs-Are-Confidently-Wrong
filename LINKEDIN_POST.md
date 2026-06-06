# LinkedIn Post

> Final numbers filled in from `analysis/metrics.json` (1,000 answers, GPT-4o-mini judge).
> Attach two images: **`analysis/graphs/calibration_gap_bar.png`** and
> **`analysis/graphs/model_leaderboard.png`**.

---

I gave 5 large language models 200 questions about the rules of Chess and Formula 1.

Not to see if they were right — to see if they *knew* when they were right.

Here's the thing nobody talks about: a model that's wrong 40% of the time is
manageable. A model that's wrong 40% of the time *and 90% confident* is dangerous.
That second number is calibration, and almost nobody measures it.

So I built a benchmark. 100 FIDE chess questions, 100 FIA F1 regulation questions,
each sourced to the actual rulebook, split into three tiers: straightforward
facts, genuine edge cases, and traps where the intuitive answer is wrong. For
every answer, each model also rated its own confidence 0–100. A separate judge
then scored all 1,000 answers against ground truth.

Three findings that stuck with me:

🔹 **Every single model was worse calibrated on F1 than on Chess.** All 5 of 5.
The average calibration error was 37% higher on Formula 1 — the domain with far
less training data on the open web.

🔹 **Across the answers they got completely wrong, the models averaged 92%
confidence.** Not hedged. Not uncertain. Flatly wrong, and almost fully sure.

🔹 **111 answers landed in the danger zone — over 70% confident *and* incorrect —
and F1 produced more of them than Chess (68 vs 43).** The thinner the knowledge,
the more confidently wrong the model got.

The pattern underneath all of it: models are most overconfident exactly where
their training data is thinnest. Chess is everywhere online. The fine print of F1
sporting regulations is not. The confidence didn't drop to match — and that gap is
the whole story.

One bright spot: scale helped. The largest model I tested (GPT-OSS 120B) wasn't
just the most accurate — it was the most *honest*, with by far the smallest
confidence-vs-accuracy gap between the two domains. Bigger didn't only mean
smarter; it meant better at knowing the edge of its own knowledge.

The full dataset, methodology, evaluation code, and an interactive dashboard are
open. Links in the comments. 👇

#AI #LLM #MachineLearning #AIalignment #Calibration #OpenSource

---

**Image 1:** `analysis/graphs/calibration_gap_bar.png` — the hero chart: calibration
error on Chess vs. F1, per model.

**Image 2:** `analysis/graphs/model_leaderboard.png` — the composite leaderboard.

**Comment 1 (links):** GitHub repo → https://github.com/BradCage-afk/When-LLMs-Are-Confidently-Wrong
(+ live dashboard link once deployed).
