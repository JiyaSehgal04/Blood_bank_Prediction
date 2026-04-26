# Runbook

## Deployment

This is a local/development deployment (no Docker or CI/CD pipeline yet).

```bash
# 1. Set up environment
cp .env.example .env  # fill in credentials

# 2. Start backend
source .venv/bin/activate
python3 api/app.py    # runs on :5001

# 3. Start frontend (separate terminal)
cd frontend && npm run dev  # runs on :5173, proxies /api → :5001

# 4. Train ML models (first time or after data updates)
python3 run_train.py
```

## Health Checks

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /health` | API liveness | `{"status": "ok", "version": "v3"}` |
| `GET /api/routes` | Route registry | JSON list of all registered routes |
| `GET /api/dashboard/stats` | Full system stats | Aggregated inventory, donors, alerts |

## Architecture Quick Reference

```
Frontend (:5173) ──proxy──► Flask API (:5001) ──► Supabase (cloud)
                                                   ├── blood_inventory
                                                   ├── donors / donations
                                                   ├── allocation_log / wastage_log
                                                   ├── daily_summary
                                                   ├── predictions / alerts
                                                   └── upload_history
```

## Common Issues

### "ERROR: supabase package not installed"
```bash
pip install -r requirements.txt
```

### "ERROR: SUPABASE_URL and SUPABASE_KEY must be set"
Check `.env` file exists at project root with valid credentials.

### Predictions return "not_trained"
```bash
python3 run_train.py  # train models from daily_summary data
```
Requires 14+ days of data for Isolation Forest, 30+ for XGBoost.

### Groq summary returns 503
- Check `GROQ_API_KEY` in `.env`
- Groq may be rate-limited; summary is non-critical (rest of app works without it)

### Frontend shows stale data after upload
- Fixed in latest version: cache invalidation now runs unconditionally after successful upload
- Hard refresh (Cmd+Shift+R) as fallback

### Upload fails with "Unsupported file type"
- Only `.csv` and `.xlsx` files accepted via `/api/upload`
- For `.numbers` files, use CLI: `python3 ingest/ingest_file.py file.numbers`

### Predictions summary returns 500 after Groq call
- Fixed: Supabase queries now wrapped in try/except to prevent httpx connection pool contamination
- Returns partial data instead of crashing

## Database Schema

See `docs/CODEMAPS/data.md` for full schema. Key tables:

| Table | Purpose |
|-------|---------|
| `blood_inventory` | All blood units (primary data) |
| `daily_summary` | ML training data (one row per date+group+component) |
| `predictions` | ML forecast output |
| `alerts` | Stock/expiry/ML alerts |

## Rollback

No automated rollback. Manual steps:

1. **Backend**: `git checkout <previous-commit> -- api/ services/ ml/` and restart
2. **Frontend**: `git checkout <previous-commit> -- frontend/src/` and rebuild
3. **Database**: Supabase dashboard → rollback via SQL or restore from backup

## Data Ingestion Paths

| Method | Endpoint/CLI | File Types |
|--------|-------------|------------|
| Web upload | `POST /api/upload` | `.csv`, `.xlsx` |
| CLI ingest | `python3 ingest/ingest_file.py <path>` | `.csv`, `.xlsx`, `.xls`, `.numbers` |
| Manual entry | `POST /api/inventory` | JSON body |

## Alert Severity Levels

| Severity | Meaning | Example |
|----------|---------|---------|
| CRITICAL | Immediate action required | Zero stock, unit expired |
| HIGH | Action needed soon | Low stock (<3 units), ML shortage forecast |
| MEDIUM | Awareness | Expiry warning (>20% expiring in 7d) |
| LOW | Informational | Surplus detected |
