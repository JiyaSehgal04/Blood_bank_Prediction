from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from .models import InventoryUnit, Forecast, Alert
from .config import TODAY_OVERRIDE

def run_alerts(db: Session):
    today = date.fromisoformat(TODAY_OVERRIDE) if TODAY_OVERRIDE else date.today()

    db.query(Alert).filter(Alert.alert_date == today).delete()
    db.commit()

    # usable stock BG+component (ml)
    stock = db.query(
        InventoryUnit.blood_group,
        InventoryUnit.component,
        func.sum(InventoryUnit.quantity_ml).label("usable_stock_ml")
    ).filter(InventoryUnit.usable == True).group_by(InventoryUnit.blood_group, InventoryUnit.component).all()

    stock_map = {(r.blood_group, r.component): float(r.usable_stock_ml or 0) for r in stock}

    # predicted total next 7d BG+component
    preds = db.query(
        Forecast.blood_group, Forecast.component,
        func.sum(Forecast.predicted_ml).label("pred7")
    ).filter(Forecast.run_date == today, Forecast.component != None).group_by(Forecast.blood_group, Forecast.component).all()

    for r in preds:
        pred7 = float(r.pred7 or 0)
        usable = stock_map.get((r.blood_group, r.component), 0.0)
        buffer_ml = max(0.15 * pred7, 200.0)
        shortfall = pred7 - (usable - buffer_ml)
        if shortfall > 0:
            severity = "HIGH" if shortfall >= 250 else "MED"
            msg = f"Low stock projected for {r.blood_group} {r.component}: shortfall ~{shortfall:.0f} ml over next 7 days."
            db.add(Alert(alert_date=today, alert_type="LOW_STOCK", blood_group=r.blood_group, component=r.component,
                         message=msg, severity=severity, shortfall_ml=float(shortfall)))

    # expiry risk (usable expiring within 7 days)
    soon = today + timedelta(days=7)
    exp = db.query(InventoryUnit).filter(
        InventoryUnit.usable == True,
        InventoryUnit.expiry_date != None,
        InventoryUnit.expiry_date <= soon
    ).all()

    for u in exp:
        msg = f"Expiry risk: Unit {u.unit_no} ({u.blood_group} {u.component}) expires on {u.expiry_date}."
        db.add(Alert(alert_date=today, alert_type="EXPIRY_RISK", blood_group=u.blood_group, component=u.component,
                     message=msg, severity="MED", shortfall_ml=None))

    db.commit()
    return {"ok": True}