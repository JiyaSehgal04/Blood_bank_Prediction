from sqlalchemy import Column, Integer, String, Date, Float, Boolean, Text, DateTime
from .db import Base

class InventoryUnit(Base):
    __tablename__ = "inventory_units"
    id = Column(Integer, primary_key=True, index=True)
    unit_no = Column(String)
    segment_no = Column(String)
    collection_date = Column(Date)
    collection_time = Column(String)
    collection_dt = Column(DateTime, nullable=True)
    component = Column(String)
    expiry_date = Column(Date)
    quantity_ml = Column(Float)
    blood_group = Column(String)
    hiv_1_2 = Column(String)
    hbsag = Column(String)
    hcv = Column(String)
    malaria = Column(String)
    vdrl = Column(String)
    notes = Column(Text, nullable=True)
    usable = Column(Boolean, default=False)

class DemandDaily(Base):
    __tablename__ = "demand_daily"
    id = Column(Integer, primary_key=True)
    day = Column(Date, nullable=False)
    blood_group = Column(String, nullable=False)
    component = Column(String, nullable=True)
    demand_ml = Column(Float, nullable=False)
    source = Column(String, nullable=False, default="proxy_collection")

class Forecast(Base):
    __tablename__ = "forecasts"
    id = Column(Integer, primary_key=True)
    run_date = Column(Date, nullable=False)
    target_date = Column(Date, nullable=False)
    blood_group = Column(String, nullable=False)
    component = Column(String, nullable=True)
    predicted_ml = Column(Float, nullable=False)
    model_name = Column(String, nullable=False)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True)
    alert_date = Column(Date, nullable=False)
    alert_type = Column(String, nullable=False)
    blood_group = Column(String, nullable=True)
    component = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    severity = Column(String, nullable=False)
    shortfall_ml = Column(Float, nullable=True)