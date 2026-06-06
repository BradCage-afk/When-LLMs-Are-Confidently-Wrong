#!/usr/bin/env python3
"""Compute calibration metrics from analysis/master_results.csv -> analysis/metrics.json.

This module is the single source of truth for the metrics schema. The mock data
generator imports `build_metrics` so the mock metrics.json is byte-for-byte the same
shape as a real run.

Metrics per model x domain:
  - accuracy                  mean score (0-1)
  - ece                       Expected Calibration Error, 10 confidence buckets (0-1)
  - overconfidence_score      mean confidence (0-100) on score==0 answers
  - dangerous_zone_count      # answers with confidence > 70 AND score == 0
  - calibration_curve         10 buckets: mean_confidence (0-1) vs actual_accuracy (0-1)
  - per_tier                  accuracy + mean_confidence (0-100) for tiers 1/2/3
  - per_subtopic              accuracy + count per subtopic

Plus calibration_gaps (ece_fia - ece_fide per model) and a ranked leaderboard.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
MASTER_CSV = ROOT / "analysis" / "master_results.csv"
METRICS_JSON = ROOT / "analysis" / "metrics.json"

MODELS = ["gpt_oss_120b", "llama33_70b", "llama4_scout", "qwen3_32b", "gpt_oss_20b"]
DOMAINS = ["fide", "fia"]
BUCKETS = [(i * 10, (i + 1) * 10) for i in range(10)]  # 0-10 ... 90-100


def bucket_label(lo: int, hi: int) -> str:
    return f"{lo}-{hi}"


def calibration_curve(sub: pd.DataFrame) -> list[dict]:
    """One row per 10%-wide confidence bucket."""
    curve = []
    conf = sub["confidence_percent"].to_numpy(dtype=float)
    score = sub["score"].to_numpy(dtype=float)
    for lo, hi in BUCKETS:
        if lo == 0:
            mask = (conf >= lo) & (conf <= hi)
        else:
            mask = (conf > lo) & (conf <= hi)
        count = int(mask.sum())
        if count:
            mean_conf = float(conf[mask].mean()) / 100.0
            acc = float(score[mask].mean())
        else:
            mean_conf = (lo + hi) / 200.0  # bucket midpoint as a placeholder
            acc = 0.0
        curve.append({
            "bucket": bucket_label(lo, hi),
            "mean_confidence": round(mean_conf, 4),
            "actual_accuracy": round(acc, 4),
            "count": count,
        })
    return curve


def expected_calibration_error(sub: pd.DataFrame) -> float:
    n = len(sub)
    if n == 0:
        return 0.0
    conf = sub["confidence_percent"].to_numpy(dtype=float) / 100.0
    score = sub["score"].to_numpy(dtype=float)
    ece = 0.0
    for lo, hi in BUCKETS:
        lo_f, hi_f = lo / 100.0, hi / 100.0
        if lo == 0:
            mask = (conf >= lo_f) & (conf <= hi_f)
        else:
            mask = (conf > lo_f) & (conf <= hi_f)
        count = int(mask.sum())
        if count:
            ece += (count / n) * abs(score[mask].mean() - conf[mask].mean())
    return float(ece)


def per_tier(sub: pd.DataFrame) -> dict:
    out = {}
    for tier in (1, 2, 3):
        t = sub[sub["tier"] == tier]
        if len(t):
            out[str(tier)] = {
                "accuracy": round(float(t["score"].mean()), 4),
                "mean_confidence": round(float(t["confidence_percent"].mean()), 2),
            }
        else:
            out[str(tier)] = {"accuracy": 0.0, "mean_confidence": 0.0}
    return out


def per_subtopic(sub: pd.DataFrame) -> dict:
    out = {}
    for name, grp in sub.groupby("subtopic"):
        out[str(name)] = {
            "accuracy": round(float(grp["score"].mean()), 4),
            "count": int(len(grp)),
        }
    return out


def build_metrics(df: pd.DataFrame) -> dict:
    """Build the full metrics dict from a master-results DataFrame."""
    df = df.copy()
    df["score"] = df["score"].astype(float)
    df["confidence_percent"] = df["confidence_percent"].astype(float)
    df["tier"] = df["tier"].astype(int)

    models = [m for m in MODELS if m in set(df["model"])]
    per_model_domain: dict[str, dict] = {}

    for model in models:
        for domain in DOMAINS:
            sub = df[(df["model"] == model) & (df["domain"] == domain)]
            if sub.empty:
                continue
            wrong = sub[sub["score"] == 0.0]
            per_model_domain[f"{model}_{domain}"] = {
                "accuracy": round(float(sub["score"].mean()), 4),
                "ece": round(expected_calibration_error(sub), 4),
                "overconfidence_score": round(float(wrong["confidence_percent"].mean()), 2)
                    if len(wrong) else 0.0,
                "dangerous_zone_count": int(
                    ((sub["confidence_percent"] > 70) & (sub["score"] == 0.0)).sum()
                ),
                "calibration_curve": calibration_curve(sub),
                "per_tier": per_tier(sub),
                "per_subtopic": per_subtopic(sub),
            }

    calibration_gaps = {}
    for model in models:
        fide = per_model_domain.get(f"{model}_fide", {}).get("ece")
        fia = per_model_domain.get(f"{model}_fia", {}).get("ece")
        if fide is not None and fia is not None:
            calibration_gaps[model] = round(fia - fide, 4)

    leaderboard = []
    for model in models:
        mdf = df[df["model"] == model]
        accuracy = float(mdf["score"].mean())
        eces = [per_model_domain[f"{model}_{d}"]["ece"] for d in DOMAINS
                if f"{model}_{d}" in per_model_domain]
        ece = float(np.mean(eces)) if eces else 0.0
        wrong = mdf[mdf["score"] == 0.0]
        overconf = float(wrong["confidence_percent"].mean()) if len(wrong) else 0.0
        composite = accuracy * 0.5 + (1 - ece) * 0.3 + (1 - overconf / 100.0) * 0.2
        fide_acc = per_model_domain.get(f"{model}_fide", {}).get("accuracy", 0.0)
        fia_acc = per_model_domain.get(f"{model}_fia", {}).get("accuracy", 0.0)
        leaderboard.append({
            "model": model,
            "composite_score": round(composite, 4),
            "fide_accuracy": fide_acc,
            "fia_accuracy": fia_acc,
        })
    leaderboard.sort(key=lambda r: r["composite_score"], reverse=True)

    return {
        "models": models,
        "domains": DOMAINS,
        "per_model_domain": per_model_domain,
        "calibration_gaps": calibration_gaps,
        "leaderboard": leaderboard,
    }


def main() -> None:
    if not MASTER_CSV.exists():
        print("Missing", MASTER_CSV, "- run score_answers.py (or the mock generator) first.")
        return
    df = pd.read_csv(MASTER_CSV)
    df = df.dropna(subset=["confidence_percent", "score"])
    metrics = build_metrics(df)
    METRICS_JSON.write_text(json.dumps(metrics, indent=2))
    print(f"Wrote metrics for {len(metrics['models'])} models to {METRICS_JSON}")


if __name__ == "__main__":
    main()
