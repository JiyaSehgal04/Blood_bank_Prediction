CREATE DATABASE bloodbank;

-- inventory from your sheet
CREATE TABLE inventory_units (
  id SERIAL PRIMARY KEY,
  unit_no VARCHAR(50),
  segment_no VARCHAR(50),
  collection_date DATE,
  collection_time VARCHAR(20),
  collection_dt TIMESTAMP NULL,
  component VARCHAR(20),
  expiry_date DATE,
  quantity_ml DOUBLE PRECISION,
  blood_group VARCHAR(10),
  hiv_1_2 VARCHAR(20),
  hbsag VARCHAR(20),
  hcv VARCHAR(20),
  malaria VARCHAR(20),
  vdrl VARCHAR(20),
  notes TEXT,
  usable BOOLEAN DEFAULT FALSE
);

-- demand series used by ML (currently proxy from collection)
CREATE TABLE demand_daily (
  id SERIAL PRIMARY KEY,
  day DATE NOT NULL,
  blood_group VARCHAR(10) NOT NULL,
  component VARCHAR(20) NULL, -- NULL means BG-only aggregate if you want
  demand_ml DOUBLE PRECISION NOT NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'proxy_collection', -- later: 'issued'
  UNIQUE(day, blood_group, component, source)
);

-- forecast outputs
CREATE TABLE forecasts (
  id SERIAL PRIMARY KEY,
  run_date DATE NOT NULL,
  target_date DATE NOT NULL,
  blood_group VARCHAR(10) NOT NULL,
  component VARCHAR(20) NULL,
  predicted_ml DOUBLE PRECISION NOT NULL,
  model_name VARCHAR(50) NOT NULL
);

-- alerts
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  alert_date DATE NOT NULL,
  alert_type VARCHAR(30) NOT NULL, -- LOW_STOCK / EXPIRY_RISK
  blood_group VARCHAR(10) NULL,
  component VARCHAR(20) NULL,
  message TEXT NOT NULL,
  severity VARCHAR(10) NOT NULL, -- LOW/MED/HIGH
  shortfall_ml DOUBLE PRECISION NULL
);

