from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import tempfile
from .config import DEFAULT_EXCEL_PATH
from .db import Base, engine, get_db
from .etl import load_inventory_excel
from .forecasting import run_forecast
from .alerts import run_alerts
from .models import InventoryUnit, Forecast, Alert
from sqlalchemy import func

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Blood Bank Forecasting API")


def _ensure_inventory_loaded(db: Session):
    """Load inventory and proxy demand from the default Excel file if it exists."""
    if not os.path.isfile(DEFAULT_EXCEL_PATH):
        raise HTTPException(
            status_code=503,
            detail=f"Default inventory file not found: {DEFAULT_EXCEL_PATH}. Set INVENTORY_EXCEL_PATH or place register_to_excel_updated_option2.xlsx in backend/app/.",
        )
    load_inventory_excel(db, DEFAULT_EXCEL_PATH)


@app.post("/ingest/inventory")
async def ingest_inventory(file: UploadFile = File(...), db: Session = Depends(get_db)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        load_inventory_excel(db, tmp_path)
        return {"ok": True}
    finally:
        os.remove(tmp_path)


@app.post("/forecast/run")
def forecast_run(db: Session = Depends(get_db)):
    _ensure_inventory_loaded(db)
    out = run_forecast(db, source="proxy_collection")
    if out.get("ok"):
        run_alerts(db)
    return out


@app.get("/inventory/summary")
def inventory_summary(db: Session = Depends(get_db)):
    _ensure_inventory_loaded(db)
    rows = db.query(
        InventoryUnit.blood_group, InventoryUnit.component,
        func.sum(InventoryUnit.quantity_ml).label("usable_ml")
    ).filter(InventoryUnit.usable == True).group_by(InventoryUnit.blood_group, InventoryUnit.component).all()
    return [{"blood_group": r.blood_group, "component": r.component, "usable_ml": float(r.usable_ml or 0)} for r in rows]

@app.get("/forecast/next7")
def forecast_next7(blood_group: str, component: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Forecast).filter(Forecast.blood_group == blood_group).order_by(Forecast.target_date.asc())
    if component is None:
        q = q.filter(Forecast.component == None)
    else:
        q = q.filter(Forecast.component == component)
    rows = q.all()
    return [{"target_date": str(r.target_date), "predicted_ml": r.predicted_ml, "model": r.model_name} for r in rows]

@app.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    rows = db.query(Alert).order_by(Alert.alert_date.desc(), Alert.severity.desc()).all()
    return [{
        "date": str(r.alert_date), "type": r.alert_type, "blood_group": r.blood_group,
        "component": r.component, "severity": r.severity, "message": r.message,
        "shortfall_ml": r.shortfall_ml
    } for r in rows]