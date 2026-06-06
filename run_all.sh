#!/usr/bin/env bash
# End-to-end pipeline: evaluation -> scoring -> metrics -> graphs -> website sync.
#
# With API keys in .env this runs the real evaluation. With no keys, run the mock
# pipeline instead:   python mock/generate_mock_data.py && python analysis/generate_graphs.py
#
# Usage:  ./run_all.sh
set -euo pipefail
cd "$(dirname "$0")"

PY=${PYTHON:-python3}

echo "==> [1/5] Running model evaluation (Phase 3)"
$PY evaluation/run_evaluation.py

echo "==> [2/5] Scoring answers with the GPT-4o judge (Phase 4)"
$PY evaluation/score_answers.py

echo "==> [3/5] Computing calibration metrics (Phase 5)"
$PY analysis/compute_metrics.py

echo "==> [4/5] Rendering graphs (Phase 6)"
$PY analysis/generate_graphs.py

echo "==> [5/5] Syncing outputs into the website"
mkdir -p website/public/data website/public/graphs website/public/benchmark
cp analysis/metrics.json        website/public/data/metrics.json
cp analysis/master_results.csv  website/public/data/master_results.csv
cp analysis/graphs/*.png        website/public/graphs/ 2>/dev/null || true
cp benchmark/fide_questions.json website/public/benchmark/ 2>/dev/null || true
cp benchmark/fia_questions.json  website/public/benchmark/ 2>/dev/null || true

echo "Done. Preview the site with:  cd website && npm run dev"
