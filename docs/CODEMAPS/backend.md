<!-- Generated: 2026-04-26 | Files scanned: 28 | Token estimate: ~950 -->

# Backend Architecture

## Routes (Flask Blueprints, prefix `/api`)

### Inventory (`api/routes/inventory.py`)
```
GET  /api/inventory       → list_inventory()     → Supabase blood_inventory
POST /api/inventory       → add_single_unit()    → clean_raw_rows() → upsert
GET  /api/multilist/summary → multilist_summary() → MultiListInventory
```

### Upload (`api/routes/upload.py`)
```
POST /api/upload          → upload_file()        → parse xlsx/csv → clean → upsert → backfill → predict
GET  /api/upload/history  → upload_history()     → upload_history table
```
Post-upload pipeline: `SummaryService.backfill()` → `MLPredictor.predict_all()` → `MLPredictor.run_ml_alerts()`
Note: bulk-load endpoint removed (2026-04-26)

### Allocation (`api/routes/allocate.py`)
```
POST /api/allocate        → allocate()           → AllocationService.allocate_now()
GET  /api/allocations     → list_allocations()   → allocation_log table
```

### Donors (`api/routes/donors.py`)
```
GET  /api/donors          → list_donors()        → DonorService.list_donors()
POST /api/donors          → create_donor()       → DonorService.create_donor()
GET  /api/donors/:id      → get_donor()          → DonorService.get_donor() + donation history
PUT  /api/donors/:id      → update_donor()       → DonorService.update_donor()
GET  /api/donors/:id/donations → get_donations() → DonorService.get_donation_history()
POST /api/donors/:id/donations → record_donation() → DonorService.record_donation()
```

### Predictions (`api/routes/predictions.py`)
```
GET  /api/predictions          → get_predictions()     → predictions table
POST /api/predictions/run      → run_predictions()     → MLPredictor.predict_all()
GET  /api/predictions/seasonal → seasonal_report()     → daily_summary table
GET  /api/predictions/anomalies → get_anomalies()      → MLPredictor.detect_anomalies()
GET  /api/replenishment        → replenishment()       → MLPredictor.replenishment_plan()
GET  /api/predictions/summary  → predictions_summary() → Groq LLM (llama-3.3-70b)
```
Changes (2026-04-26): Supabase queries for `preds` and `alerts` wrapped in try/except blocks
(previously unguarded; caused 500 on httpx connection pool contamination from Groq HTTP/2 resets)

### Alerts (`api/routes/alerts.py`)
```
GET  /api/alerts           → list_alerts()        → alerts table (filterable by severity, resolved)
PUT  /api/alerts/:id/resolve → resolve_alert()   → AlertService.resolve_alert()
POST /api/alerts/scan       → run_scan()          → AlertService.run_stock_alerts() + ExpiryService.run_daily_scan()
```

### Dashboard (`api/routes/dashboard.py`)
```
GET  /api/dashboard/stats  → dashboard_stats()    → aggregates from blood_inventory, donors, allocation_log, alerts, upload_history
```

### Auth (`api/routes/auth.py`)
```
POST /api/auth/login       → login()              → SHA256 hardcoded credentials → in-memory session token
POST /api/auth/logout      → logout()             → remove token from _SESSIONS dict
```

### Utility
```
GET  /health               → {"status": "ok"}
GET  /api/routes            → list all registered routes
```

## Service Layer

| Service | File | Responsibility |
|---------|------|---------------|
| AllocationService | `services/allocation_service.py` | Priority queue + compatibility matrix + expiry-aware unit selection |
| AlertService | `services/alert_service.py` | Stock-level + screening alerts (threshold-based) |
| ExpiryService | `services/expiry_service.py` | Daily expiry scan via GlobalExpiryList, wastage logging |
| SummaryService | `services/summary_service.py` | Builds daily_summary from inventory, allocation, wastage tables |
| DonorService | `services/donor_service.py` | Donor CRUD + 56-day eligibility check + donation linking |

## Allocation Engine

Priority heap: Emergency(0) > Urgent(1) > Routine(2), FIFO tie-break.
Compatibility fallback: if exact group exhausted, tries donor-compatible groups.
Alert raised on unmet/partial allocation (CRITICAL for emergency, HIGH otherwise).

## Auth
Simple hardcoded `admin:bloodbank2026` with SHA256 hash. In-memory token store. Not production-grade.

## Error Handling Updates (2026-04-26)
- **predictions_summary()**: Supabase query failures no longer crash endpoint (returns partial data with empty arrays instead of 500)
- **Frontend cache invalidation**: Upload.tsx now invalidates caches unconditionally on success, not conditionally on row count
- **Predictions page**: Loading state properly managed in error paths to prevent UI lockup
