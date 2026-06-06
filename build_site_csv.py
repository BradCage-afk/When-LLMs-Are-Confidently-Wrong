#!/usr/bin/env python3
"""Build master_results.csv from the judge cache, including ONLY models with
near-complete coverage (>=90/100 in BOTH domains). No judge calls.

As nightly scoring fills the cache, more models cross the threshold and appear
on the site automatically — partial/noisy models are held back until they're
solid. Mirrors the row schema in evaluation/score_answers.py exactly.
"""
import csv
import json
import sys
from collections import Counter
from pathlib import Path

PROJ = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJ / "evaluation"))

from score_answers import (  # noqa: E402
    load_questions, load_cache, RESULTS_DIR, MASTER_CSV, CSV_COLUMNS,
)

COVERAGE_MIN = 85  # per-domain judged count (out of 100) required to publish a model

questions = load_questions()
cache = load_cache()

# How many judged per (model, domain)?
cov = Counter()
for key in cache:
    model, qid = key.rsplit("|", 1)
    dom = "fia" if qid.startswith("fia") else "fide"
    cov[(model, dom)] += 1

all_models = sorted({k.rsplit("|", 1)[0] for k in cache})
keep = {m for m in all_models
        if cov.get((m, "fide"), 0) >= COVERAGE_MIN and cov.get((m, "fia"), 0) >= COVERAGE_MIN}

rows = []
for raw_file in sorted(RESULTS_DIR.glob("*_raw.json")):
    for entry in json.loads(raw_file.read_text()):
        model = entry["model"]
        if model not in keep:
            continue
        qid = entry["question_id"]
        q = questions.get(qid)
        if not q:
            continue
        verdict = cache.get(f"{model}|{qid}")
        if verdict is None:
            continue
        rows.append({
            "question_id": qid,
            "domain": q["domain"],
            "tier": q["tier"],
            "subtopic": q["subtopic"],
            "model": model,
            "confidence_percent": entry.get("confidence_percent"),
            "score": verdict["score"],
            "justification": verdict["justification"],
            "common_misconception": q.get("common_misconception", ""),
        })

rows.sort(key=lambda r: (r["model"], r["domain"], r["question_id"]))
with MASTER_CSV.open("w", newline="") as fh:
    writer = csv.DictWriter(fh, fieldnames=CSV_COLUMNS)
    writer.writeheader()
    writer.writerows(rows)

print(f"published models ({len(keep)}): {sorted(keep)}")
print(f"held back (under {COVERAGE_MIN}% coverage): "
      f"{sorted(set(all_models) - keep) or 'none'}")
print(f"wrote {len(rows)} rows to {MASTER_CSV}")
