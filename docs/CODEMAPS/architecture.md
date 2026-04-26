<!-- Generated: 2026-04-26 | Files scanned: 45 | Token estimate: ~850 -->

# Architecture Overview

Blood Bank Prediction System — full-stack blood inventory management with ML-powered demand forecasting.

## System Type
Monolithic Flask API + React SPA + ML pipeline. Single repo, single database (Supabase).

## High-Level Data Flow

```
  Excel/CSV ──► POST /api/upload ──► parse & clean ──► Supabase
  Manual Entry ──► POST /api/inventory ──► clean_raw_rows() ──► Supabase

  Supabase ──► SummaryService.backfill() ──► daily_summary table
  daily_summary ──► FeaturePipeline ──► ML models (SES / XGBoost / IF)
  ML models ──► predictions table + alerts table

  React SPA ──► Flask API (port 5001) ──► Supabase
  React SPA ──► Vite dev server (port 5173)
```
Note: bulk-load endpoint removed 2026-04-26 (use direct /api/upload instead)

## Service Boundaries

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React + Vite + Tailwind)                 │
│  Pages: Dashboard, Inventory, Allocate, Donors,      │
│         Predictions, Alerts, Upload, ManualEntry     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP /api/*
┌──────────────────────▼──────────────────────────────┐
│  Flask API (api/)                                    │
│  Blueprints: inventory, upload, allocate, donors,    │
│              predictions, alerts, dashboard, auth     │
└──────────────────────┬──────────────────────────────┘
                       │
     ┌─────────────────┼──────────────────┐
     ▼                 ▼                  ▼
┌─────────┐   ┌──────────────┐   ┌───────────────┐
│Services │   │ML Pipeline   │   │Supabase (DB)  │
│ alloc   │   │ train.py     │   │ 9 tables      │
│ alert   │   │ predict.py   │   │ Port 443      │
│ expiry  │   │ preprocess   │   │ (cloud-hosted) │
│ summary │   │ seasonal     │   └───────────────┘
│ donor   │   └──────────────┘
└─────────┘
```

## Key Entry Points

| Entry | File | Purpose |
|-------|------|---------|
| API server | `api/app.py` | Flask app factory, runs on :5001 |
| Frontend | `frontend/src/main.tsx` | React SPA entry |
| Training | `run_train.py` | CLI: train all ML models |
| Ingestion | `ingest/ingest_file.py` | CLI: load Excel/CSV/Numbers file |
| Data cleaning | `step1_data_cleaning/clean_data.py` | One-time bulk CSV clean |

## Multi-List Data Structure (in-memory)

```
MultiListInventory
├── group_index: HashMap<blood_group → BloodGroupList>  (8 FIFO linked lists)
├── expiry_list: GlobalExpiryList                        (1 sorted linked list)
└── Each BloodUnit node has two next-pointers:
    ├── next_in_group  (FIFO within blood group)
    └── next_in_expiry (sorted by expiry_date ASC)
```

## ML Cold-Start Strategy

| Days of Data | Models Active |
|-------------|---------------|
| 1-14 | SES only (alpha=0.3) |
| 15-29 | SES + Isolation Forest |
| 30+ | Ensemble: 0.7*XGBoost + 0.3*SES + Isolation Forest |
