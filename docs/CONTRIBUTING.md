# Contributing

## Prerequisites

- Python 3.11+
- Node.js 20+
- Supabase account (cloud-hosted PostgreSQL)

## Setup

```bash
# 1. Clone and enter project
git clone <repo-url> && cd Blood_bank_Prediction

# 2. Backend — create venv, install deps
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Frontend
cd frontend && npm install && cd ..

# 4. Environment
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY
```

## Running

```bash
# Backend API (port 5001)
python3 api/app.py

# Frontend dev server (port 5173, proxies /api → :5001)
cd frontend && npm run dev
```

## Available Commands

### Backend

| Command | Description |
|---------|-------------|
| `python3 api/app.py` | Start Flask API on :5001 |
| `python3 run_train.py` | Train all ML models (SES, XGBoost, Isolation Forest) |
| `python3 run_train.py --from-csv path/to/file.csv` | Train from local file instead of Supabase |
| `python3 ingest/ingest_file.py path/to/file.xlsx` | Ingest an Excel/CSV/Numbers file into Supabase |
| `pytest` | Run Python test suite |
| `pytest tests/test_upload_routes.py` | Run a single test file |

### Frontend

| Command | Description |
|---------|-------------|
| `cd frontend && npm run dev` | Start Vite dev server with HMR |
| `cd frontend && npm run build` | TypeScript check + production build |
| `cd frontend && npm run lint` | ESLint check |
| `cd frontend && npm run preview` | Preview production build |

### ML Pipeline (standalone scripts)

| Script | Description |
|--------|-------------|
| `ml/scripts/train.py` | Train models (run via `run_train.py` for correct module paths) |
| `ml/scripts/predict.py` | Generate forecasts, ML alerts, replenishment plan |
| `ml/scripts/preprocess.py` | Feature engineering from daily_summary |
| `ml/scripts/seasonal.py` | Weekly/monthly seasonal decomposition |

## Testing

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run a specific test file
pytest tests/test_upload_routes.py
```

Tests use `pytest` with Flask test client. No database mocking — tests hit a real Supabase instance (requires valid `.env`).

## Environment Variables

<!-- AUTO-GENERATED — do not edit manually -->
See `.env.example` for the full list.

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon/public key |
| `GROQ_API_KEY` | Yes | Groq API key for AI prediction summaries |
<!-- /AUTO-GENERATED -->

## Code Style

- **Python**: PEP 8, type annotations on function signatures
- **Frontend**: TypeScript strict mode, ESLint + react-hooks + react-refresh plugins
- **Commits**: Conventional commits (`feat:`, `fix:`, `refactor:`, etc.)

## PR Checklist

- [ ] All tests pass (`pytest`)
- [ ] Frontend builds (`cd frontend && npm run build`)
- [ ] No lint errors (`cd frontend && npm run lint`)
- [ ] `.env` secrets not committed
