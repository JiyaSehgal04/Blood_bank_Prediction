# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blood Bank Inventory & Distribution Management system — a full-stack ML-powered application for managing blood inventory, forecasting demand, and optimizing allocation across 8 blood groups and 3 components (WB/PRC, FFP, PLT).

**Stack:** Python Flask + React (Vite/TypeScript) + Supabase + scikit-learn + XGBoost

## Commands

### Backend

```bash
# Run Flask API (port 5001)
python3 api/app.py

# Train ML models offline from cleaned CSV (saves .joblib to ml/models/)
python3 ml/scripts/train.py --from-csv step1_data_cleaning/cleaned_records.csv

# Run predictions & generate alerts
python3 ml/scripts/predict.py

# Bulk load initial data into Supabase
python3 db/initial_load.py

# Install dependencies
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # Vite dev server (port 5173)
npm run build    # Production build
npm run lint     # ESLint
```

### Database

Run `db/schema.sql` once in the Supabase SQL Editor to create all 9 tables, then `python3 db/initial_load.py` for bulk ingestion.

## Architecture

```
React Frontend (Vite, port 5173)
    │ axios HTTP
    ↓
Flask REST API (port 5001)
    │ supabase-py
    ↓
Supabase (PostgreSQL, cloud)
    │
    ↓
ML Pipeline (Python scripts, run as CLI tools)
```

### Layer Responsibilities

**`api/`** — Flask app factory (`app.py`) registers 8 blueprints: `inventory`, `allocate`, `donors`, `predictions`, `alerts`, `dashboard`, `upload`, `auth`. Each blueprint lives in `api/routes/`.

**`services/`** — Business logic decoupled from HTTP: `allocation_service.py` (multi-list allocation engine), `expiry_service.py` (wastage tracking), `summary_service.py` (daily aggregation), `alert_service.py`, `donor_service.py`.

**`ml/scripts/`** — Standalone pipeline:
- `preprocess.py` — reads `daily_summary` table, generates 11 features per blood_group/day (temporal, rolling averages, lag features, stock levels)
- `train.py` — 3-phase cold-start strategy: SES only (days 1–14), SES + Isolation Forest (days 15–29), XGBoost + SES ensemble `0.7*XGB + 0.3*SES` (days 30+). Run offline with `--from-csv`; uploaded data is inference-only.
- `predict.py` — inference, replenishment calculation, writes alerts to Supabase
- `seasonal.py` — statsmodels decomposition (requires 90+ days history)

**`db/`** — `supabase_client.py` initializes the Supabase client from env vars. Key table: `daily_summary` is the ML training source; `predictions` and `alerts` are ML outputs.

**`shared/cleaning_utils.py`** — Blood group normalization and validation used across ingestion and API layers.

**`models/`** — Pydantic/dataclass models: `blood_unit.py` (inventory unit), `multi_list.py` (dual-linked list for FIFO + expiry-sorted traversal).

**`frontend/src/`** — Protected routes via `AuthContext`. Pages: Dashboard (KPIs + Recharts), Inventory (CRUD table), Allocate (compatibility form), Donors, Predictions (forecast + replenishment), Alerts, Upload (Excel drag-and-drop).

### Key Design Decisions

**Multi-List Inventory** (`models/multi_list.py`) — Each blood unit exists in two linked lists simultaneously: a FIFO list per blood group and a global expiry-sorted list. This enables O(1) FIFO dispatch while tracking near-expiry units for wastage control.

**Cold-Start ML** — The 3-phase approach seeds day-1 forecasts with Indian blood type population baselines, preventing cold-start failures before sufficient history accumulates. Models are trained **once offline** (`--from-csv`) and used for inference only; uploading a new file auto-triggers predictions via `_run_post_upload_predictions()`.

**Deduplication** — Excel uploads use `(sno, segment_no, component)` as the unique constraint in `blood_inventory`. Always preserve this when modifying ingestion logic.

**ML-Enhanced Alerts** — 4 alert types: `ml_shortage` (HIGH), `ml_surplus` (LOW), `ml_anomaly` (HIGH, Isolation Forest), `ml_trend_shift` (MEDIUM, >15% week-over-week). Alert generation in `predict.py` must write to both console and Supabase `alerts` table.

## Environment

Requires a `.env` file (not committed) with Supabase credentials:
```
SUPABASE_URL=...
SUPABASE_KEY=...
```

The Flask API reads these via `python-dotenv`. Frontend API calls target `http://localhost:5001` by default.

## Dataset Context

- 2,448 records over 76 days (Dec 2025 – Feb 2026), 1,163 unique donors
- Blood group distribution is skewed: O Pos (34.7%), B Pos (28.8%), A Pos (21.3%) dominate
- Notable demand spikes: Republic Day (39 donations), World Cancer Day (44), corporate camps — relevant when evaluating anomaly detection results
