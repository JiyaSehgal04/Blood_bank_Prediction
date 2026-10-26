"""Demand forecasting for sparse, intermittent blood-bank demand.

Why not XGBoost on daily counts: most blood-group/component series are zero on most days.
Tree models fit to that mostly learn the zeros (or, as happened here, a fixed prior), and a
flat +/-1 'confidence band' says nothing about uncertainty. This engine instead:

1. forecasts the *component total* (demand is steadier in aggregate) with TSB, the standard
   intermittent-demand method (Teunter-Syntetos-Babai), then splits it across blood groups by
   their observed share, shrunk toward the population distribution for rare groups;
2. produces a 7-day total directly, with an interval from the empirical spread of real 7-day
   totals, instead of multiplying one day by seven;
3. counts demand as issued + unmet requests (stock-outs hide demand);
4. publishes nothing when the history cannot support a forecast, and says why;
5. can score itself against held-out weeks and a naive baseline (`backtest_component`).
"""

import math
from datetime import date
from typing import Dict, List

import numpy as np
import pandas as pd

from ml.scripts.preprocess import INDIAN_BLOOD_DIST
from shared.cleaning_utils import VALID_BLOOD_GROUPS

MODEL_NAME = "tsb_hierarchical"
HISTORY_WINDOW_DAYS = 90
MIN_UNITS_IN_WINDOW = 20      # fewer demanded units than this and any forecast would be noise
MIN_ACTIVE_DAYS_IN_WINDOW = 8
MAX_DAYS_SINCE_LAST_DEMAND = 21
SHARE_PRIOR_STRENGTH = 20     # pseudo-units of population prior mixed into the group shares
INTERVAL_LOW_Q, INTERVAL_HIGH_Q = 0.10, 0.90   # an 80% interval


def build_daily_demand(summary: pd.DataFrame, component: str, end_date: date) -> pd.DataFrame:
    """One row per calendar day (zeros included) and one column per blood group.

    Demand = units issued + unmet requests."""
    columns = list(VALID_BLOOD_GROUPS)
    if summary is None or summary.empty:
        return pd.DataFrame(columns=columns, dtype=float)
    df = summary[summary["component"] == component].copy()
    if df.empty:
        return pd.DataFrame(columns=columns, dtype=float)
    df["demand"] = df["units_issued"].fillna(0) + df.get("unmet_requests", 0)
    df["summary_date"] = pd.to_datetime(df["summary_date"]).dt.normalize()
    pivot = df.pivot_table(index="summary_date", columns="blood_group", values="demand", aggfunc="sum", fill_value=0)
    for group in columns:
        if group not in pivot.columns:
            pivot[group] = 0
    pivot = pivot[columns]
    full = pd.date_range(pivot.index.min(), pd.Timestamp(end_date), freq="D")
    return pivot.reindex(full, fill_value=0).astype(float)


def tsb_daily(series: pd.Series, alpha: float = 0.1, beta: float = 0.1) -> float:
    """Expected demand per day: P(demand on a day) x (typical size when it happens)."""
    d = np.asarray(series, dtype=float)
    if d.size == 0 or d.sum() <= 0:
        return 0.0
    probability = float((d > 0).mean())
    size = float(d[d > 0].mean())
    for x in d:
        probability += alpha * ((1.0 if x > 0 else 0.0) - probability)
        if x > 0:
            size += beta * (x - size)
    return probability * size


def assess_history(daily_total: pd.Series, end_date: date, window: int = HISTORY_WINDOW_DAYS) -> Dict:
    """Decide whether the recorded demand can support a forecast."""
    recent = daily_total[daily_total.index > pd.Timestamp(end_date) - pd.Timedelta(days=window)]
    units = int(recent.sum())
    active_days = int((recent > 0).sum())
    positive = daily_total[daily_total > 0]
    last_demand = positive.index.max().date() if len(positive) else None
    info = {"units": units, "active_days": active_days, "window_days": window,
            "last_demand_date": last_demand.isoformat() if last_demand else None}

    if last_demand is None:
        return {**info, "sufficient": False,
                "reason": f"No demand (issued or unmet units) has ever been recorded; at least {MIN_UNITS_IN_WINDOW} units in the last {window} days are needed."}
    if (end_date - last_demand).days > MAX_DAYS_SINCE_LAST_DEMAND:
        return {**info, "sufficient": False,
                "reason": f"No demand has been recorded since {last_demand.isoformat()}; recent issue records are needed."}
    if units < MIN_UNITS_IN_WINDOW or active_days < MIN_ACTIVE_DAYS_IN_WINDOW:
        return {**info, "sufficient": False,
                "reason": f"Only {units} units were issued or requested in the last {window} days (at least {MIN_UNITS_IN_WINDOW} on {MIN_ACTIVE_DAYS_IN_WINDOW}+ days are needed)."}
    return {**info, "sufficient": True, "reason": ""}


def weekly_forecast(daily_total: pd.Series, horizon: int = 7) -> Dict[str, float]:
    """Point forecast and 80% interval for total demand over the next `horizon` days."""
    point = horizon * tsb_daily(daily_total)
    if point <= 0:
        return {"low_7d": 0.0, "point_7d": 0.0, "high_7d": 0.0}
    windows = daily_total.tail(180).rolling(horizon).sum().dropna()
    if len(windows) < 10 or windows.mean() <= 0:
        low, high = point * 0.5, point * 1.5
    else:
        scale = point / float(windows.mean())
        low = float(windows.quantile(INTERVAL_LOW_Q)) * scale
        high = float(windows.quantile(INTERVAL_HIGH_Q)) * scale
    low, high = min(low, point), max(high, point)
    return {"low_7d": round(low, 1), "point_7d": round(point, 1), "high_7d": round(high, 1)}


def group_shares(summary: pd.DataFrame, component: str, end_date: date, window: int = HISTORY_WINDOW_DAYS) -> Dict[str, float]:
    """Each blood group's share of the component's demand (observed, shrunk toward the population prior)."""
    daily = build_daily_demand(summary, component, end_date)
    recent = daily.tail(window).sum() if not daily.empty else pd.Series(0.0, index=VALID_BLOOD_GROUPS)
    prior_total = sum(INDIAN_BLOOD_DIST.get(g, 0.01) for g in VALID_BLOOD_GROUPS)
    total = float(recent.sum())
    shares = {}
    for group in VALID_BLOOD_GROUPS:
        prior = INDIAN_BLOOD_DIST.get(group, 0.01) / prior_total
        shares[group] = (float(recent.get(group, 0.0)) + SHARE_PRIOR_STRENGTH * prior) / (total + SHARE_PRIOR_STRENGTH)
    return shares


def forecast_component(summary: pd.DataFrame, component: str, end_date: date) -> Dict:
    """Forecast rows (one per blood group) in the `predictions` table format, or an explanation."""
    daily = build_daily_demand(summary, component, end_date)
    total = daily.sum(axis=1) if not daily.empty else pd.Series(dtype=float)
    assessment = assess_history(total, end_date) if len(total) else assess_history(pd.Series([0.0], index=[pd.Timestamp(end_date)]), end_date)
    if not assessment["sufficient"]:
        return {"status": "insufficient_data", "reason": assessment["reason"], "assessment": assessment, "rows": []}

    weekly = weekly_forecast(total)
    shares = group_shares(summary, component, end_date)
    rows: List[Dict] = []
    for group in VALID_BLOOD_GROUPS:
        share = shares[group]
        rows.append({
            "blood_group": group,
            "component": component,
            "predicted_demand": round(weekly["point_7d"] * share / 7, 1),
            "confidence_low": round(weekly["low_7d"] * share / 7, 1),
            "confidence_high": round(weekly["high_7d"] * share / 7, 1),
            "est_7d": round(weekly["point_7d"] * share, 1),
            "model_used": MODEL_NAME,
            "prediction_date": end_date.isoformat(),
        })
    return {"status": "ok", "reason": "", "assessment": assessment, "rows": rows}


def backtest_component(summary: pd.DataFrame, component: str, end_date: date,
                       horizon: int = 7, min_train: int = 60, step: int = 7) -> Dict[str, float]:
    """Rolling-origin test: forecast each held-out week from only the data before it."""
    daily = build_daily_demand(summary, component, end_date)
    total = daily.sum(axis=1) if not daily.empty else pd.Series(dtype=float)
    model_err: List[float] = []
    naive_err: List[float] = []
    hits = 0
    for cut in range(min_train, len(total) - horizon + 1, step):
        train, actual = total.iloc[:cut], float(total.iloc[cut:cut + horizon].sum())
        forecast = weekly_forecast(train, horizon)
        naive = horizon * float(train.tail(28).mean())
        model_err.append(abs(actual - forecast["point_7d"]))
        naive_err.append(abs(actual - naive))
        hits += int(forecast["low_7d"] <= actual <= forecast["high_7d"])
    n = len(model_err)
    if n == 0:
        return {"windows": 0, "mae_model": float("nan"), "mae_naive": float("nan"), "interval_coverage": float("nan")}
    return {
        "windows": n,
        "mae_model": round(float(np.mean(model_err)), 3),
        "mae_naive": round(float(np.mean(naive_err)), 3),
        "interval_coverage": round(hits / n, 3),
    }
