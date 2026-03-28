# Runbook

Operational reference for the Blood Bank Inventory & Distribution system.

## Health Checks

| Endpoint | Expected response |
|----------|-------------------|
| `GET http://localhost:5001/health` | `{"status": "ok", "version": "v3"}` |
| `GET http://localhost:5001/api/routes` | Full route list |
| `GET http://localhost:5001/api/dashboard/stats` | KPI JSON (non-empty `inventory.total`) |

## Starting the System

```bash
# 1. API
python3 api/app.py
# Expect: "Blood Bank API v3 — http://localhost:5001"

# 2. Frontend (separate terminal)
cd frontend && npm run dev
# Expect: "Local: http://localhost:5173/"
```

Both must be running. The frontend makes CORS requests to port 5001.

## Common Issues

### Dashboard shows "Failed to load dashboard"

The Flask API is not reachable. Check:
```bash
curl http://localhost:5001/health
```
If this fails, restart `python3 api/app.py`. If the port is in use:
```bash
lsof -i :5001   # find the PID
kill <PID>
python3 api/app.py
```

### Inventory count appears stuck or lower than expected

Supabase's PostgREST caps unranged queries at 1,000 rows. All data-fetching queries in `api/routes/dashboard.py` and `services/summary_service.py` use explicit `.limit(10000)` or `.range()` pagination to work around this. If you add new queries and see a suspiciously round number, add `.limit(10000)`.

### Predictions not updating after upload

1. Check the upload response JSON — it should include `"predictions_generated": N` where N > 0
2. If N = 0, check Flask console for `Warning: post-upload predictions failed:`
3. Verify model files exist: `ls ml/models/` — should show `xgb_*.joblib`, `ses_*.joblib`, `isolation_forest_*.joblib`
4. If model files are missing, retrain: `python3 ml/scripts/train.py --from-csv step1_data_cleaning/cleaned_records.csv`

### Upload returns 422

The file could not be parsed. Supported formats: `.numbers`, `.xlsx`, `.xls`, `.csv`. For Excel files, verify the first row is a header row and the sheet is the active sheet.

### `daily_summary` table is empty

Run the backfill manually:
```bash
python3 services/summary_service.py
```
This rebuilds `daily_summary` from `blood_inventory` (using `collection_date` as the arrival date). Re-run after any bulk load.

### Supabase connection error (`SUPABASE_URL` or `SUPABASE_KEY` missing)

Ensure `.env` exists in the project root:
```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<anon-or-service-role-key>
```
`python-dotenv` loads this automatically when the Flask app or ML scripts start.

## Deployment Procedures

This project is designed for local/on-premise operation. For a hosted deployment:

1. Set `SUPABASE_URL` and `SUPABASE_KEY` as environment variables on the server
2. Build the frontend: `cd frontend && npm run build` → serve `dist/` as static files
3. Run Flask behind a WSGI server (e.g. gunicorn): `gunicorn -w 2 -b 0.0.0.0:5001 "api.app:create_app()"`
4. Update CORS origins in `api/app.py` to match the frontend's production URL

## Retraining ML Models

Training is **offline only** — the web server never triggers retraining.

```bash
python3 ml/scripts/train.py --from-csv step1_data_cleaning/cleaned_records.csv
# Output: ml/models/xgb_*.joblib, ses_*.joblib, isolation_forest_*.joblib
# MAE and RMSE per component printed to stdout
```

After training, restart the Flask API so it picks up the new `.joblib` files on the next prediction run. Predictions run automatically on the next file upload, or manually:
```bash
python3 ml/scripts/predict.py
```

## Rollback

To roll back a bad upload batch:
1. Find the `batch_id` from the `upload_history` table in Supabase
2. Delete rows from `blood_inventory` where `upload_batch_id = '<batch_id>'`
3. Re-run `python3 services/summary_service.py` to rebuild `daily_summary`
4. Re-run `python3 ml/scripts/predict.py` to refresh predictions

## Alert Escalation

Alerts are written to the `alerts` table and visible on the Alerts page. Types and default severities:

| Type | Severity | Trigger |
|------|----------|---------|
| `ml_shortage` | HIGH | Forecast demand > current stock |
| `ml_anomaly` | HIGH | Isolation Forest flags unusual demand |
| `ml_trend_shift` | MEDIUM | >15% week-over-week demand change |
| `ml_surplus` | LOW | Stock > 14-day projected demand |

Resolve alerts via the UI (PUT `/api/alerts/:id/resolve`) or trigger a fresh scan via the "Run Scan" button (POST `/api/alerts/scan`).
