# Contributing Guide

## Prerequisites

- Python 3.11+
- Node.js 20+
- A Supabase project (free tier works)

## Setup

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd Blood_bank_Prediction

# 2. Backend dependencies
pip install -r requirements.txt

# 3. Environment variables
cp .env .env.local   # edit with your Supabase credentials
# Required: SUPABASE_URL, SUPABASE_KEY

# 4. Database schema (run once in Supabase SQL Editor)
# Open db/schema.sql and execute it in the Supabase dashboard

# 5. Bulk-load initial data
python3 db/initial_load.py

# 6. Frontend dependencies
cd frontend && npm install
```

## Running Locally

Two processes need to run simultaneously:

```bash
# Terminal 1 — Flask API (port 5001)
python3 api/app.py

# Terminal 2 — Vite dev server (port 5173)
cd frontend && npm run dev
```

Open http://localhost:5173. Default login credentials are in `api/routes/auth.py`.

## Available Commands

<!-- AUTO-GENERATED from api/app.py, frontend/package.json, ml/scripts/ -->

### Backend

| Command | Description |
|---------|-------------|
| `python3 api/app.py` | Start Flask API on port 5001 |
| `python3 ml/scripts/train.py --from-csv step1_data_cleaning/cleaned_records.csv` | Train ML models offline, save `.joblib` to `ml/models/` |
| `python3 ml/scripts/predict.py` | Run inference, write predictions + alerts to Supabase |
| `python3 db/initial_load.py` | Bulk-load `cleaned_records.csv` into Supabase |
| `python3 services/summary_service.py` | Backfill `daily_summary` table from inventory |
| `pip install -r requirements.txt` | Install Python dependencies |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with HMR (port 5173) |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run lint` | ESLint across all `.ts`/`.tsx` files |
| `npm run preview` | Preview production build locally |

<!-- END AUTO-GENERATED -->

## Project Structure

```
api/routes/     — Flask blueprints (one file per resource)
services/       — Business logic (allocation, expiry, summary, alerts)
ml/scripts/     — Standalone ML pipeline (preprocess → train → predict)
ml/models/      — Trained .joblib files (gitignored)
models/         — Python dataclasses (BloodUnit, MultiListInventory)
shared/         — Shared utilities (cleaning_utils.py)
db/             — Supabase client + schema + initial load
frontend/src/   — React pages and components
```

## Making Changes

### Backend

- Add a new route → create a new blueprint in `api/routes/`, register it in `api/app.py`
- Modify ingestion logic → touch `shared/cleaning_utils.py` and/or `ingest/`
- The unique deduplication key for `blood_inventory` is `(sno, segment_no, component)` — **never change this without a migration**
- Supabase queries must use `.limit(10000)` or `.range()` pagination — the default cap is 1,000 rows

### ML Pipeline

- Training is **offline only**: run `train.py --from-csv` to produce new `.joblib` files
- Uploaded files trigger inference automatically via `_run_post_upload_predictions()` in `upload.py`
- Do not add a retrain API endpoint — training is intentionally decoupled from the web server

### Frontend

- Pages live in `frontend/src/pages/`, shared layout in `frontend/src/components/Layout.tsx`
- All API calls go through `frontend/src/lib/api.ts` (axios instance pointed at port 5001)
- Color palette uses Tailwind arbitrary values (e.g. `bg-[#0f1629]`) — see `docs/superpowers/specs/2026-03-28-ui-dark-redesign-design.md` for the full token reference

## Testing

There is no automated test suite yet. Manual verification steps:

1. **Upload pipeline**: POST to `/api/upload` with a CSV → response includes `predictions_generated` > 0
2. **ML inference**: `python3 ml/scripts/predict.py` → check `predictions` and `alerts` tables in Supabase
3. **Dashboard counts**: verify the dashboard reflects the correct unit count (Supabase default limit was a past issue — queries must paginate)
4. **Frontend lint**: `cd frontend && npm run lint` must pass before merging

## Pull Request Checklist

- [ ] `npm run lint` passes in `frontend/`
- [ ] Flask API starts without errors (`python3 api/app.py`)
- [ ] No new hardcoded credentials or API keys
- [ ] Supabase queries use explicit `.limit()` or `.range()` for tables that may exceed 1,000 rows
- [ ] If ML scripts changed, re-run `train.py --from-csv` and commit updated `.joblib` files (or note they need regenerating)
