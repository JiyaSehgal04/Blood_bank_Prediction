-- Blood Bank v3 — Full Schema
-- Run ONCE in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/unlwlrjalbpibjhpxzqq/sql/new

-- ─── 1. blood_inventory ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blood_inventory (
  unit_id          TEXT PRIMARY KEY,          -- {sno}-{component}-{segment_no}
  sno              TEXT,
  unit_no          TEXT,
  segment_no       TEXT,
  blood_group      TEXT,
  component        TEXT,
  quantity_ml      NUMERIC,
  collection_date  DATE,
  collection_time  TEXT,
  expiry_date      DATE,
  status           TEXT DEFAULT 'available',  -- available/reserved/issued/expired/discarded
  hiv              TEXT,
  hbsag            TEXT,
  hcv              TEXT,
  malaria          TEXT,
  vdrl             TEXT,
  notes            TEXT,
  flag             TEXT,
  source           TEXT DEFAULT 'bulk_load',  -- manual/excel_upload/bulk_load
  upload_batch_id  TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  -- v3: dedup key is (sno, segment_no, component)
  UNIQUE (sno, segment_no, component)
);

CREATE INDEX IF NOT EXISTS idx_inv_blood_group ON blood_inventory(blood_group);
CREATE INDEX IF NOT EXISTS idx_inv_expiry_date ON blood_inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inv_status      ON blood_inventory(status);
CREATE INDEX IF NOT EXISTS idx_inv_component   ON blood_inventory(component);
CREATE INDEX IF NOT EXISTS idx_inv_collection  ON blood_inventory(collection_date);

-- ─── 2. donors ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donors (
  donor_id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name               TEXT,
  blood_group        TEXT,
  age                INTEGER,
  gender             TEXT,
  phone              TEXT,
  email              TEXT,
  last_donation_date DATE,
  total_donations    INTEGER DEFAULT 1,
  is_eligible        BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donors_blood_group ON donors(blood_group);
CREATE INDEX IF NOT EXISTS idx_donors_eligible    ON donors(is_eligible);

-- ─── 3. donations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donations (
  donation_id     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  donor_id        TEXT REFERENCES donors(donor_id),
  unit_id         TEXT REFERENCES blood_inventory(unit_id),
  sno             TEXT,
  donation_date   DATE,
  component       TEXT,
  quantity_ml     NUMERIC,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);

-- ─── 4. allocation_log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS allocation_log (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  request_id      TEXT,
  blood_group     TEXT,
  component       TEXT,
  units_requested INTEGER,
  units_fulfilled INTEGER,
  unit_ids        TEXT[],         -- array of unit_ids allocated
  priority        TEXT,           -- emergency/urgent/routine
  was_emergency   BOOLEAN DEFAULT FALSE,
  status          TEXT,           -- fulfilled/partial/unmet
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alloc_blood_group ON allocation_log(blood_group);
CREATE INDEX IF NOT EXISTS idx_alloc_created_at  ON allocation_log(created_at);

-- ─── 5. wastage_log ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wastage_log (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  unit_id         TEXT,
  blood_group     TEXT,
  component       TEXT,
  quantity_ml     NUMERIC,
  expiry_date     DATE,
  reason          TEXT,           -- expired/discarded/contaminated
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wastage_blood_group ON wastage_log(blood_group);
CREATE INDEX IF NOT EXISTS idx_wastage_created_at  ON wastage_log(created_at);

-- ─── 6. daily_summary (ML training table) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_summary (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  summary_date    DATE NOT NULL,
  blood_group     TEXT NOT NULL,
  component       TEXT NOT NULL,
  units_received  INTEGER DEFAULT 0,
  units_issued    INTEGER DEFAULT 0,
  units_expired   INTEGER DEFAULT 0,
  closing_stock   INTEGER DEFAULT 0,
  unmet_requests  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (summary_date, blood_group, component)
);

CREATE INDEX IF NOT EXISTS idx_summary_date        ON daily_summary(summary_date);
CREATE INDEX IF NOT EXISTS idx_summary_blood_group ON daily_summary(blood_group);

-- ─── 7. predictions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  prediction_date DATE NOT NULL,
  blood_group     TEXT NOT NULL,
  component       TEXT NOT NULL,
  predicted_demand NUMERIC,
  confidence_low  NUMERIC,
  confidence_high NUMERIC,
  model_used      TEXT,           -- SES/RF/ensemble
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pred_date        ON predictions(prediction_date);
CREATE INDEX IF NOT EXISTS idx_pred_blood_group ON predictions(blood_group);

-- ─── 8. alerts ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  alert_type      TEXT NOT NULL,
  blood_group     TEXT,
  component       TEXT,
  severity        TEXT NOT NULL,  -- CRITICAL/HIGH/MEDIUM/LOW
  message         TEXT,
  is_resolved     BOOLEAN DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  -- dedup: same alert type+group on same day is not duplicated
  UNIQUE (alert_type, blood_group, component, created_at::DATE)
);

CREATE INDEX IF NOT EXISTS idx_alerts_severity    ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_is_resolved ON alerts(is_resolved);

-- ─── 9. upload_history ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upload_history (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  batch_id        TEXT UNIQUE NOT NULL,
  filename        TEXT,
  source          TEXT,           -- excel_upload/bulk_load/manual
  total_rows      INTEGER DEFAULT 0,
  inserted        INTEGER DEFAULT 0,
  duplicates      INTEGER DEFAULT 0,
  flagged         INTEGER DEFAULT 0,
  errors          INTEGER DEFAULT 0,
  uploaded_at     TIMESTAMPTZ DEFAULT now()
);
