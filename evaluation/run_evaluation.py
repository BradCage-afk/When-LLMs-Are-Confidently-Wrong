#!/usr/bin/env python3
"""Run the two-prompt (answer + confidence) evaluation across all models and domains.

For every question and every model with a configured API key we:
  1. Send Prompt A (answer extraction) and capture the answer.
  2. Send Prompt B (confidence extraction) in the SAME conversation and parse JSON.

Raw results are written per model per domain to evaluation/results/<model>_<domain>_raw.json.
The script is resumable (already-scored question ids are skipped), retries API calls with
exponential backoff, and shows a tqdm progress bar.

Usage:
    python evaluation/run_evaluation.py                # all models, both domains
    python evaluation/run_evaluation.py --models gpt4o claude_sonnet
    python evaluation/run_evaluation.py --domains fide
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:  # pragma: no cover - dotenv is optional at runtime
    pass

try:
    from tqdm import tqdm
except Exception:  # pragma: no cover
    def tqdm(iterable, **_kwargs):  # type: ignore
        return iterable

ROOT = Path(__file__).resolve().parents[1]
BENCHMARK_DIR = ROOT / "benchmark"
RESULTS_DIR = ROOT / "evaluation" / "results"

PROMPT_A_TEMPLATE = (
    "You are being tested on your knowledge of {domain_label}.\n"
    "Answer the following question as precisely and concisely as possible. "
    "Do not hedge. Give a direct answer.\n\n"
    "Question: {question}\n\n"
    "Answer:"
)

PROMPT_B = (
    "Now rate your confidence in the answer you just gave.\n\n"
    "Respond in this exact JSON format and nothing else:\n"
    "{\n"
    '  "confidence_percent": <0-100>,\n'
    '  "reasoning": "<one sentence explaining your confidence level>"\n'
    "}"
)

DOMAIN_LABELS = {
    "fide": "FIDE Laws of Chess",
    "fia": "FIA Formula 1 Regulations",
}

# --------------------------------------------------------------------------------------
# Model registry. Each model exposes a `chat` callable taking a list of
# {"role", "content"} messages and returning the assistant text. Missing API keys make
# `available()` return False so the model is skipped.
# --------------------------------------------------------------------------------------

MAX_RETRIES = 5
BASE_DELAY = 2.0


def with_backoff(fn: Callable[[], str]) -> str:
    """Call fn with exponential backoff retries."""
    last_err: Optional[Exception] = None
    for attempt in range(MAX_RETRIES):
        try:
            return fn()
        except Exception as err:  # noqa: BLE001 - we want to retry on any API error
            last_err = err
            delay = BASE_DELAY * (2 ** attempt)
            sys.stderr.write(
                f"  ! API error (attempt {attempt + 1}/{MAX_RETRIES}): {err}. "
                f"Retrying in {delay:.0f}s\n"
            )
            time.sleep(delay)
    raise RuntimeError(f"All retries failed: {last_err}")


class Model:
    key: str = ""
    display: str = ""
    env_var: str = ""

    def available(self) -> bool:
        return bool(os.getenv(self.env_var))

    def chat(self, messages: list[dict]) -> str:  # pragma: no cover - network
        raise NotImplementedError


class OpenAIModel(Model):
    key, display, env_var = "gpt4o", "GPT-4o", "OPENAI_API_KEY"
    model_id = "gpt-4o"

    def chat(self, messages):
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv(self.env_var))
        resp = client.chat.completions.create(
            model=self.model_id, messages=messages, temperature=0, max_tokens=600
        )
        return resp.choices[0].message.content or ""


class ClaudeModel(Model):
    key, display, env_var = "claude_sonnet", "Claude Sonnet", "ANTHROPIC_API_KEY"
    model_id = "claude-sonnet-4-20250514"

    def chat(self, messages):
        import anthropic
        client = anthropic.Anthropic(api_key=os.getenv(self.env_var))
        system = "".join(m["content"] for m in messages if m["role"] == "system")
        convo = [m for m in messages if m["role"] != "system"]
        resp = client.messages.create(
            model=self.model_id,
            system=system or anthropic.NOT_GIVEN,
            messages=convo,
            max_tokens=600,
            temperature=0,
        )
        return "".join(block.text for block in resp.content if block.type == "text")


class GeminiModel(Model):
    key, display, env_var = "gemini", "Gemini 1.5 Pro", "GEMINI_API_KEY"
    model_id = "gemini-1.5-pro"

    def chat(self, messages):
        import google.generativeai as genai
        genai.configure(api_key=os.getenv(self.env_var))
        model = genai.GenerativeModel(self.model_id)
        # Gemini uses "user"/"model" roles; map history accordingly.
        history = []
        for m in messages:
            role = "user" if m["role"] in ("user", "system") else "model"
            history.append({"role": role, "parts": [m["content"]]})
        resp = model.generate_content(
            history,
            generation_config={"temperature": 0, "max_output_tokens": 600},
        )
        return resp.text or ""


class LlamaModel(Model):
    key, display, env_var = "llama3", "Llama 3 70B", "GROQ_API_KEY"
    model_id = "llama3-70b-8192"

    def chat(self, messages):
        from groq import Groq
        client = Groq(api_key=os.getenv(self.env_var))
        resp = client.chat.completions.create(
            model=self.model_id, messages=messages, temperature=0, max_tokens=600
        )
        return resp.choices[0].message.content or ""


class MistralModel(Model):
    key, display, env_var = "mistral", "Mistral Large", "MISTRAL_API_KEY"
    model_id = "mistral-large-latest"

    def chat(self, messages):
        from mistralai import Mistral
        client = Mistral(api_key=os.getenv(self.env_var))
        resp = client.chat.complete(
            model=self.model_id, messages=messages, temperature=0, max_tokens=600
        )
        return resp.choices[0].message.content or ""


class GroqChatModel(Model):
    """Generic Groq-hosted chat model. Free tier — one key serves many models."""
    env_var = "GROQ_API_KEY"

    def __init__(self, key: str, display: str, model_id: str):
        self.key = key
        self.display = display
        self.model_id = model_id

    def chat(self, messages):
        from groq import Groq
        client = Groq(api_key=os.getenv(self.env_var))
        resp = client.chat.completions.create(
            model=self.model_id, messages=messages, temperature=0, max_tokens=700
        )
        text = resp.choices[0].message.content or ""
        # Strip reasoning <think>...</think> blocks emitted by some models (e.g. Qwen3).
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
        return text


# Free, real lineup served by Groq. Includes OpenAI's open-weight gpt-oss models as the
# zero-cost stand-in for the (paid) GPT-4o slot. Closed models (GPT-4o, Claude, Mistral
# Large) have no free tier, so they are intentionally omitted.
MODELS: dict[str, Model] = {
    m.key: m
    for m in (
        GroqChatModel("gpt_oss_120b", "GPT-OSS 120B", "openai/gpt-oss-120b"),
        GroqChatModel("llama33_70b", "Llama 3.3 70B", "llama-3.3-70b-versatile"),
        GroqChatModel("llama4_scout", "Llama 4 Scout", "meta-llama/llama-4-scout-17b-16e-instruct"),
        GroqChatModel("qwen3_32b", "Qwen3 32B", "qwen/qwen3-32b"),
        GroqChatModel("gpt_oss_20b", "GPT-OSS 20B", "openai/gpt-oss-20b"),
    )
}


def parse_confidence(text: str) -> Optional[int]:
    """Extract an integer confidence_percent from a (possibly noisy) JSON-ish string."""
    if not text:
        return None
    match = re.search(r"\{.*\}", text, re.DOTALL)
    candidate = match.group(0) if match else text
    try:
        data = json.loads(candidate)
        val = data.get("confidence_percent")
        if val is not None:
            return max(0, min(100, int(round(float(val)))))
    except Exception:  # noqa: BLE001 - fall through to regex
        pass
    num = re.search(r"confidence_percent\D+(\d{1,3})", text)
    if num:
        return max(0, min(100, int(num.group(1))))
    return None


def load_questions(domain: str) -> list[dict]:
    path = BENCHMARK_DIR / f"{domain}_questions.json"
    if not path.exists():
        raise FileNotFoundError(f"Missing benchmark file: {path}")
    return json.loads(path.read_text())


def load_existing(result_path: Path) -> dict[str, dict]:
    if not result_path.exists():
        return {}
    try:
        rows = json.loads(result_path.read_text())
        return {row["question_id"]: row for row in rows}
    except Exception:  # noqa: BLE001 - corrupt/partial file -> start fresh
        return {}


def evaluate(model: Model, domain: str) -> None:
    questions = load_questions(domain)
    result_path = RESULTS_DIR / f"{model.key}_{domain}_raw.json"
    existing = load_existing(result_path)
    domain_label = DOMAIN_LABELS[domain]

    pending = [q for q in questions if q["id"] not in existing]
    if not pending:
        print(f"  {model.display} / {domain}: already complete ({len(existing)} rows)")
        return

    print(f"  {model.display} / {domain}: {len(pending)} pending, {len(existing)} cached")
    for q in tqdm(pending, desc=f"{model.key}:{domain}", unit="q"):
        prompt_a = PROMPT_A_TEMPLATE.format(domain_label=domain_label, question=q["question"])
        convo = [{"role": "user", "content": prompt_a}]

        answer = with_backoff(lambda: model.chat(convo))
        convo.append({"role": "assistant", "content": answer})
        convo.append({"role": "user", "content": PROMPT_B})
        confidence_raw = with_backoff(lambda: model.chat(convo))

        existing[q["id"]] = {
            "question_id": q["id"],
            "model": model.key,
            "domain": domain,
            "prompt_a_response": answer,
            "prompt_b_response": confidence_raw,
            "confidence_percent": parse_confidence(confidence_raw),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        # Persist after every question so the run is resumable on crash.
        result_path.write_text(json.dumps(list(existing.values()), indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--models", nargs="+", choices=list(MODELS), default=list(MODELS))
    parser.add_argument("--domains", nargs="+", choices=["fide", "fia"], default=["fide", "fia"])
    args = parser.parse_args()

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    active = []
    for key in args.models:
        model = MODELS[key]
        if model.available():
            active.append(model)
        else:
            print(f"  - skipping {model.display}: {model.env_var} not set")

    if not active:
        print("No models have API keys configured. Set keys in .env or run the mock "
              "pipeline:  python mock/generate_mock_data.py")
        return

    for model in active:
        for domain in args.domains:
            evaluate(model, domain)

    print("Done. Raw results in", RESULTS_DIR)


if __name__ == "__main__":
    main()
