<!-- Generated: 2026-04-26 | Files scanned: 6 | Token estimate: ~500 -->

# Dependencies & Integrations

## Backend (Python)

| Package | Version | Purpose |
|---------|---------|---------|
| flask | >=3.0.0 | REST API framework |
| flask-cors | >=4.0.0 | Cross-origin for SPA |
| supabase | >=2.0.0 | PostgreSQL client (cloud) |
| python-dotenv | >=1.0.0 | .env loading |
| pandas | >=2.0.0 | Data manipulation (ML pipeline) |
| scikit-learn | >=1.3.0 | Isolation Forest (anomaly detection) |
| xgboost | >=2.0.0 | Demand forecasting model |
| joblib | >=1.3.0 | Model serialization (.joblib files) |
| openpyxl | >=3.1.0 | Excel .xlsx reading |
| numbers-parser | >=4.0.0 | Apple Numbers file reading |
| groq | >=0.9.0 | AI summary generation (llama-3.3-70b) |

## Frontend (Node)

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.2 | UI framework |
| react-router-dom | 7.13 | Client-side routing |
| axios | 1.13 | HTTP client |
| recharts | 3.8 | Charts and data visualization |
| lucide-react | 1.7 | Icon library |
| tailwindcss | 4.2 | Utility CSS |
| vite | 8.0 | Build tool / dev server |

## External Services

| Service | Purpose | Config |
|---------|---------|--------|
| Supabase | Primary database (hosted PostgreSQL) | `SUPABASE_URL`, `SUPABASE_KEY` in .env |
| Groq API | AI-powered prediction summaries | `GROQ_API_KEY` in .env |

## Internal Module Dependencies

```
shared/cleaning_utils.py ← used by:
  ├── api/routes/inventory.py
  ├── api/routes/upload.py
  ├── ingest/ingest_file.py
  ├── step1_data_cleaning/clean_data.py
  └── ml/scripts/preprocess.py

db/supabase_client.py ← used by:
  ├── all api/routes/*
  ├── all services/*
  ├── ml/scripts/preprocess.py
  ├── ml/scripts/predict.py
  ├── ml/scripts/seasonal.py
  └── db/initial_load.py

models/multi_list.py ← used by:
  ├── services/allocation_service.py
  ├── services/expiry_service.py
  └── api/routes/alerts.py (for scan)
```

## Model Files (generated, not in git)

Stored in `ml/models/` as .joblib:
- `ses_WB_PRC.joblib` — SES forecaster dict per blood group
- `xgb_WB_PRC.joblib` — XGBoost model
- `isolation_forest_WB_PRC.joblib` — Anomaly detector
- Same pattern for `FFP` and `PLT` components
