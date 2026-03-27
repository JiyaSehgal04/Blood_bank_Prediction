"""
ml/scripts/predict.py
Step 16 — ML-Enhanced Alerts & Replenishment

Loads trained models, generates forecasts, compares against live stock,
raises ML-specific alerts, computes replenishment recommendations.

Alert types raised here:
  ml_shortage    (forecast > stock)             HIGH
  ml_surplus     (stock > 14-day demand)        LOW
  ml_anomaly     (Isolation Forest flag)        HIGH
  ml_trend_shift (>15% change week-over-week)   MEDIUM

Replenishment formula (v3):
  order_qty = max(0, demand_7d + safety_stock - current_stock + expiring_7d)
"""

import sys
import joblib
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ml.scripts.preprocess import FeaturePipeline, INDIAN_BLOOD_DIST
from ml.scripts.train      import SESForecaster, XGBForecaster, AnomalyDetector  # noqa: F401
from db.supabase_client    import get_client
from shared.cleaning_utils import VALID_BLOOD_GROUPS

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
COMPONENTS = ["WB/PRC", "FFP", "PLT"]
SAFETY_STOCK = 5


def _load_model(path: Path):
    return joblib.load(path) if path.exists() else None


class MLPredictor:
    def __init__(self):
        self.pipe   = FeaturePipeline()
        self.client = get_client()

    # ── generate forecasts ────────────────────────────────────────────────────

    def predict_all(self) -> dict:
        """Generate demand forecasts for all components + blood groups."""
        all_preds = {}
        for comp in COMPONENTS:
            all_preds[comp] = self.predict_component(comp)
        return all_preds

    def predict_component(self, component: str) -> list:
        comp_key = component.replace("/", "_")
        df       = self.pipe.build_features(component)

        ses_models = _load_model(MODELS_DIR / f"ses_{comp_key}.joblib")
        xgb_model   = _load_model(MODELS_DIR / f"xgb_{comp_key}.joblib")
        feature_cols = self.pipe.get_feature_cols()

        preds = []
        for bg in VALID_BLOOD_GROUPS:
            # SES prediction
            if ses_models and bg in ses_models:
                ses_pred = ses_models[bg].predict(bg)
            else:
                ses_pred = INDIAN_BLOOD_DIST.get(bg, 0.01) * 5

            # XGB prediction
            if xgb_model and xgb_model.trained and not df.empty:
                row = df[df["blood_group"] == bg]
                if not row.empty:
                    xgb_pred = xgb_model.predict(row.iloc[-1])
                    final   = round(0.7 * xgb_pred + 0.3 * ses_pred, 1)
                    model   = "ensemble_xgb_ses"
                else:
                    final, model = ses_pred, "ses"
            else:
                final, model = ses_pred, "ses"

            std = 1.0
            if not df.empty:
                row = df[df["blood_group"] == bg]
                if not row.empty:
                    std = max(1.0, float(row.iloc[-1].get("rolling_std_7d", 1) or 1))

            preds.append({
                "blood_group":     bg,
                "component":       component,
                "predicted_demand":final,
                "confidence_low":  max(0, round(final - std, 1)),
                "confidence_high": round(final + std, 1),
                "model_used":      model,
                "prediction_date": date.today().isoformat(),
            })

        # Store in DB
        try:
            self.client.table("predictions").upsert(
                preds,
                on_conflict="prediction_date,blood_group,component"
            ).execute()
        except Exception as e:
            print(f"  Warning: prediction store failed for {component}: {e}")

        return preds

    # ── anomaly detection ─────────────────────────────────────────────────────

    def detect_anomalies(self, component: str = "WB/PRC") -> list:
        """Run Isolation Forest on latest data. Returns anomalous rows."""
        comp_key = component.replace("/", "_")
        model    = _load_model(MODELS_DIR / f"isolation_forest_{comp_key}.joblib")
        if not model:
            return []

        df = self.pipe.build_features(component)
        if df.empty:
            return []

        df = df.rename(columns={"units_demanded": "units_demanded"})
        scores = model.predict(df)
        df["anomaly_flag"] = scores
        anomalies = df[df["anomaly_flag"] == -1].copy()

        for _, row in anomalies.iterrows():
            bg = row["blood_group"]
            self._raise_alert(
                "ml_anomaly", bg, component, "HIGH",
                f"Isolation Forest flagged anomaly: {bg} {component} on "
                f"{row['summary_date'].date()} "
                f"(demand={row['units_demanded']:.0f}, "
                f"avg7d={row['rolling_avg_7d']:.1f})"
            )

        return anomalies[["summary_date", "blood_group",
                           "units_demanded", "rolling_avg_7d"]].to_dict(orient="records")

    # ── ML alerts ─────────────────────────────────────────────────────────────

    def run_ml_alerts(self) -> dict:
        """Compare forecasts vs live stock; raise shortage/surplus/trend alerts."""
        stock    = self.pipe.fetch_stock_levels()
        expiring = self.pipe.fetch_expiry_counts()
        today    = date.today()
        alerts   = {"shortage": [], "surplus": [], "trend_shift": []}

        for comp in COMPONENTS:
            preds = self.predict_component(comp)
            df    = self.pipe.build_features(comp)

            for p in preds:
                bg       = p["blood_group"]
                forecast = p["predicted_demand"]
                curr     = stock.get(bg, 0)
                exp_7d   = expiring.get(bg, 0)

                # Shortage: forecast > current stock
                if forecast > curr:
                    alerts["shortage"].append((bg, comp))
                    self._raise_alert(
                        "ml_shortage", bg, comp, "HIGH",
                        f"ML forecasts {forecast} units demand but only "
                        f"{curr} {bg} {comp} in stock"
                    )

                # Surplus: stock > 14-day forecast
                if curr > forecast * 14:
                    alerts["surplus"].append((bg, comp))
                    self._raise_alert(
                        "ml_surplus", bg, comp, "LOW",
                        f"Surplus: {curr} units of {bg} {comp}, "
                        f"est 14-day need is {round(forecast*14)}"
                    )

                # Trend shift: rolling_avg_7d vs rolling_avg_30d change > 15%
                if not df.empty:
                    row = df[df["blood_group"] == bg]
                    if not row.empty:
                        avg7  = float(row.iloc[-1].get("rolling_avg_7d", 0) or 0)
                        avg30 = float(row.iloc[-1].get("rolling_avg_30d", 0) or 0)
                        if avg30 > 0:
                            change = abs(avg7 - avg30) / avg30
                            if change > 0.15:
                                direction = "up" if avg7 > avg30 else "down"
                                alerts["trend_shift"].append((bg, comp))
                                self._raise_alert(
                                    "ml_trend_shift", bg, comp, "MEDIUM",
                                    f"Demand trend shifting {direction} "
                                    f"{round(change*100)}% for {bg} {comp}"
                                )

        return alerts

    # ── replenishment recommendations ─────────────────────────────────────────

    def replenishment_plan(self) -> list:
        """
        order_qty = max(0, demand_7d + safety_stock - current_stock + expiring_7d)
        """
        stock    = self.pipe.fetch_stock_levels()
        expiring = self.pipe.fetch_expiry_counts()
        plan     = []

        for comp in COMPONENTS:
            preds = self.predict_component(comp)
            for p in preds:
                bg       = p["blood_group"]
                curr     = stock.get(bg, 0)
                exp_7d   = expiring.get(bg, 0)
                demand_7d= round(p["predicted_demand"] * 7)
                order    = max(0, demand_7d + SAFETY_STOCK - curr + exp_7d)

                if order > 0 or curr < SAFETY_STOCK:
                    plan.append({
                        "blood_group":       bg,
                        "component":         comp,
                        "current_stock":     curr,
                        "forecast_daily":    p["predicted_demand"],
                        "est_demand_7d":     demand_7d,
                        "expiring_in_7d":    exp_7d,
                        "recommended_order": order,
                        "model_used":        p["model_used"],
                        "urgency": ("HIGH"   if curr == 0
                                    else "MEDIUM" if order > 3
                                    else "LOW"),
                    })

        plan.sort(key=lambda r: (
            0 if r["urgency"] == "HIGH" else
            1 if r["urgency"] == "MEDIUM" else 2
        ))
        return plan

    # ── helper ────────────────────────────────────────────────────────────────

    def _raise_alert(self, alert_type, blood_group, component, severity, message):
        try:
            self.client.table("alerts").insert({
                "alert_type":  alert_type,
                "blood_group": blood_group,
                "component":   component,
                "severity":    severity,
                "message":     message,
                "is_resolved": False,
            }).execute()
        except Exception:
            pass   # duplicate on same day suppressed by unique constraint


# ── standalone ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    predictor = MLPredictor()

    print("Generating demand forecasts...")
    all_preds = predictor.predict_all()
    for comp, preds in all_preds.items():
        print(f"\n  {comp}:")
        for p in preds:
            bar = "█" * max(0, int(p["predicted_demand"]))
            print(f"    {p['blood_group']:8s}: {p['predicted_demand']:5.1f}  "
                  f"[{p['confidence_low']:.1f}–{p['confidence_high']:.1f}]  "
                  f"via {p['model_used']}")

    print("\nReplenishment plan:")
    plan = predictor.replenishment_plan()
    if plan:
        for r in plan:
            print(f"  [{r['urgency']:6s}] {r['blood_group']:8s} {r['component']:6s}: "
                  f"stock={r['current_stock']}  order={r['recommended_order']}")
    else:
        print("  All groups adequately stocked.")

    print("\nRunning ML alerts...")
    alerts = predictor.run_ml_alerts()
    print(f"  Shortage alerts : {len(alerts['shortage'])}")
    print(f"  Surplus  alerts : {len(alerts['surplus'])}")
    print(f"  Trend    alerts : {len(alerts['trend_shift'])}")
