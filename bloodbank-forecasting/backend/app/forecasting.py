import numpy as np
import pandas as pd
from datetime import date, timedelta
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sqlalchemy.orm import Session
from .models import DemandDaily, Forecast
from .config import TODAY_OVERRIDE

HORIZON = 7

def run_forecast(db: Session, source: str = "proxy_collection"):
    today = date.fromisoformat(TODAY_OVERRIDE) if TODAY_OVERRIDE else date.today()
    future_days = [today + timedelta(days=i) for i in range(1, HORIZON+1)]

    # pull demand series
    rows = db.query(DemandDaily).filter(DemandDaily.source == source).all()
    if not rows:
        return {"ok": False, "reason": f"No demand data found for source={source}"}

    df = pd.DataFrame([{
        "day": r.day, "blood_group": r.blood_group, "component": r.component, "demand_ml": r.demand_ml
    } for r in rows])

    # wipe old forecasts for this run_date
    db.query(Forecast).filter(Forecast.run_date == today).delete()
    db.commit()

    def forecast_one(series: np.ndarray):
        if len(series) >= 4:
            try:
                fit = ExponentialSmoothing(series, trend="add", seasonal=None, initialization_method="estimated").fit()
                return fit.forecast(HORIZON), "ExpSmoothing(add-trend)"
            except Exception:
                return np.repeat(np.nanmean(series), HORIZON), "NaiveMean"
        return np.repeat(np.nanmean(series) if len(series) else 0.0, HORIZON), "NaiveMean"

    # ---- BG+Component forecasts ----
    for (bg, comp), g in df.groupby(["blood_group","component"]):
        g = g.sort_values("day")
        yhat, model = forecast_one(g["demand_ml"].values.astype(float))
        for d, p in zip(future_days, yhat):
            db.add(Forecast(run_date=today, target_date=d, blood_group=bg, component=comp,
                            predicted_ml=float(p), model_name=model))

    # ---- BG-only forecasts ----
    df_bg = df.groupby(["day","blood_group"])["demand_ml"].sum().reset_index()
    for bg, g in df_bg.groupby(["blood_group"]):
        g = g.sort_values("day")
        yhat, model = forecast_one(g["demand_ml"].values.astype(float))
        for d, p in zip(future_days, yhat):
            db.add(Forecast(run_date=today, target_date=d, blood_group=bg, component=None,
                            predicted_ml=float(p), model_name=model))

    db.commit()
    return {"ok": True, "run_date": str(today), "horizon_days": HORIZON}