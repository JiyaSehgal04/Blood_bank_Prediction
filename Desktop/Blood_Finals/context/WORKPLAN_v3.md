# Blood Bank Inventory & Distribution — Complete Workplan (v3)

> **Proposal:** Multi-List–Centric Blood Bank Inventory and Distribution Management  
> **Authors:** Aritra Poddar (RA2311003011383), Jiya Sehgal (RA2311003011375) — C.Tech  
> **Stack:** Python Flask + React (Vite) + Supabase + scikit-learn  

---

## Dataset

| Metric | Value |
|--------|-------|
| File | `blood_bank_register_dec2025_feb2026.xlsx` |
| Total Records | 2,448 |
| Unique Donors (S.No) | 1,163 (S.No 734 – 1896) |
| Days Covered | 76 (01 Dec 2025 – 14 Feb 2026) |
| Blood Groups | O Pos 34.7%, B Pos 28.8%, A Pos 21.3%, AB Pos 6.6%, O Neg 4.1%, A Neg 2.3%, B Neg 1.5%, AB Neg 0.6% |
| Components | WB/PRC 1,163 / FFP 1,163 / PLT 122 |
| Screening Positives | HIV 0.41%, HBsAg 1.47%, HCV 0.65%, Malaria 1.35%, VDRL 0.37% |
| Missing Values | Blood Group: 10, Quantity: 9, Time: 16 |

### Monthly Breakdown

| Month | Records | Donors | Avg Daily |
|-------|---------|--------|-----------|
| Dec 2025 | 815 | 385 | ~12/day |
| Jan 2026 | 1,069 | 510 | ~16/day |
| Feb 2026 (1-14) | 564 | 268 | ~19/day |

### Notable Events in Dataset

| Date | Donations | Event |
|------|-----------|-------|
| 26 Jan | 39 | Republic Day mega drive |
| 04 Feb | 44 | World Cancer Day drive |
| 14 Jan | 35 | Pongal / Sankranti camp |
| 20 Jan | 30 | Army blood donation camp |
| 10 Feb | 35 | Corporate camp - TCS |
| 25 Dec | 2 | Christmas - skeleton staff |
| 01 Jan | 2 | New Year Day - closed |
| 07 Feb | 2 | Staff shortage - low ops |
| 14 Dec | 1 | Heavy rain - low turnout |

### Weekly Pattern

| Day | Factor | Behavior |
|-----|--------|----------|
| Tuesday | 1.10x | Highest - post-weekend backlog |
| Mon/Wed | 1.05x | Above average |
| Thursday | 1.00x | Baseline |
| Friday | 0.95x | Winding down |
| Saturday | 0.60x | Half day |
| Sunday | 0.30x | Emergency only |

---

## Core Principle: Continuous Data Ingestion

Data enters the system three ways. Every component handles all three:

1. **Initial Bulk Load** - Seed the 2,448-record Excel into Supabase on first setup. Gives ML models 76 days of history.
2. **Periodic Excel Upload** - Staff upload new register exports. System parses, validates, deduplicates against existing DB, inserts only new records.
3. **Manual Single-Entry** - Admin adds individual units via UI form. Written to Supabase immediately.

**Dedup key:** `(sno, segment_no, component)` - same file uploaded twice produces zero new inserts.

---

## Timeline

| Week | Phase | Deliverables |
|------|-------|-------------|
| 1 | Setup + Data Layer | Supabase schema, ingestion pipeline, data cleaning, bulk load |
| 2 | Multi-List Core | BloodUnit, FIFO lists, expiry list, hash map index, DB sync |
| 3 | Allocation Engine | Priority queue, compatibility, FIFO+expiry allocation, logging |
| 4 | Flask API + Donors | All REST endpoints, Excel upload route, donor management |
| 5 | ML Models | Feature engineering, Random Forest, Isolation Forest, SES |
| 6 | Predictions API | Forecast routes, seasonal analysis, alerts, replenishment |
| 7 | Frontend | Landing page, login, dashboard, inventory, predictions, upload |
| 8 | Polish + Deploy | Testing, metrics, responsive UI, deployment |

---

## Project Structure

```
Blood_Bank_Predict/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── models/
│   │   │   ├── blood_unit.py
│   │   │   ├── multi_list.py
│   │   │   ├── donor.py
│   │   │   └── prediction.py
│   │   ├── routes/
│   │   │   ├── inventory.py
│   │   │   ├── donors.py
│   │   │   ├── predictions.py
│   │   │   ├── upload.py
│   │   │   ├── allocate.py
│   │   │   └── alerts.py
│   │   ├── services/
│   │   │   ├── supabase_client.py
│   │   │   ├── data_ingestion.py
│   │   │   ├── inventory_service.py
│   │   │   ├── allocation_service.py
│   │   │   ├── prediction_service.py
│   │   │   └── excel_parser.py
│   │   └── utils/
│   │       ├── validators.py
│   │       ├── dedup.py
│   │       └── constants.py
│   ├── requirements.txt
│   ├── run.py
│   └── .env
├── ml/
│   ├── data/
│   ├── models/
│   ├── notebooks/
│   ├── scripts/
│   │   ├── preprocess.py
│   │   ├── train.py
│   │   ├── predict.py
│   │   ├── anomaly.py
│   │   ├── seasonal.py
│   │   ├── evaluate.py
│   │   └── export_training_data.py
│   └── config.yaml
├── blood-bank/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── data/
│   └── blood_bank_register_dec2025_feb2026.xlsx
├── WORKPLAN.md
├── CLAUDE.md
└── README.md
```

---

# Part A - Data Layer & Ingestion (Steps 1-3)

## Step 1: Supabase Schema & Setup

Create 8 tables: `blood_inventory` (with `source` and `upload_batch_id` columns, unique constraint on `sno+segment_no+component`), `donors`, `donations`, `allocation_log`, `wastage_log`, `daily_summary` (ML training data), `predictions`, `alerts`, `upload_history`.

Enable RLS on all tables. Set up `.env` with Supabase credentials.

## Step 2: Data Ingestion Pipeline

**Validation:** Required fields, blood group from valid set, component check, quantity > 0, date format, screening Pos/Neg.

**Dedup:** Match `(sno, segment_no, component)` against DB before insert.

**Three flows:**
- Excel upload: parse → validate → dedup → preview → confirm → insert (source='excel_upload') → log to upload_history → rebuild Multi-List
- Manual entry: form → validate → dedup → insert (source='manual') → add to Multi-List
- Bulk load: script reads full Excel → clean → insert all (source='bulk_load') → backfill daily_summary for 76 days

## Step 3: Data Cleaning

Missing blood_group → null + status 'incomplete'. Missing quantity → null + flagged. Missing time → 'Unknown'. Normalize time casing. Normalize blood group variants ("O+" → "O Pos"). Normalize screening variants ("Negative" → "Neg").

---

# Part B - Inventory Management (Steps 4-11)

## Step 4: Multi-List Data Structure

BloodUnit node with two pointers (group chain + expiry chain). 8 BloodGroupLists (FIFO). 1 GlobalExpiryList (sorted by expiry ASC). BloodGroupIndex HashMap for O(1) lookup. MultiListInventory wraps all. Methods: `load_from_db()`, `add_unit()`, `remove_unit()`, `rebuild()`. DB sync: write DB first, then update lists. Startup: auto-rebuild from Supabase.

## Step 5: Blood Supply Arrival

Create node → append to FIFO tail → insert into expiry list sorted → write to DB. Shelf life: WB/PRC 42d, FFP 365d, PLT 5d.

## Step 6: Expiry Check & Removal

Walk expiry list from head. Expired → status "expired", remove from both lists, log to wastage_log. <3 days → critical alert. <7 days → warning. 122 PLT units in dataset cycle through expiry every 5 days.

## Step 7: Request Queue & Allocation

Min-heap priority queue (emergency=0, urgent=1, routine=2). Allocation: compatibility check O(1) → FIFO from head → prefer nearest-expiry → log to allocation_log. Emergency fallback uses transfusion compatibility matrix.

## Step 8: Logging & Daily Summaries

Real-time: allocation_log, wastage_log, upload_history. Daily summary per (date, blood_group, component): units_received/issued/expired/closing_stock/unmet. Backfill 76 days for seed data = ~1,824 summary rows for ML training.

## Step 9: Donor Management

Donor CRUD. Donations linked to inventory. 56-day eligibility gap. Flask API endpoints.

## Step 10: Alert Generation

Stock < 3 → HIGH. Stock = 0 → CRITICAL. >20% expiring in 7d → MEDIUM. PLT < 2d → HIGH. Screening positive → HIGH. Dedup by (type, group, date).

## Step 11: Flask API

**Inventory:** GET/POST/PUT/DELETE `/api/inventory`, POST `/api/upload`, GET `/api/upload/history`, POST `/api/upload/bulk-load`

**Allocation:** POST `/api/allocate`, GET `/api/allocations`

**Donors:** GET/POST/PUT `/api/donors`, GET `/api/donors/:id`

**Predictions:** GET `/api/predictions`, GET `/api/predictions/seasonal`, GET `/api/predictions/anomalies`, POST `/api/predictions/retrain`, GET `/api/replenishment`

**System:** GET `/api/alerts`, PUT `/api/alerts/:id/resolve`, GET `/api/dashboard/stats`, POST `/api/auth/login`

---

# Part C - ML Prediction Engine (Steps 12-17)

## Step 12: Feature Engineering

From daily_summary: day_of_week, month, is_weekend, is_holiday, rolling_avg_7d, rolling_avg_30d, lag_1d, lag_7d, blood_group_encoded, expiring_within_7d, current_stock_level. Pipeline reads from Supabase — grows automatically as new data is uploaded.

## Step 13: Demand Forecasting

Phase 1 (days 1-14): Exponential smoothing F(t+1) = 0.3*A(t) + 0.7*F(t). Phase 3 (day 30+): Random Forest takes over. With 76-day seed: starts in Phase 3 immediately. RF trains on Tuesday peaks, Sunday troughs, camp spikes, holiday dips.

## Step 14: Anomaly Detection

Isolation Forest (contamination=0.05). 6 known anomalies in dataset: Republic Day spike (39), World Cancer Day (44), Christmas drop (2), New Year (2), staff shortage (2), heavy rain (1). Model should flag all 6.

## Step 15: Seasonal Analysis

76 days = enough for weekly decomposition and monthly trends. Detectable: Dec dip (~12/day) → Jan ramp (~16/day) → Feb peak (~19/day). Tuesday cycle. Camp-day spikes. Monthly reports: heatmap, component trends, wastage, donor activity.

## Step 16: ML-Enhanced Alerts

Shortage (stock < 3-day forecast) → HIGH. Surplus (stock > 14-day) → LOW. Expiry (>20% in 7d) → MEDIUM. Anomaly (IF flag) → HIGH. Trend shift (>15% change) → MEDIUM. Screening positive → HIGH. Replenishment: `max(0, demand_7d + safety_stock - stock + expiring_7d)`.

## Step 17: Simulation Metrics

Fulfillment rate, wastage rate, stock coverage days, emergency response rate, prediction accuracy (MAE/RMSE), inventory turnover. From Supabase via `/api/dashboard/stats`.

---

# Part D - Frontend (Steps 18-24)

## Step 18: Landing Page & Auth

Public landing at `/`. Login at `/login` (admin/bloodbank2026). AuthContext protecting `/dashboard/*`.

## Step 19: Dashboard

4 KPI cards (2,448 units, volume, donors, fulfillment rate). Blood group bar chart with demand comparison. Component donut. Expiry timeline. Supply vs demand. Top 5 alerts.

## Step 20: Inventory Page

CRUD table with search/filter/sort/pagination. Add/Edit modal with expiry auto-calc. Status flow. Expiry highlighting. Positive screening cells in red. Bulk actions.

## Step 21: Allocation Page

Request form (group, component, qty, priority, emergency toggle). Result panel (fulfilled/partial/unmet). History table. Compatibility reference.

## Step 22: Upload & Data Management

Excel drag-and-drop. Auto column mapping. Per-row validation preview (valid/duplicate/error). Import with progress. Upload history table. Bulk load button. Supabase panel (connect/push/pull). SQL schema reference.

## Step 23: Predictions Pages

Forecast: line chart + confidence bands + 8 cards + model info. Seasonal: heatmap + decomposition + insights. Anomaly: timeline (6 dots) + detail panel + history.

## Step 24: Alerts & Settings

Alerts: severity summary, active/resolved tabs, configurable thresholds. Settings: DB connection, ML config (alpha, RF params, retrain schedule), system info, clear data.

---

# Part E - Testing & Deployment (Steps 25-26)

## Step 25: Testing

Ingestion: same file twice → 0 new. Malformed Excel → error. Multi-List: FIFO order, expiry sort, rebuild. Allocation: compatibility, emergency fallback. ML: Republic Day spike detected, forecast accuracy. E2E: upload → dedup → allocate → forecast.

## Step 26: Deployment

Backend: Railway/Render. Frontend: Vercel/Netlify. DB: Supabase cloud. ML: .joblib at startup. CI/CD: GitHub Actions.

---

## Quick Reference

| # | Part | Step | Output |
|---|------|------|--------|
| 1 | A | Supabase Schema | 8 tables |
| 2 | A | Ingestion Pipeline | 3 entry flows, dedup |
| 3 | A | Data Cleaning | Normalization |
| 4 | B | Multi-List | Python classes, DB sync |
| 5 | B | Supply Arrival | add_unit() |
| 6 | B | Expiry Scanner | Daily scan |
| 7 | B | Allocation | Priority queue |
| 8 | B | Daily Summaries | 76 days ML data |
| 9 | B | Donors | CRUD, eligibility |
| 10 | B | Alerts | Threshold-based |
| 11 | B | Flask API | All endpoints |
| 12 | C | Features | 11 features |
| 13 | C | Forecasting | RF + SES |
| 14 | C | Anomaly | 6 known anomalies |
| 15 | C | Seasonal | Dec/Jan/Feb trends |
| 16 | C | ML Alerts | 6 alert types |
| 17 | C | Metrics | 6 KPIs |
| 18 | D | Landing + Auth | Public + login |
| 19 | D | Dashboard | Charts |
| 20 | D | Inventory | CRUD table |
| 21 | D | Allocation | Request form |
| 22 | D | Upload | Excel dedup |
| 23 | D | Predictions | 3 pages |
| 24 | D | Settings | Config |
| 25 | E | Testing | Full suite |
| 26 | E | Deployment | Live |

---

## Constants

```python
BLOOD_GROUPS = ['O Pos','O Neg','A Pos','A Neg','B Pos','B Neg','AB Pos','AB Neg']
COMPONENTS = ['WB/PRC', 'FFP', 'PLT']
STATUSES = ['available', 'reserved', 'issued', 'expired', 'discarded']
SHELF_LIFE = {'WB/PRC': 42, 'FFP': 365, 'PLT': 5}
MIN_DONATION_GAP = 56
DATA_SOURCES = ['manual', 'excel_upload', 'bulk_load']

INDIAN_BLOOD_DIST = {
    'O Pos': 0.327, 'A Pos': 0.221, 'B Pos': 0.304, 'AB Pos': 0.071,
    'O Neg': 0.037, 'A Neg': 0.019, 'B Neg': 0.015, 'AB Neg': 0.006
}
```
