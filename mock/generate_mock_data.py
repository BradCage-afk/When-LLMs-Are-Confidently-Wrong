#!/usr/bin/env python3
"""Generate realistic mock evaluation data so the website + graphs render end-to-end
before any API keys exist.

Outputs:
  mock/master_results.csv     1000 rows (5 models x 200 questions)
  mock/metrics.json           same schema compute_metrics.py produces
Then copies both into analysis/ and website/public/data/ and prints a validation report.

Model behaviour is hand-tuned (not uniform/random) to encode known real-world tendencies
described in the project spec: accuracy by domain, calibration quality, tier degradation,
and specific weak subtopics. Confidence/score draws are seeded per model for reproducibility.
"""
from __future__ import annotations

import csv
import json
import shutil
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "analysis"))
import pandas as pd  # noqa: E402
from compute_metrics import build_metrics  # noqa: E402

BENCHMARK_DIR = ROOT / "benchmark"
MOCK_DIR = ROOT / "mock"
ANALYSIS_DIR = ROOT / "analysis"
WEB_DATA_DIR = ROOT / "website" / "public" / "data"

MODELS = ["gpt4o", "claude_sonnet", "gemini", "llama3", "mistral"]
CSV_COLUMNS = [
    "question_id", "domain", "tier", "subtopic", "model",
    "confidence_percent", "score", "justification", "common_misconception",
]

# Per-model accuracy targets and calibration-gap parameters.
#   acc  : {domain: overall accuracy target}
#   gap  : {domain: base overconfidence gap} — stated confidence sits this far ABOVE
#          actual accuracy, so the Expected Calibration Error emerges ~= this gap.
#          (Lower gap = better calibrated.)
#   seed : per-model RNG seed
# Confidence is generated as 100*p_correct + 100*gap + noise, which decouples accuracy
# from calibration and makes ECE order the models the way the spec intends:
# claude < gpt4o < gemini < mistral < llama.
MODEL_PROFILE = {
    "gpt4o": {
        "acc": {"fide": 0.72, "fia": 0.58},
        "gap": {"fide": 0.11, "fia": 0.19}, "seed": 101,
    },
    "claude_sonnet": {  # best calibrated overall — confidence tracks accuracy closely
        "acc": {"fide": 0.68, "fia": 0.61},
        "gap": {"fide": 0.09, "fia": 0.14}, "seed": 202,
    },
    "gemini": {  # overconfident specifically on Tier 2
        "acc": {"fide": 0.65, "fia": 0.52},
        "gap": {"fide": 0.15, "fia": 0.24}, "seed": 303,
    },
    "llama3": {  # most overconfident — high confidence even when wrong
        "acc": {"fide": 0.59, "fia": 0.44},
        "gap": {"fide": 0.21, "fia": 0.31}, "seed": 404,
    },
    "mistral": {  # underconfident on Tier 1, overconfident on Tier 3
        "acc": {"fide": 0.63, "fia": 0.47},
        "gap": {"fide": 0.18, "fia": 0.27}, "seed": 505,
    },
}

# Subtopics every model is weak on (lower accuracy), with how much accuracy to subtract.
WEAK_SUBTOPICS = {
    "fide": {
        "arbiter_edge_cases": 0.28,
        "clock_handling": 0.15,
        "illegal_position_procedure": 0.24,
    },
    "fia": {
        "technical_regulations": 0.26,
        "steward_decisions": 0.30,   # high failure, high confidence = most dangerous
        "cost_cap_rules": 0.33,      # near-random
        "sprint_weekend_procedure": 0.17,
    },
}

JUSTIFY = {
    1.0: [
        "Matches the ground truth precisely.",
        "Correctly states the rule and its application.",
        "Accurate and complete; captures the essential point.",
        "Fully aligned with the regulation cited.",
    ],
    0.5: [
        "Right general direction but omits a key qualifying detail.",
        "Partially correct; misstates one condition of the rule.",
        "Captures the gist but the specifics are imprecise.",
        "Close, but conflates two related provisions.",
    ],
    0.0: [
        "Contradicts the governing regulation.",
        "States a common misconception rather than the actual rule.",
        "Confidently wrong on the core procedure.",
        "Misidentifies the applicable article and outcome.",
    ],
}


def tier_accuracy(base: float, tier: int) -> float:
    """Tier 1 highest, Tier 2 dips, Tier 3 drops sharply (weighted ~ base)."""
    if tier == 1:
        return min(0.95, base + 0.15)
    if tier == 2:
        return base - 0.05
    return max(0.05, base - 0.25)


def calibration_gap(profile, domain: str, tier: int, subtopic: str, model: str) -> float:
    """Overconfidence gap for a question: how far stated confidence sits above accuracy."""
    gap = profile["gap"][domain]
    # Tier shape: well calibrated on easy facts, dangerously confident on traps.
    gap += {1: -0.04, 2: 0.0, 3: 0.06}[tier]
    # Weak subtopics: models stay confident exactly where they're least accurate.
    if subtopic in WEAK_SUBTOPICS.get(domain, {}):
        gap += 0.06
    # Model-specific quirks.
    if model == "gemini" and tier == 2:
        gap += 0.08  # overconfident on Tier 2 specifically
    if model == "mistral" and tier == 1:
        gap -= 0.15  # underconfident — hedges on easy questions
    if model == "mistral" and tier == 3:
        gap += 0.10  # confidently wrong on trick questions
    return gap


def confidence_draw(rng, p_correct: float, gap: float) -> int:
    """Stated confidence = accuracy + calibration gap + noise (clipped to 3-99)."""
    val = 100.0 * p_correct + 100.0 * gap + rng.normal(0, 6)
    return int(np.clip(round(val), 3, 99))


def score_draw(rng, mean_acc: float) -> float:
    """Sample a score in {0.0, 0.5, 1.0} whose expectation ~ mean_acc."""
    m = float(np.clip(mean_acc, 0.04, 0.96))
    p_half = min(0.18, 2 * m, 2 * (1 - m))
    p_full = max(0.0, m - 0.5 * p_half)
    p_zero = max(0.0, 1 - p_half - p_full)
    probs = np.array([p_zero, p_half, p_full])
    probs = probs / probs.sum()
    return float(rng.choice([0.0, 0.5, 1.0], p=probs))


def synth_manifest() -> list[dict]:
    """Fallback question manifest if the benchmark JSON files aren't present yet."""
    tier1 = {
        "fide": ["basic_moves", "check_checkmate", "stalemate_draws", "piece_values",
                 "tournament_basics"],
        "fia": ["qualifying_format", "pit_lane_rules", "race_start", "safety_car",
                "vsc", "drs", "blue_flags", "points_scoring", "parc_ferme"],
    }
    tier2 = {
        "fide": ["en_passant", "castling_rules", "touch_move", "clock_handling",
                 "scoresheet_obligations", "threefold_repetition", "fifty_move_rule",
                 "insufficient_material", "illegal_position_procedure", "arbiter_edge_cases"],
        "fia": ["technical_regulations", "cost_cap_rules", "power_unit_penalties",
                "sprint_weekend_procedure", "red_flag_restart", "driver_change",
                "weight_enforcement", "parc_ferme", "safety_car"],
    }
    tier3 = {
        "fide": ["arbiter_edge_cases", "illegal_position_procedure", "castling_rules",
                 "en_passant", "clock_handling", "insufficient_material"],
        "fia": ["steward_decisions", "track_limits", "safety_car", "vsc",
                "pit_lane_rules"],
    }
    manifest = []
    for domain, prefix in (("fide", "fide"), ("fia", "fia")):
        idx = 1
        for tier, pool, n in ((1, tier1[domain], 40), (2, tier2[domain], 40),
                              (3, tier3[domain], 20)):
            for i in range(n):
                manifest.append({
                    "id": f"{prefix}_{idx:03d}",
                    "domain": domain,
                    "tier": tier,
                    "subtopic": pool[i % len(pool)],
                    "common_misconception": "",
                })
                idx += 1
    return manifest


def load_manifest() -> list[dict]:
    manifest = []
    have_real = True
    for domain in ("fide", "fia"):
        path = BENCHMARK_DIR / f"{domain}_questions.json"
        if not path.exists():
            have_real = False
            break
        for q in json.loads(path.read_text()):
            manifest.append({
                "id": q["id"], "domain": q["domain"], "tier": int(q["tier"]),
                "subtopic": q["subtopic"],
                "common_misconception": q.get("common_misconception", ""),
            })
    if have_real and manifest:
        print(f"  using real benchmark files ({len(manifest)} questions)")
        return manifest
    print("  benchmark JSON not found — using synthetic 200-question manifest")
    return synth_manifest()


def generate_rows(manifest: list[dict]) -> list[dict]:
    rows = []
    for model in MODELS:
        profile = MODEL_PROFILE[model]
        rng = np.random.default_rng(profile["seed"])
        for q in manifest:
            domain, tier, subtopic = q["domain"], q["tier"], q["subtopic"]
            base = profile["acc"][domain]
            acc = tier_accuracy(base, tier)
            acc -= WEAK_SUBTOPICS.get(domain, {}).get(subtopic, 0.0)
            acc = float(np.clip(acc, 0.04, 0.96))

            score = score_draw(rng, acc)
            gap = calibration_gap(profile, domain, tier, subtopic, model)
            conf = confidence_draw(rng, acc, gap)
            rows.append({
                "question_id": q["id"],
                "domain": domain,
                "tier": tier,
                "subtopic": subtopic,
                "model": model,
                "confidence_percent": conf,
                "score": score,
                "justification": rng.choice(JUSTIFY[score]),
                "common_misconception": q["common_misconception"],
            })
    return rows


def write_csv(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def validate(rows, metrics) -> bool:
    ok = True

    def check(label, cond):
        nonlocal ok
        status = "OK " if cond else "FAIL"
        if not cond:
            ok = False
        print(f"  [{status}] {label}")

    check("CSV row count == 1000", len(rows) == 1000)
    combos = list(metrics["per_model_domain"].keys())
    check("10 model_domain combinations present", len(combos) == 10)
    check("all calibration curves have 10 buckets",
          all(len(v["calibration_curve"]) == 10 for v in metrics["per_model_domain"].values()))
    required = {"accuracy", "ece", "overconfidence_score", "dangerous_zone_count",
                "calibration_curve", "per_tier", "per_subtopic"}
    check("all graph-required fields present",
          all(required <= set(v) for v in metrics["per_model_domain"].values()))
    check("leaderboard ranked & complete", len(metrics["leaderboard"]) == len(MODELS))
    check("calibration_gaps present for all models",
          set(metrics["calibration_gaps"]) == set(MODELS))
    return ok


def main() -> None:
    print("Generating mock evaluation data...")
    manifest = load_manifest()
    rows = generate_rows(manifest)

    mock_csv = MOCK_DIR / "master_results.csv"
    mock_metrics = MOCK_DIR / "metrics.json"
    write_csv(rows, mock_csv)

    df = pd.DataFrame(rows)
    metrics = build_metrics(df)
    mock_metrics.write_text(json.dumps(metrics, indent=2))

    # Copy into analysis/ (so graphs can render) and the website public dir.
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    for dest in (ANALYSIS_DIR, WEB_DATA_DIR):
        shutil.copy(mock_csv, dest / "master_results.csv")
        shutil.copy(mock_metrics, dest / "metrics.json")

    # Also mirror the benchmark JSONs into the website if they exist.
    web_bench = ROOT / "website" / "public" / "benchmark"
    web_bench.mkdir(parents=True, exist_ok=True)
    for domain in ("fide", "fia"):
        src = BENCHMARK_DIR / f"{domain}_questions.json"
        if src.exists():
            shutil.copy(src, web_bench / f"{domain}_questions.json")

    print("\nValidation report")
    print("-----------------")
    summary = []
    for model in MODELS:
        for domain in ("fide", "fia"):
            b = metrics["per_model_domain"][f"{model}_{domain}"]
            summary.append(f"  {model:<14} {domain}: acc={b['accuracy']:.2f} "
                           f"ece={b['ece']:.2f} overconf={b['overconfidence_score']:.0f} "
                           f"danger={b['dangerous_zone_count']}")
    print("\n".join(summary))
    print()
    ok = validate(rows, metrics)
    print()
    if ok:
        print("Mock data ready. Run `cd website && next dev` to preview.")
    else:
        print("Mock data generated but validation reported issues (see above).")
        sys.exit(1)


if __name__ == "__main__":
    main()
