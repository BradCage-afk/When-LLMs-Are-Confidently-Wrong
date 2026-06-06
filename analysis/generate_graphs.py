#!/usr/bin/env python3
"""Render the 7 publication-quality graphs from metrics.json + master_results.csv.

Every figure is saved to analysis/graphs/ as both PNG (300 dpi) and SVG.

    python analysis/generate_graphs.py
"""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.lines import Line2D

ROOT = Path(__file__).resolve().parents[1]
METRICS_JSON = ROOT / "analysis" / "metrics.json"
MASTER_CSV = ROOT / "analysis" / "master_results.csv"
GRAPHS_DIR = ROOT / "analysis" / "graphs"

MODEL_COLORS = {
    "gpt_oss_120b": "#10a37f",
    "llama33_70b": "#6e42f5",
    "llama4_scout": "#4285f4",
    "qwen3_32b": "#ff6b35",
    "gpt_oss_20b": "#c17d3c",
}
MODEL_LABELS = {
    "gpt_oss_120b": "GPT-OSS 120B",
    "llama33_70b": "Llama 3.3 70B",
    "llama4_scout": "Llama 4 Scout",
    "qwen3_32b": "Qwen3 32B",
    "gpt_oss_20b": "GPT-OSS 20B",
}
DOMAIN_STYLE = {"fide": "-", "fia": "--"}
DOMAIN_LABEL = {"fide": "FIDE", "fia": "FIA"}

plt.rcParams.update({
    "figure.dpi": 110,
    "font.size": 11,
    "axes.grid": True,
    "grid.alpha": 0.25,
    "axes.spines.top": False,
    "axes.spines.right": False,
})


def save(fig, name: str) -> None:
    GRAPHS_DIR.mkdir(parents=True, exist_ok=True)
    for ext in ("png", "svg"):
        fig.savefig(GRAPHS_DIR / f"{name}.{ext}", dpi=300, bbox_inches="tight")
    plt.close(fig)
    print("  wrote", name + ".png /", name + ".svg")


def load():
    metrics = json.loads(METRICS_JSON.read_text())
    df = pd.read_csv(MASTER_CSV)
    return metrics, df


# ----------------------------------------------------------------------------------------
# Graph 1 — calibration curves
# ----------------------------------------------------------------------------------------
def graph_calibration_curves(metrics):
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.plot([0, 1], [0, 1], color="grey", linestyle=":", linewidth=1.5,
            label="Perfect calibration", zorder=1)
    ax.fill_between([0, 1], [0, 1], [0, 0], color="red", alpha=0.04)

    for model in metrics["models"]:
        for domain in metrics["domains"]:
            key = f"{model}_{domain}"
            block = metrics["per_model_domain"].get(key)
            if not block:
                continue
            pts = [(p["mean_confidence"], p["actual_accuracy"])
                   for p in block["calibration_curve"] if p["count"] > 0]
            if not pts:
                continue
            xs, ys = zip(*pts)
            ax.plot(xs, ys, color=MODEL_COLORS[model], linestyle=DOMAIN_STYLE[domain],
                    marker="o", markersize=4, linewidth=1.8, alpha=0.9)

    ax.text(0.62, 0.30, "Overconfidence\n(below the line)", color="red", alpha=0.6,
            fontsize=10, ha="center")
    ax.set_xlabel("Mean stated confidence")
    ax.set_ylabel("Actual accuracy")
    ax.set_title("Calibration curves — confidence vs. accuracy (5 models x 2 domains)")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)

    handles = [Line2D([0], [0], color=MODEL_COLORS[m], lw=2, label=MODEL_LABELS[m])
               for m in metrics["models"]]
    handles += [
        Line2D([0], [0], color="black", lw=2, linestyle="-", label="FIDE (solid)"),
        Line2D([0], [0], color="black", lw=2, linestyle="--", label="FIA (dashed)"),
        Line2D([0], [0], color="grey", lw=1.5, linestyle=":", label="Perfect calibration"),
    ]
    ax.legend(handles=handles, loc="upper left", fontsize=9, framealpha=0.9)
    save(fig, "calibration_curves")


# ----------------------------------------------------------------------------------------
# Graph 2 — overconfidence heatmap (models x domain*tier), cell = mean conf on wrong
# ----------------------------------------------------------------------------------------
def graph_overconfidence_heatmap(metrics, df):
    cols = [("fide", 1), ("fide", 2), ("fide", 3), ("fia", 1), ("fia", 2), ("fia", 3)]
    col_labels = [f"{DOMAIN_LABEL[d]} T{t}" for d, t in cols]
    models = metrics["models"]

    grid = np.full((len(models), len(cols)), np.nan)
    for i, model in enumerate(models):
        for j, (domain, tier) in enumerate(cols):
            wrong = df[(df.model == model) & (df.domain == domain) &
                       (df.tier == tier) & (df.score == 0.0)]
            if len(wrong):
                grid[i, j] = wrong["confidence_percent"].mean()

    fig, ax = plt.subplots(figsize=(10, 6))
    masked = np.ma.masked_invalid(grid)
    cmap = plt.cm.Reds.copy()
    cmap.set_bad("#eeeeee")
    im = ax.imshow(masked, cmap=cmap, vmin=40, vmax=100, aspect="auto")

    ax.set_xticks(range(len(cols)), col_labels)
    ax.set_yticks(range(len(models)), [MODEL_LABELS[m] for m in models])
    for i in range(len(models)):
        for j in range(len(cols)):
            if not np.isnan(grid[i, j]):
                ax.text(j, i, f"{grid[i, j]:.0f}", ha="center", va="center",
                        color="white" if grid[i, j] > 72 else "black", fontsize=10)
    ax.set_title("Overconfidence — mean stated confidence on WRONG answers")
    fig.colorbar(im, ax=ax, label="Mean confidence on wrong (%)", shrink=0.8)
    save(fig, "overconfidence_heatmap")


# ----------------------------------------------------------------------------------------
# Graph 3 — calibration gap grouped bars (hero)
# ----------------------------------------------------------------------------------------
def graph_calibration_gap_bar(metrics):
    models = metrics["models"]
    fide = [metrics["per_model_domain"][f"{m}_fide"]["ece"] for m in models]
    fia = [metrics["per_model_domain"][f"{m}_fia"]["ece"] for m in models]
    x = np.arange(len(models))
    w = 0.38

    fig, ax = plt.subplots(figsize=(11, 6.5))
    ax.bar(x - w / 2, fide, w, label="FIDE Chess (dense training data)", color="#3b82f6")
    ax.bar(x + w / 2, fia, w, label="FIA F1 (sparse training data)", color="#ef4444")

    for i, (f, a) in enumerate(zip(fide, fia)):
        top = max(f, a)
        diff = (a - f) / f * 100 if f else 0
        ax.text(i, top + 0.012, f"+{diff:.0f}%", ha="center", fontsize=10,
                fontweight="bold", color="#ef4444")

    ax.set_xticks(x, [MODEL_LABELS[m] for m in models], rotation=15)
    ax.set_ylabel("Expected Calibration Error (lower = better)")
    ax.set_title("The calibration gap: ECE rises on sparse-knowledge domains")
    ax.legend()
    save(fig, "calibration_gap_bar")


# ----------------------------------------------------------------------------------------
# Graph 4 — dangerous zone scatter (all 1000 results)
# ----------------------------------------------------------------------------------------
def graph_dangerous_zone_scatter(df):
    fig, ax = plt.subplots(figsize=(11, 7))
    rng = np.random.default_rng(7)
    for model in df.model.unique():
        sub = df[df.model == model]
        jitter = rng.uniform(-0.025, 0.025, len(sub))
        ax.scatter(sub["confidence_percent"], sub["score"] + jitter,
                   s=14, alpha=0.45, color=MODEL_COLORS.get(model, "#888"),
                   label=MODEL_LABELS.get(model, model), edgecolors="none")

    ax.axvline(70, color="black", linestyle="--", linewidth=1)
    ax.axhline(0.5, color="black", linestyle="--", linewidth=1)

    danger = df[(df.confidence_percent > 70) & (df.score == 0.0)]
    ax.add_patch(plt.Rectangle((70, -0.05), 30, 0.35, color="red", alpha=0.07))
    ax.text(85, 0.13, f"DANGER ZONE\n(conf>70, score=0)\nn = {len(danger)}",
            ha="center", color="red", fontsize=11, fontweight="bold")

    # quadrant counts
    ax.text(35, 0.95, f"n={len(df[(df.confidence_percent<=70)&(df.score>=0.5)])}",
            color="grey", fontsize=9)
    ax.text(85, 0.95, f"n={len(df[(df.confidence_percent>70)&(df.score>=0.5)])}",
            color="grey", fontsize=9)

    ax.set_xlabel("Stated confidence (%)")
    ax.set_ylabel("Answer score")
    ax.set_yticks([0.0, 0.5, 1.0])
    ax.set_xlim(0, 102)
    ax.set_ylim(-0.1, 1.1)
    ax.set_title("Dangerous zone — high confidence, low correctness")
    ax.legend(loc="center left", fontsize=9)
    save(fig, "dangerous_zone_scatter")


# ----------------------------------------------------------------------------------------
# Graph 5 — accuracy by tier (two subplots)
# ----------------------------------------------------------------------------------------
def graph_accuracy_by_tier(metrics):
    fig, axes = plt.subplots(1, 2, figsize=(13, 6), sharey=True)
    for ax, domain in zip(axes, metrics["domains"]):
        for model in metrics["models"]:
            block = metrics["per_model_domain"].get(f"{model}_{domain}")
            if not block:
                continue
            ys = [block["per_tier"][str(t)]["accuracy"] for t in (1, 2, 3)]
            ax.plot([1, 2, 3], ys, marker="o", color=MODEL_COLORS[model],
                    linestyle=DOMAIN_STYLE[domain], linewidth=1.9,
                    label=MODEL_LABELS[model])
        ax.set_title(f"{DOMAIN_LABEL[domain]}")
        ax.set_xlabel("Tier (1 = factual, 3 = trap)")
        ax.set_xticks([1, 2, 3])
        ax.set_ylim(0, 1)
    axes[0].set_ylabel("Accuracy")
    axes[1].legend(fontsize=9)
    fig.suptitle("Accuracy degradation by difficulty tier", y=1.02)
    save(fig, "accuracy_by_tier")


# ----------------------------------------------------------------------------------------
# Graph 6 — subtopic failure heatmaps (one per domain)
# ----------------------------------------------------------------------------------------
def graph_subtopic_heatmaps(metrics):
    models = metrics["models"]
    for domain in metrics["domains"]:
        subtopics = set()
        for model in models:
            block = metrics["per_model_domain"].get(f"{model}_{domain}", {})
            subtopics.update(block.get("per_subtopic", {}).keys())
        subtopics = sorted(subtopics)
        if not subtopics:
            continue

        grid = np.full((len(subtopics), len(models)), np.nan)
        for j, model in enumerate(models):
            ps = metrics["per_model_domain"].get(f"{model}_{domain}", {}).get("per_subtopic", {})
            for i, st in enumerate(subtopics):
                if st in ps:
                    grid[i, j] = ps[st]["accuracy"]

        fig, ax = plt.subplots(figsize=(9, max(5, len(subtopics) * 0.5)))
        masked = np.ma.masked_invalid(grid)
        cmap = plt.cm.RdYlGn.copy()
        cmap.set_bad("#eeeeee")
        im = ax.imshow(masked, cmap=cmap, vmin=0, vmax=1, aspect="auto")
        ax.set_xticks(range(len(models)), [MODEL_LABELS[m] for m in models], rotation=20)
        ax.set_yticks(range(len(subtopics)), subtopics)
        for i in range(len(subtopics)):
            for j in range(len(models)):
                if not np.isnan(grid[i, j]):
                    ax.text(j, i, f"{grid[i, j]:.2f}", ha="center", va="center",
                            fontsize=8, color="black")
        ax.set_title(f"Subtopic accuracy — {DOMAIN_LABEL[domain]}")
        fig.colorbar(im, ax=ax, label="Accuracy", shrink=0.7)
        save(fig, f"subtopic_failure_heatmap_{domain}")


# ----------------------------------------------------------------------------------------
# Graph 7 — leaderboard
# ----------------------------------------------------------------------------------------
def graph_leaderboard(metrics):
    board = metrics["leaderboard"]
    models = [r["model"] for r in board]
    fide = np.array([r["fide_accuracy"] for r in board])
    fia = np.array([r["fia_accuracy"] for r in board])
    composite = [r["composite_score"] for r in board]
    y = np.arange(len(models))[::-1]  # best on top

    fig, ax = plt.subplots(figsize=(11, 6))
    ax.barh(y, fide, height=0.6, color="#3b82f6", label="FIDE accuracy")
    ax.barh(y, fia, height=0.6, left=fide, color="#ef4444", label="FIA accuracy")
    for yi, r in zip(y, board):
        ax.text(fide[list(y).index(yi)] + fia[list(y).index(yi)] + 0.02, yi,
                f"composite {r['composite_score']:.3f}", va="center", fontsize=9)
    ax.set_yticks(y, [MODEL_LABELS[m] for m in models])
    ax.set_xlabel("Stacked accuracy (FIDE + FIA)")
    ax.set_title("Model leaderboard — composite calibration+accuracy score")
    ax.legend(loc="lower right")
    save(fig, "model_leaderboard")


def main() -> None:
    if not METRICS_JSON.exists() or not MASTER_CSV.exists():
        print("Need metrics.json and master_results.csv. Run compute_metrics.py "
              "(or the mock generator) first.")
        return
    metrics, df = load()
    print("Rendering graphs ->", GRAPHS_DIR)
    graph_calibration_curves(metrics)
    graph_overconfidence_heatmap(metrics, df)
    graph_calibration_gap_bar(metrics)
    graph_dangerous_zone_scatter(df)
    graph_accuracy_by_tier(metrics)
    graph_subtopic_heatmaps(metrics)
    graph_leaderboard(metrics)
    print("All graphs rendered.")


if __name__ == "__main__":
    main()
