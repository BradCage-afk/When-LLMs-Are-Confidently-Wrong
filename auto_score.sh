#!/usr/bin/env bash
# Nightly resume of LLM-calibration judge scoring + site rebuild.
# Installed in crontab to run daily at 12:45 PM IST (07:15 UTC), after the
# Gemini free-tier daily quota resets (~12:30 PM IST). Self-removes when all
# 1000 answers are judged. A flock guard prevents the cache race we hit before.
set -uo pipefail
export PATH=/usr/local/bin:/usr/bin:/bin
export HOME=/home/ajeet

PROJ="/home/ajeet/linkedin type shi/llm-calibration"
LOG="$PROJ/auto_score.log"
LOCK="$PROJ/.auto_score.lock"
cd "$PROJ" || { echo "$(date): cannot cd to project" >>"$LOG"; exit 1; }

# Single-instance guard — never let two scorers write the cache at once.
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(date): another run holds the lock, skipping" >>"$LOG"
  exit 0
fi

count_cache() { python3 -c "import json;print(len(json.load(open('analysis/score_cache.json'))))" 2>/dev/null || echo 0; }

echo "===== run $(date) | cache=$(count_cache)/1000 =====" >>"$LOG"

# Already finished? Rebuild once more, then remove ourselves from cron.
if [ "$(count_cache)" -ge 1000 ]; then
  echo "$(date): all 1000 judged — final rebuild and removing cron entry" >>"$LOG"
  python3 build_site_csv.py        >>"$LOG" 2>&1
  python3 analysis/compute_metrics.py >>"$LOG" 2>&1
  python3 analysis/generate_graphs.py >>"$LOG" 2>&1
  cp analysis/metrics.json analysis/master_results.csv website/public/data/ 2>>"$LOG"
  cp analysis/graphs/* website/public/graphs/ 2>>"$LOG"
  crontab -l 2>/dev/null | grep -v 'auto_score.sh' | crontab -
  echo "$(date): cron entry removed. Done." >>"$LOG"
  exit 0
fi

# Load API keys (Gemini-first judge, Groq fallback).
set -a; . ./.env; set +a

# 1) Judge whatever the day's quota allows (resumes from cache, skips failures).
python3 evaluation/score_answers.py >>"$LOG" 2>&1 || echo "$(date): score_answers rc=$?" >>"$LOG"

# 2) Rebuild site data from the cache (only >=90%-covered models published).
python3 build_site_csv.py           >>"$LOG" 2>&1
python3 analysis/compute_metrics.py >>"$LOG" 2>&1
python3 analysis/generate_graphs.py >>"$LOG" 2>&1

# 3) Push fresh data into the live website (Next.js fetches these at runtime).
cp analysis/metrics.json analysis/master_results.csv website/public/data/ 2>>"$LOG"
cp analysis/graphs/* website/public/graphs/ 2>>"$LOG"

echo "$(date): done | cache=$(count_cache)/1000" >>"$LOG"
