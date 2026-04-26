<!-- Generated: 2026-04-26 | Files scanned: 3 | Token estimate: ~850 -->

# Database Schema

Supabase (PostgreSQL) — 9 tables, all with UUID TEXT primary keys.

## Entity Relationship Diagram

```
donors ──1:N──► donations ──N:1──► blood_inventory
                                        │
                                        ▼
                                 allocation_log (unit_ids[])
                                        │
                                        ▼
                                   wastage_log
                                        │
                                        ▼
                                   daily_summary (ML training)
                                        │
                                        ▼
                                   predictions (ML output)
                                        │
                                        ▼
                                      alerts
                                        │
                                        ▼
                                  upload_history
```

## Tables

### blood_inventory (primary table)
| Column | Type | Notes |
|--------|------|-------|
| unit_id | TEXT PK | `{sno}-{component}-{segment_no}` |
| sno | TEXT | Serial number |
| blood_group | TEXT | 8 groups: O Pos/Neg, A Pos/Neg, B Pos/Neg, AB Pos/Neg |
| component | TEXT | WB/PRC, FFP, PLT |
| quantity_ml | NUMERIC | Volume in ml |
| collection_date | DATE | When unit was collected |
| expiry_date | DATE | Auto-computed from shelf life |
| status | TEXT | available/reserved/issued/expired/discarded |
| hiv, hbsag, hcv, malaria, vdrl | TEXT | Screening: Neg/Pos |
| source | TEXT | manual/excel_upload/bulk_load |
| upload_batch_id | TEXT | Links to upload_history |
| **UNIQUE** | | (sno, segment_no, component) |

### donors
| Column | Type | Notes |
|--------|------|-------|
| donor_id | TEXT PK | UUID |
| name, blood_group, age, gender, phone, email | TEXT/INT | Donor demographics |
| last_donation_date | DATE | For 56-day eligibility |
| is_eligible | BOOLEAN | Recalculated on donation |

### donations
| Column | Type | Notes |
|--------|------|-------|
| donation_id | TEXT PK | UUID |
| donor_id | TEXT FK → donors | |
| unit_id | TEXT FK → blood_inventory | |
| donation_date, component, quantity_ml | | |

### allocation_log
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| request_id, blood_group, component | TEXT | |
| units_requested, units_fulfilled | INTEGER | |
| unit_ids | TEXT[] | Array of allocated unit_ids |
| priority | TEXT | emergency/urgent/routine |
| status | TEXT | fulfilled/partial/unmet |

### wastage_log
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| unit_id, blood_group, component | TEXT | |
| reason | TEXT | expired/discarded/contaminated |

### daily_summary (ML training data)
| Column | Type | Notes |
|--------|------|-------|
| summary_date, blood_group, component | | **UNIQUE** composite |
| units_received, units_issued, units_expired | INTEGER | |
| closing_stock, unmet_requests | INTEGER | |

### predictions (ML output)
| Column | Type | Notes |
|--------|------|-------|
| prediction_date, blood_group, component | | **UNIQUE** composite |
| predicted_demand, confidence_low, confidence_high | NUMERIC | |
| model_used | TEXT | ses/ensemble_xgb_ses |

### alerts
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| alert_type | TEXT | critical_stock/low_stock/expiry_critical/screening_pos/ml_shortage/... |
| severity | TEXT | CRITICAL/HIGH/MEDIUM/LOW |
| is_resolved | BOOLEAN | |
| **UNIQUE** | | (alert_type, blood_group, component, created_at::date) |

### upload_history
| Column | Type | Notes |
|--------|------|-------|
| batch_id | TEXT UNIQUE | upload_YYYYMMDD_HHMMSS |
| total_rows, inserted, duplicates, flagged, errors | INTEGER | Ingestion stats |

## Key Indexes
- `blood_inventory`: blood_group, status, expiry_date, component, collection_date
- `donors`: blood_group, is_eligible
- `allocation_log`: blood_group, created_at
- `daily_summary`: summary_date, blood_group
- `predictions`: prediction_date, blood_group
- `alerts`: severity, is_resolved
