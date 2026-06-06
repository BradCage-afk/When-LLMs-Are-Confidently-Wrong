#!/usr/bin/env python3
"""Score raw model answers against ground truth using a GPT-4o judge.

Reads every evaluation/results/<model>_<domain>_raw.json, scores each model answer
(1.0 / 0.5 / 0.0) with a secondary GPT-4o call, joins in question metadata, and writes
the master results table to analysis/master_results.csv.

The judge cache (analysis/score_cache.json) makes re-runs cheap and resumable.

Usage:
    python evaluation/score_answers.py
"""
from __future__ import annotations

import csv
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:  # pragma: no cover
    pass

try:
    from tqdm import tqdm
except Exception:  # pragma: no cover
    def tqdm(iterable, **_kwargs):  # type: ignore
        return iterable

ROOT = Path(__file__).resolve().parents[1]
BENCHMARK_DIR = ROOT / "benchmark"
RESULTS_DIR = ROOT / "evaluation" / "results"
ANALYSIS_DIR = ROOT / "analysis"
MASTER_CSV = ANALYSIS_DIR / "master_results.csv"
CACHE_PATH = ANALYSIS_DIR / "score_cache.json"

# Judge provider is chosen at runtime: OpenAI GPT-4o if its key is set, otherwise a
# strong free Groq-hosted model (no cost). The judge always scores against the provided
# ground-truth answer, so self-preference bias is minimal.
OPENAI_JUDGE_MODEL = "gpt-4o-mini"
# A non-reasoning model: reasoning models (gpt-oss) burn the token budget on hidden
# reasoning before emitting JSON, which trips Groq's strict json_object validator.
GROQ_JUDGE_MODEL = "llama-3.3-70b-versatile"
# Gemini Flash: generous free daily quota — preferred when Groq's daily cap is hit.
# Tried in order until one is accepted by the account's free tier.
GEMINI_JUDGE_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"]
MAX_RETRIES = 5
BASE_DELAY = 2.0


def judge_provider() -> str:
    # Preference order: a paid OpenAI judge if configured, else Gemini (big free quota),
    # else Groq. Gemini outranks Groq because Groq's daily token cap is easily exhausted.
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    if os.getenv("GEMINI_API_KEY"):
        return "gemini"
    if os.getenv("GROQ_API_KEY"):
        return "groq"
    return "none"

JUDGE_PROMPT = """You are an expert judge scoring an AI model's answer against a ground truth answer.

Question: {question}
Ground Truth Answer: {correct_answer}
Model's Answer: {model_answer}

Score the model's answer:
- 1.0 = Fully correct, captures the essential truth
- 0.5 = Partially correct, right direction but missing key detail or has minor error
- 0.0 = Incorrect or meaningfully wrong

Respond only in this JSON format:
{{
  "score": <1.0 or 0.5 or 0.0>,
  "justification": "<one sentence>"
}}"""

CSV_COLUMNS = [
    "question_id", "domain", "tier", "subtopic", "model",
    "confidence_percent", "score", "justification", "common_misconception",
]


def load_questions() -> dict[str, dict]:
    index: dict[str, dict] = {}
    for domain in ("fide", "fia"):
        path = BENCHMARK_DIR / f"{domain}_questions.json"
        if path.exists():
            for q in json.loads(path.read_text()):
                index[q["id"]] = q
    return index


def load_cache() -> dict[str, dict]:
    if CACHE_PATH.exists():
        try:
            return json.loads(CACHE_PATH.read_text())
        except Exception:  # noqa: BLE001
            return {}
    return {}


def save_cache(cache: dict[str, dict]) -> None:
    CACHE_PATH.write_text(json.dumps(cache, indent=2))


def _judge_call(prompt: str) -> str:
    """Single judge completion. Uses OpenAI if available, else free Groq."""
    provider = judge_provider()
    if provider == "openai":
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        resp = client.chat.completions.create(
            model=OPENAI_JUDGE_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=200,
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content
    if provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        last = None
        for model_id in GEMINI_JUDGE_MODELS:
            try:
                # No response_mime_type: 2.5 models spend tokens on "thinking" and can
                # return no JSON Part under strict mime; instead allow a generous budget
                # and let the lenient parser pull JSON from fenced/normal text.
                model = genai.GenerativeModel(
                    model_id,
                    generation_config={"temperature": 0, "max_output_tokens": 800},
                )
                resp = model.generate_content(prompt)
                return resp.text or ""
            except Exception as err:  # noqa: BLE001 - model not on this tier; try next
                last = err
                continue
        raise RuntimeError(f"All Gemini judge models failed: {last}")
    # Free Groq judge
    from groq import Groq
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    resp = client.chat.completions.create(
        model=GROQ_JUDGE_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        max_tokens=512,
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content


def _parse_verdict(content: str) -> Optional[dict]:
    """Leniently pull {score, justification} from a possibly-noisy judge reply."""
    if not content:
        return None
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
    # Try strict JSON, then the first {...} block, then a bare score regex.
    candidates = [content]
    m = re.search(r"\{.*\}", content, re.DOTALL)
    if m:
        candidates.append(m.group(0))
    for cand in candidates:
        try:
            data = json.loads(cand)
            score = float(data.get("score", 0.0))
            score = min((1.0, 0.5, 0.0), key=lambda s: abs(s - score))
            return {"score": score, "justification": str(data.get("justification", "")).strip()}
        except Exception:  # noqa: BLE001
            continue
    num = re.search(r'"?score"?\s*[:=]\s*(1\.0|0\.5|0\.0|1|0)', content)
    if num:
        score = min((1.0, 0.5, 0.0), key=lambda s: abs(s - float(num.group(1))))
        return {"score": score, "justification": content[:160]}
    return None


def judge(question: str, correct: str, answer: str) -> dict:
    prompt = JUDGE_PROMPT.format(question=question, correct_answer=correct, model_answer=answer)

    last_err: Optional[Exception] = None
    for attempt in range(MAX_RETRIES):
        try:
            verdict = _parse_verdict(_judge_call(prompt))
            if verdict is not None:
                return verdict
            last_err = ValueError("unparseable judge reply")
        except Exception as err:  # noqa: BLE001
            last_err = err
        delay = BASE_DELAY * (2 ** attempt)
        sys.stderr.write(f"  ! judge error (attempt {attempt + 1}): {last_err}; retry in {delay:.0f}s\n")
        time.sleep(delay)
    # Non-fatal: a single stubborn answer must not kill a 1000-row scoring run.
    sys.stderr.write(f"  !! giving up on one answer after {MAX_RETRIES} tries: {last_err}\n")
    return {"score": 0.0, "justification": f"[unscored: judge failed — {last_err}]"}


def main() -> None:
    provider = judge_provider()
    if provider == "none":
        print("No judge key set — need OPENAI_API_KEY or GROQ_API_KEY. For a no-key run use:")
        print("    python mock/generate_mock_data.py")
        return
    judge_name = {
        "openai": OPENAI_JUDGE_MODEL,
        "gemini": GEMINI_JUDGE_MODELS[0],
        "groq": GROQ_JUDGE_MODEL,
    }.get(provider, provider)
    print(f"Judge: {judge_name} (provider: {provider})")

    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    questions = load_questions()
    if not questions:
        print("No benchmark questions found. Generate the dataset first.")
        return

    raw_files = sorted(RESULTS_DIR.glob("*_raw.json"))
    if not raw_files:
        print("No raw result files in", RESULTS_DIR, "- run run_evaluation.py first.")
        return

    cache = load_cache()
    rows: list[dict] = []
    pending = 0

    for raw_file in raw_files:
        entries = json.loads(raw_file.read_text())
        for entry in tqdm(entries, desc=raw_file.stem, unit="ans"):
            qid = entry["question_id"]
            q = questions.get(qid)
            if not q:
                continue
            cache_key = f"{entry['model']}|{qid}"
            if cache_key not in cache:
                verdict = judge(q["question"], q["correct_answer"], entry.get("prompt_a_response", ""))
                # Do NOT cache (or emit) a failed/unscored verdict — leave it pending so a
                # later run (after the daily token budget resets) retries it cleanly.
                if str(verdict.get("justification", "")).startswith("[unscored"):
                    pending += 1
                    continue
                cache[cache_key] = verdict
                save_cache(cache)  # persist incrementally
            verdict = cache[cache_key]
            rows.append({
                "question_id": qid,
                "domain": q["domain"],
                "tier": q["tier"],
                "subtopic": q["subtopic"],
                "model": entry["model"],
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

    print(f"Wrote {len(rows)} scored rows to {MASTER_CSV}")
    if pending:
        print(f"{pending} answers still PENDING (judge token budget exhausted). "
              f"Re-run after the daily limit resets to finish them.")


if __name__ == "__main__":
    main()
