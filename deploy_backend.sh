#!/usr/bin/env bash
# Deploys the Flask backend to its own Vercel project (blood-bank-api).
# The repo-root vercel.json belongs to the frontend project, so the backend is
# staged into a temp dir with its own entrypoint and config.
# Usage: ./deploy_backend.sh [--prod]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
STAGE="${TMPDIR:-/tmp}/blood-bank-api-stage"
PROJECT="blood-bank-api"

rm -rf "$STAGE" && mkdir -p "$STAGE"
cp -R "$ROOT"/{api,db,services,ml,models,shared,data} "$STAGE"/

# Lean requirements: CPU-only xgboost (the default wheel pulls ~GBs of CUDA libs),
# and no gunicorn / numbers-parser, which the serverless API does not use.
grep -viE '^(xgboost|gunicorn|numbers-parser)' "$ROOT/requirements.txt" > "$STAGE/requirements.txt"
echo 'xgboost-cpu>=2.1.0' >> "$STAGE/requirements.txt"
find "$STAGE" -name __pycache__ -prune -exec rm -rf {} +

cat > "$STAGE/index.py" <<'EOF'
from api.app import create_app

app = create_app()
EOF

cd "$STAGE"
vercel link --yes --project "$PROJECT" >/dev/null
vercel deploy "${@}" --yes
