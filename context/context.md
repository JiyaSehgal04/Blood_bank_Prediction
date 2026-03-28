# Blood Bank Inventory & Distribution — Complete Workplan

> **Proposal:** Multi-List–Centric Blood Bank Inventory and Distribution Management  
> **Authors:** Aritra Poddar (RA2311003011383), Jiya Sehgal (RA2311003011375) — C.Tech  
> **Stack:** Python Flask + React (Vite) + Supabase + scikit-learn  

---

## Dataset Summary

| Metric | Value |
|--------|-------|
| Total Records | 77 (across 15 columns) |
| Unique Donors | 37 |
| Blood Groups | O Pos (25), A Pos (24), B Pos (16), AB Pos (4), O Neg (3), A Neg (2), B Neg (2), AB Neg (0) |
| Components | WB/PRC (37), FFP (36), PLT (4) |
| Date Range | 13/02/2026 – 14/02/2026 |
| Data Issues | 2 missing quantities, 1 missing blood group, 5 missing times, mixed AM/PM casing |
| Key Finding | B Pos under-stocked (21% supply vs 30% demand), AB Neg has zero inventory |

---

## Timeline

| Week | Phase | Deliverables |
|------|-------|-------------|
| 1 | Setup + Data | Project structure, cleaned data, Supabase schema, environment config |
| 2 | Multi-List Core | BloodUnit nodes, FIFO lists, expiry list, supply arrival, hash map index |
| 3 | Allocation Engine | Priority queue, compatibility check, FIFO+expiry allocation, logging |
| 4 | Flask API + DB | REST endpoints (CRUD, upload, allocate), Supabase integration, donor management |
| 5 | ML Models | Feature engineering, Random Forest, Isolation Forest, exponential smoothing |
| 6 | Predictions API | Forecast endpoints, seasonal analysis, alert generation, replenishment logic |
| 7 | Frontend | Dashboard, inventory table, prediction charts, alerts panel, upload/DB sync |
| 8 | Polish + Deploy | Testing, metrics, responsive UI, deployment (Railway + Vercel + Supabase) |

---

## Project Structure

```
Blood_Bank_Predict/
├── backend/
│   ├── app/
│   │   ├── __init__.py              # Flask app factory
│   │   ├── config.py                # Env config
│   │   ├── models/
│   │   │   ├── blood_unit.py        # BloodUnit node
│   │   │   ├── multi_list.py        # MultiListInventory (FIFO + expiry)
│   │   │   ├── donor.py             # Donor model
│   │   │   └── prediction.py        # Prediction result model
│   │   ├── routes/
│   │   │   ├── inventory.py         # CRUD endpoints
│   │   │   ├── donors.py            # Donor endpoints
│   │   │   ├── predictions.py       # ML prediction endpoints
│   │   │   ├── upload.py            # Excel upload endpoint
│   │   │   ├── allocate.py          # Allocation endpoint
│   │   │   └── alerts.py            # Alert endpoints
│   │   ├── services/
│   │   │   ├── supabase.py          # Supabase client
│   │   │   ├── inventory_service.py # Business logic
│   │   │   ├── allocation_service.py# Allocation engine
│   │   │   ├── prediction_service.py# ML model caller
│   │   │   └── excel_parser.py      # Parse .xlsx/.csv
│   │   └── utils/
│   │       ├── validators.py
│   │       └── constants.py         # Blood groups, shelf life, etc.
│   ├── requirements.txt
│   ├── run.py
│   └── .env
│
├── ml/
│   ├── data/                        # Training datasets
│   ├── models/                      # Saved .joblib files
│   ├── notebooks/                   # Jupyter EDA
│   ├── scripts/
│   │   ├── preprocess.py            # Feature engineering
│   │   ├── train.py                 # Random Forest training
│   │   ├── predict.py               # Inference
│   │   ├── anomaly.py               # Isolation Forest
│   │   ├── seasonal.py              # Time series decomposition
│   │   └── evaluate.py              # Model metrics
│   └── config.yaml
│
├── blood-bank/                      # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── Inventory/
│   │   │   ├── Predictions/
│   │   │   ├── Donors/
│   │   │   ├── Alerts/
│   │   │   └── Upload/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── data/
│   └── register_to_excel_updated_option2.xlsx
│
├── WORKPLAN.md                      # THIS FILE
├── CLAUDE.md                        # Claude Code instructions
├── .gitignore
└── README.md
```

---

# Part A — Inventory Management (Multi-List Framework)

*Maps to Proposal Steps 1–6 and Step 9*

---

## Step 1: Project Setup & Data Cleaning

**Goal:** Clean the raw Excel register and prepare it for ingestion.

### 1.1 Data Cleaning Tasks

- Load `register_to_excel_updated_option2.xlsx` with pandas
- Handle missing values:
  - Row 32 (S.No 763): no blood_group or quantity → flag as "incomplete", exclude from allocation
  - Row 66 (S.No 779, SDP): missing FFP quantity → fill with 0, add note
  - 5 missing collection times → fill with "Unknown"
  - 2 missing segment numbers → fill with "N/A"
- Standardize time format: normalize mixed casing ("11:45 pm" vs "01:00 PM") to 24-hour
- Parse dates from DD/MM/YYYY strings to proper datetime objects
- Validate blood groups against: `{O Pos, O Neg, A Pos, A Neg, B Pos, B Neg, AB Pos, AB Neg}`
- Create unique `unit_id` per record: `f"{sno}_{segment}_{component}"`

### 1.2 Environment Setup

- Backend: Python 3.10+, Flask, supabase-py, pandas, openpyxl, scikit-learn, statsmodels, joblib
- Frontend: Node 18+, React 18, Vite, Recharts, xlsx (SheetJS)
- Database: Create Supabase project, run schema SQL, configure RLS
- Create `.env` files for backend and frontend

**Output:** Cleaned dataset (76 valid + 1 flagged records), project scaffold.

---

## Step 2: Multi-List Data Structure

**Goal:** Implement the core Multi-List — each blood unit exists simultaneously in a blood-group FIFO list AND a global expiry-ordered list.

### 2.1 Data Structures

```
BloodUnit (Node):
    unit_id, sno, unit_no, segment_no, blood_group, component,
    quantity_ml, collection_date, collection_time, expiry_date,
    status, screening {hiv, hbsag, hcv, malaria, vdrl}, notes,
    next_in_group (→ FIFO chain),
    next_in_expiry (→ expiry chain)

BloodGroupList (per blood group, 8 total):
    blood_group, head (oldest), tail (newest), count

GlobalExpiryList:
    head (soonest-to-expire), count, sorted by expiry_date ASC

BloodGroupIndex (HashMap):
    key: blood_group string → value: BloodGroupList
    O(1) lookup for compatibility check

MultiListInventory:
    group_index: dict[str, BloodGroupList]
    expiry_list: GlobalExpiryList
    total_units: int
```

### 2.2 Why Multi-List (From Proposal)

A single blood unit appears in exactly two lists — no duplication. Blood group lists enforce medical compatibility. The expiry list enables wastage control. All allocation, expiry handling, and optimization rely on this shared representation.

**Output:** Python classes — `BloodUnit`, `BloodGroupList`, `GlobalExpiryList`, `MultiListInventory`.

---

## Step 3: Blood Supply Arrival (Proposal Step 2)

**Goal:** Load blood units from Excel into the Multi-List.

For each cleaned record:
1. Create `BloodUnit` node
2. Append to tail of matching `BloodGroupList` (FIFO order by collection time)
3. Insert into `GlobalExpiryList` in sorted position (by expiry_date)

Handle multi-component donations: same S.No produces WB/PRC + FFP + PLT as separate nodes.

**Shelf Life:**

| Component | Shelf Life | Expiry (from 13/02) | Wastage Risk |
|-----------|-----------|---------------------|-------------|
| WB/PRC | 42 days | 27/03/2026 | Medium |
| FFP | 365 days | 14/02/2027 | Low |
| PLT | 5 days | 18/02/2026 | **Critical** |

**Verification:** O Pos count = 25, A Pos = 24. Expiry list head = PLT units (soonest).

---

## Step 4: Expiry Check & Removal (Proposal Step 3)

**Goal:** Daily scan of global expiry list — remove expired, record wastage.

- Walk `GlobalExpiryList` from head
- For each unit where `expiry_date < current_date`:
  - Status → "expired"
  - Remove from both lists
  - Log to `WastageLog`: unit_id, blood_group, component, quantity, expiry_date, days_past
- Flag units within 3 days → "critical_expiry"
- Flag units within 7 days → "warning_expiry"
- Stop at first valid unit (list is sorted)

**With your dataset:** 4 PLT units expire by 18–19 Feb — highest priority for immediate usage.

**Output:** Expiry scanner function + `WastageLog` structure.

---

## Step 5: Request Queue & Allocation (Proposal Steps 4–5)

**Goal:** Priority queue for requests + compatibility-first allocation.

### 5.1 Priority Request Queue (Min-Heap)

```
BloodRequest:
    request_id, blood_group, component, quantity_units,
    is_emergency, timestamp,
    priority: 0=emergency, 1=urgent, 2=routine
```

Emergency always dequeued first. Within same priority: FIFO by timestamp.

### 5.2 Allocation Logic (The Critical Flow)

1. **Compatibility Check:** `group_index[blood_group]` → O(1)
2. **Unit Selection (FIFO):** Take from head (oldest first)
3. **Expiry-Aware Optimization:** Prefer unit closest to expiry (reduces wastage)
4. **Result:** Fulfilled → status "issued", remove from both lists. Insufficient → log unmet, generate alert.

### 5.3 Compatibility Matrix (Emergency Fallback)

```
O Neg  → receives from: O Neg only (universal donor)
O Pos  → O Neg, O Pos
A Neg  → O Neg, A Neg
A Pos  → O Neg, O Pos, A Neg, A Pos
B Neg  → O Neg, B Neg
B Pos  → O Neg, O Pos, B Neg, B Pos
AB Neg → O Neg, A Neg, B Neg, AB Neg
AB Pos → All (universal recipient)
```

**Output:** `RequestQueue` (heap), `allocate()` function, compatibility matrix.

---

## Step 6: Logging & Usage History (Proposal Step 6)

**Goal:** Record every event for audit trail AND as ML training data.

### Three Log Structures

- **AllocationLog:** timestamp, request_id, blood_group, component, units_requested, units_fulfilled, unit_ids_used, was_emergency
- **WastageLog:** timestamp, unit_id, blood_group, component, quantity_ml, expiry_date, reason
- **DailyUsageSummary:** date, blood_group, component, units_issued, units_expired, units_received, closing_stock, unmet_requests

> **Critical:** `DailyUsageSummary` is the primary input to the ML prediction engine. Every field becomes a feature or target for the models.

**Output:** Log classes + daily aggregation function.

---

## Step 7: Donor Management

**Goal:** Track donors, history, and eligibility.

- Donor model: donor_id, name, blood_group, age, gender, contact, last_donation_date, total_donations, is_eligible
- Link donations to inventory units
- Eligibility rule: minimum 56-day gap between whole blood donations
- API: register, list (filter by group/eligibility), profile with donation timeline

**Output:** Donor model, eligibility checker, Flask routes.

---

## Step 8: Alert Generation (Proposal Step 9)

**Goal:** Non-duplicate alerts for stock and expiry risk.

| Condition | Severity |
|-----------|----------|
| Blood group has < 3 available units | HIGH |
| Blood group has 0 units | CRITICAL |
| >20% of stock expires within 7 days | MEDIUM |
| PLT units with < 2 days remaining | HIGH |

Deduplication: `(alert_type, blood_group, date)` tuple set — no repeats same day.

**Output:** Alert generator + alerts Supabase table.

---

## Step 9: Flask API & Supabase Integration

**Goal:** REST API connecting Multi-List to frontend.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List units (filters: blood_group, component, status, date range) |
| POST | `/api/inventory` | Add new blood unit |
| PUT | `/api/inventory/:id` | Update unit (status, notes) |
| DELETE | `/api/inventory/:id` | Remove unit |
| POST | `/api/upload` | Upload Excel/CSV, parse, insert |
| POST | `/api/allocate` | Submit blood request, run allocation, return result |
| GET | `/api/donors` | List donors |
| POST | `/api/donors` | Register donor |
| GET | `/api/alerts` | List active alerts |
| GET | `/api/dashboard/stats` | Aggregated KPIs |

**Output:** Flask app with Blueprints, Supabase client, all endpoints.

---

# Part B — ML Prediction Engine

*Maps to Proposal Steps 7–8 and Step 10*

The ML layer reads from the Multi-List's daily usage logs and writes predictions back. It does not modify inventory — it advises. The Multi-List is always the source of truth.

---

## Step 10: Feature Engineering Pipeline

**Goal:** Transform raw daily logs into ML-ready features.

### Engineered Features (per blood group per day)

| Feature | Source | Purpose |
|---------|--------|---------|
| `day_of_week` (0–6) | collection_date | Weekly patterns |
| `month` (1–12) | collection_date | Seasonal patterns |
| `is_weekend` | collection_date | Weekend demand diff |
| `is_holiday` | Indian holiday calendar | Festival spikes |
| `rolling_avg_7d` | Last 7 days demand | Short-term trend |
| `rolling_avg_30d` | Last 30 days demand | Medium-term baseline |
| `lag_1d` | Yesterday's demand | Autoregressive signal |
| `lag_7d` | Same day last week | Weekly cycle |
| `blood_group_encoded` | One-hot encoding | Group-specific patterns |
| `expiring_within_7d` | Expiry list scan | Urgency signal |
| `current_stock_level` | Multi-List count | Supply context |

**Output:** `ml/scripts/preprocess.py`

---

## Step 11: ML Model 1 — Demand Forecasting

**Goal:** Predict next-day and next-week demand per blood group.

### Phased Cold-Start Approach

**Phase 1 (Days 1–14):** Exponential Smoothing (from proposal)
```
F(t+1) = α × A(t) + (1 – α) × F(t),  α = 0.3
```
Seeded with Indian population blood type distribution. Works immediately with zero history.

**Phase 2 (Days 15–30):** Exponential smoothing keeps improving. Collecting data for ML.

**Phase 3 (Day 30+):** Random Forest Regressor takes over.
- Algorithm: `sklearn.ensemble.RandomForestRegressor`
- Features: All 11 from Step 10
- Target: `units_demanded_next_day` per blood group
- Retrain weekly, save as `.joblib`
- Evaluate: MAE, RMSE, coverage accuracy

**Phase 4 (Day 90+):** Seasonal analysis becomes meaningful (see Step 13).

**Output:** `ml/scripts/train.py`, `ml/scripts/predict.py`, saved model files.

---

## Step 12: ML Model 2 — Anomaly Detection

**Goal:** Detect unusual demand patterns indicating emergencies or system issues.

### Isolation Forest (Unsupervised)

- Algorithm: `sklearn.ensemble.IsolationForest(contamination=0.05)`
- Features: daily demand, rolling averages, stock level, wastage count
- Trainable after ~14 days
- Output: anomaly_score per blood group per day (−1 = anomaly, 1 = normal)

### What It Detects

- Sudden O Neg spike → mass casualty / trauma surge
- Unexpected donation drop → camp cancellation
- PLT demand doubles without WB/PRC change → dengue outbreak
- Stock depletion far exceeding forecast → emergency replenishment needed

**Output:** `ml/scripts/anomaly.py`

---

## Step 13: ML Model 3 — Seasonal & Trend Analysis

**Goal:** Decompose demand into trend + seasonality + residual.

### Time Series Decomposition

Using `statsmodels.tsa.seasonal.seasonal_decompose`:

- **Trend:** Is O Pos demand growing month-over-month?
- **Seasonality:** Do B Pos requests spike during monsoon (dengue)? Donation drops during exams?
- **Residual:** Random noise after removing trend and season

### Monthly Reports Generated

- Blood group demand heatmap (month × blood_group)
- Component demand ratio trends over time
- Wastage trend per blood group
- Donor activity patterns by month

> Requires 90+ days for meaningful seasonal patterns. Uses population baselines until then.

**Output:** `ml/scripts/seasonal.py`

---

## Step 14: ML-Enhanced Alerts & Replenishment (Proposal Steps 8–9)

**Goal:** Combine ML predictions with inventory state for actionable alerts.

### Alert Types

| Alert | Trigger | Source | Severity |
|-------|---------|--------|----------|
| Shortage | Stock < 3-day predicted demand | Demand forecast | HIGH/CRITICAL |
| Surplus | Stock > 14-day demand | Demand forecast | LOW |
| Expiry Risk | >20% stock expires in 7d | Expiry list | MEDIUM |
| Anomaly | Isolation Forest flags day | Anomaly model | HIGH |
| Trend Shift | 30-day trend changes >15% | Seasonal analysis | MEDIUM |

### Replenishment Formula

```python
replenishment_needed = max(0, predicted_demand_7d + safety_stock - current_stock + expiring_within_7d)
safety_stock = predicted_demand_7d × 0.5
```

Urgency levels:
- **CRITICAL:** stock < 30% of 7d demand → organize emergency drive
- **HIGH:** stock < 100% → increase collection
- **NORMAL:** stock < 150% → routine collection
- **SURPLUS:** stock > 150% → reduce collection, use near-expiry first

**Output:** Alert engine, replenishment optimizer.

---

## Step 15: Prediction API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/predictions` | Demand forecasts (query: days_ahead=7\|14\|30) |
| GET | `/api/predictions/:blood_group` | Forecast for specific group + confidence |
| GET | `/api/predictions/seasonal` | Monthly trend report |
| GET | `/api/predictions/anomalies` | Recent anomaly detections |
| POST | `/api/predictions/retrain` | Trigger model retraining |
| GET | `/api/replenishment` | Replenishment recommendations |

**Output:** Prediction Flask blueprint, model loading, cached forecasts.

---

## Step 16: End-of-Day Simulation & Metrics (Proposal Step 10)

### Performance Metrics

- **Fulfillment Rate:** (fulfilled / total requests) × 100
- **Wastage Rate:** (expired / total inventory) × 100
- **Avg Turnaround:** Mean time from request to allocation
- **Stock Coverage Days:** current_stock / avg_daily_demand (per group)
- **Emergency Response Rate:** emergency fulfilled within SLA / total emergency
- **Prediction Accuracy:** MAE of forecast vs actual (per retraining)
- **Inventory Turnover:** issued / average inventory level

**Output:** Metrics calculator, simulation runner, dashboard data.

---

# Part C — React Frontend

## Step 17: Dashboard Page

- KPI cards: total units, volume, donors, fulfillment rate, wastage rate
- Blood group bar chart with urgency colors (Recharts)
- Component breakdown with volume totals
- Active alerts banner (critical in red)

## Step 18: Inventory Management Page

- Data table: search, sort, filter (blood group, component, status, date range)
- Expiry highlighting: yellow (7-day), red (3-day)
- Add/Edit modal forms
- Status flow: available → reserved → issued (or expired → discarded)
- Bulk actions: mark expired, export as Excel

## Step 19: Request & Allocation Page

- Request form: blood group, component, quantity, emergency toggle
- Compatibility matrix reference
- Allocation result: units assigned or shortage notification
- Request history with status

## Step 20: Predictions & Reports Page

- Demand forecast line chart (historical + predicted + confidence bands)
- Replenishment cards per blood group with urgency
- Seasonal heatmap (month × blood_group)
- Anomaly timeline
- Model metrics (MAE, last retrained)

## Step 21: Alerts & Donor Pages

- Alerts: active list, severity filter, resolve/acknowledge, history
- Donors: searchable registry, profile with timeline, eligibility badge
- Upload: Excel drag-and-drop, preview, validation, Supabase sync

---

# Part D — Testing & Deployment

## Step 22: Testing

- Backend: pytest for CRUD, allocation, expiry, prediction endpoints
- Multi-List: unit tests for insert, remove, FIFO order, expiry sort, allocation
- ML: validate accuracy on held-out data, test cold-start fallback
- Frontend: all pages, forms, charts, edge cases (empty state, zero stock)
- Integration: upload → load → request → allocate → forecast (end-to-end)

## Step 23: Deployment

- Backend (Flask): Railway or Render
- Frontend (React): Vercel or Netlify
- Database: Supabase cloud (production RLS)
- ML Models: `.joblib` files in backend `/ml/models/`, loaded at startup
- CI/CD: GitHub Actions (lint + test on push, deploy on merge to main)

---

## Quick Reference

| # | Part | Step | Proposal Mapping | Key Output |
|---|------|------|-----------------|------------|
| 1 | A | Project Setup & Data Cleaning | Initialization | Clean dataset, scaffold |
| 2 | A | Multi-List Data Structure | Core Design | Python classes |
| 3 | A | Blood Supply Arrival | Step 2 | Ingestion function |
| 4 | A | Expiry Check & Removal | Step 3 | Expiry scanner |
| 5 | A | Request Queue & Allocation | Steps 4–5 | Allocation engine |
| 6 | A | Logging & Usage History | Step 6 | Log structures |
| 7 | A | Donor Management | — | Donor model + routes |
| 8 | A | Alert Generation | Step 9 | Alert engine |
| 9 | A | Flask API & Supabase | — | REST API, DB sync |
| 10 | B | Feature Engineering | Step 7 input | preprocess.py |
| 11 | B | Demand Forecasting (RF+SES) | Step 7 | train.py, predict.py |
| 12 | B | Anomaly Detection | Step 9 (ML) | anomaly.py |
| 13 | B | Seasonal Analysis | Step 7 ext | seasonal.py |
| 14 | B | Alerts + Replenishment | Steps 8–9 | ML-enhanced alerts |
| 15 | B | Prediction API | — | Flask prediction routes |
| 16 | B | Simulation Metrics | Step 10 | Performance evaluator |
| 17 | C | Dashboard Page | — | KPI + charts |
| 18 | C | Inventory Page | — | CRUD table |
| 19 | C | Request & Allocation Page | — | Request form + results |
| 20 | C | Predictions Page | — | Forecast charts |
| 21 | C | Alerts + Donors Pages | — | Alert panel, donor registry |
| 22 | D | Testing & Validation | — | Test suite |
| 23 | D | Deployment | — | Live system |

---

## Key Constants

```python
BLOOD_GROUPS = ['O Pos', 'O Neg', 'A Pos', 'A Neg', 'B Pos', 'B Neg', 'AB Pos', 'AB Neg']
COMPONENTS = ['WB/PRC', 'FFP', 'PLT', 'Cryo', 'Other']
SHELF_LIFE = {'WB/PRC': 42, 'FFP': 365, 'PLT': 5, 'Cryo': 365}
MIN_DONATION_GAP = 56  # days

INDIAN_BLOOD_DIST = {
    'O Pos': 0.327, 'A Pos': 0.221, 'B Pos': 0.304, 'AB Pos': 0.071,
    'O Neg': 0.037, 'A Neg': 0.019, 'B Neg': 0.015, 'AB Neg': 0.006
}
```
