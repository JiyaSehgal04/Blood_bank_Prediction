"""
ml/scripts/train.py
Steps 13 & 14 — Demand Forecasting + Anomaly Detection

Model routing (cold-start strategy):
  Days  1-14 : Exponential Smoothing only (SES, α=0.3)
  Days 15-29 : SES + Isolation Forest (anomaly detection)
  Days   30+ : XGBoost (XGB) replaces SES as primary forecaster
               Ensemble = 0.7 × XGB + 0.3 × SES

All models saved as .joblib in ml/models/.
Predictions written to Supabase `predictions` table.
"""

import sys
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import date
from typing import Optional, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ml.scripts.preprocess import FeaturePipeline, MIN_ROWS_FOR_RF, INDIAN_BLOOD_DIST
from db.supabase_client import get_client
from shared.cleaning_utils import VALID_BLOOD_GROUPS

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

XGB_PARAMS = {
    "n_estimators": 300,
    "max_depth": 6,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "random_state": 42,
    "n_jobs": -1,
    "eval_metric": "mae",
}
SES_ALPHA = 0.3
ANOMALY_CONTAMINATION = 0.05
COMPONENTS = ["WB/PRC", "FFP", "PLT"]
PRED_TABLE = "predictions"


# ── Exponential Smoothing ─────────────────────────────────────────────────────


class SESForecaster:
    """
    Simple Exponential Smoothing: F(t+1) = α·A(t) + (1-α)·F(t)
    Initialised with Indian population distribution as baseline.
    Works with zero history.
    """

    def __init__(self, alpha: float = SES_ALPHA):
        self.alpha = alpha
        self.state = {
            bg: INDIAN_BLOOD_DIST.get(bg, 0.01) * 20 for bg in VALID_BLOOD_GROUPS
        }  # baseline ~20 units/day scaled

    def update(self, blood_group: str, actual: float) -> None:
        prev = self.state.get(blood_group, 0)
        self.state[blood_group] = self.alpha * actual + (1 - self.alpha) * prev

    def predict(self, blood_group: str) -> float:
        return round(self.state.get(blood_group, 0), 2)

    def fit_history(self, series: pd.Series, blood_group: str) -> None:
        """Fit on historical demand series (list of daily values)."""
        for val in series:
            self.update(blood_group, val)

    def save(self, path: Path) -> None:
        joblib.dump(self, path)

    @staticmethod
    def load(path: Path) -> "SESForecaster":
        return joblib.load(path)


# ── XGBoost Forecaster ────────────────────────────────────────────────────────


class XGBForecaster:
    def __init__(self) -> None:
        from xgboost import XGBRegressor

        self.model = XGBRegressor(**XGB_PARAMS)
        self.features: Optional[List] = None
        self.trained = False

    def fit(self, df: pd.DataFrame, feature_cols: list) -> dict:
        X = df[feature_cols].values
        y = df["target_next_day"].values
        self.model.fit(X, y)
        self.features = feature_cols
        self.trained = True

        # Training metrics
        preds = self.model.predict(X)
        mae = float(np.mean(np.abs(y - preds)))
        rmse = float(np.sqrt(np.mean((y - preds) ** 2)))
        # Coverage accuracy: % predictions within ±20% of actual
        within_20pct = np.mean(np.abs(y - preds) <= np.maximum(y * 0.2, 1)) * 100
        return {
            "mae": round(mae, 3),
            "rmse": round(rmse, 3),
            "coverage_20pct": round(within_20pct, 1),
        }

    def predict(self, row: pd.Series) -> float:
        X = row[self.features].values.reshape(1, -1)
        return max(0, round(float(self.model.predict(X)[0]), 2))

    def save(self, path: Path) -> None:
        joblib.dump(self, path)

    @staticmethod
    def load(path: Path) -> "XGBForecaster":
        return joblib.load(path)


# ── Isolation Forest (Anomaly Detection) ─────────────────────────────────────


class AnomalyDetector:
    """
    Step 14 — Isolation Forest for demand spike/drop detection.
    Features: day_of_week, units_demanded, rolling_avg_7d, rolling_std_7d, stock_level
    Output: anomaly_score (-1 = outlier, +1 = normal)
    """

    def __init__(self) -> None:
        from sklearn.ensemble import IsolationForest

        self.model = IsolationForest(
            contamination=ANOMALY_CONTAMINATION,
            random_state=42,
            n_estimators=100,
        )
        self.trained = False
        self.feature_cols = [
            "day_of_week",
            "units_demanded",
            "rolling_avg_7d",
            "rolling_std_7d",
            "current_stock_level",
        ]

    def fit(self, df: pd.DataFrame) -> None:
        """df must contain the required feature cols + units_demanded."""
        X = df[self.feature_cols].fillna(0).values
        self.model.fit(X)
        self.trained = True

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """Returns array of -1 (anomaly) or +1 (normal) per row."""
        X = df[self.feature_cols].fillna(0).values
        return self.model.predict(X)

    def score_samples(self, df: pd.DataFrame) -> np.ndarray:
        """Returns anomaly scores (lower = more anomalous)."""
        X = df[self.feature_cols].fillna(0).values
        return self.model.score_samples(X)

    def save(self, path: Path) -> None:
        joblib.dump(self, path)

    @staticmethod
    def load(path: Path) -> "AnomalyDetector":
        return joblib.load(path)


# ── Ensemble trainer ──────────────────────────────────────────────────────────


class ModelTrainer:
    def __init__(self, csv_path: Optional[str] = None) -> None:
        self.pipe = FeaturePipeline()
        self._client = None
        self.csv_path = csv_path

    def _get_client(self):
        """Lazily initialize and return the Supabase client."""
        if self._client is None:
            self._client = get_client()
        return self._client

    def train_all(self) -> dict:
        """Train all models for all components. Returns training report."""
        report = {}
        for comp in COMPONENTS:
            print(f"\n── {comp} ──")
            result = self.train_component(comp)
            report[comp] = result
        return report

    def train_component(self, component: str) -> dict:
        if self.csv_path:
            df = self.pipe.build_features_from_csv(self.csv_path, component)
        else:
            df = self.pipe.build_features(component)

        if df.empty:
            print(f"  No data for {component}.")
            return {"status": "no_data"}

        n_days = df["summary_date"].nunique()
        print(f"  {n_days} days of data, {len(df)} rows")

        feature_cols = self.pipe.get_feature_cols()
        result = {"days": n_days, "component": component}

        # ── SES (always train) ────────────────────────────────────────────────
        ses_models = {}
        for bg in VALID_BLOOD_GROUPS:
            ses = SESForecaster()
            series = df[df["blood_group"] == bg]["units_demanded"]
            ses.fit_history(series, bg)
            ses_models[bg] = ses
        joblib.dump(
            ses_models, MODELS_DIR / f"ses_{component.replace('/', '_')}.joblib"
        )
        print("  SES trained for all blood groups.")
        result["ses"] = "trained"

        # ── Isolation Forest (14+ days) ───────────────────────────────────────
        if n_days >= 14:
            anomaly = AnomalyDetector()
            anomaly.fit(df)
            anomaly.save(
                MODELS_DIR
                / f"isolation_forest_{component.replace('/', '_')}.joblib"
            )

            # Score all historical rows
            scores = anomaly.predict(df)
            df["anomaly_flag"] = scores
            anomalies = df[df["anomaly_flag"] == -1]
            print(f"  Isolation Forest trained. Anomalies found: {len(anomalies)}")
            result["isolation_forest"] = {
                "status": "trained",
                "anomalies_detected": len(anomalies),
                "anomaly_dates": anomalies["summary_date"]
                .dt.date.astype(str)
                .tolist()[:10],
            }
        else:
            print(f"  Isolation Forest skipped ({n_days} days < 14 required)")
            result["isolation_forest"] = {
                "status": "skipped",
                "reason": f"only {n_days} days",
            }

        # ── XGBoost (30+ days) ────────────────────────────────────────────────
        xgb = None
        if n_days >= MIN_ROWS_FOR_RF:
            xgb = XGBForecaster()
            metrics = xgb.fit(df, feature_cols)
            xgb.save(MODELS_DIR / f"xgb_{component.replace('/', '_')}.joblib")
            print(
                f"  XGBoost trained. MAE={metrics['mae']}, "
                f"RMSE={metrics['rmse']}, Coverage={metrics['coverage_20pct']}%"
            )
            result["xgboost"] = {"status": "trained", **metrics}
        else:
            print(
                f"  XGBoost skipped ({n_days} days < {MIN_ROWS_FOR_RF} required)"
            )
            result["xgboost"] = {
                "status": "skipped",
                "reason": f"need {MIN_ROWS_FOR_RF} days, have {n_days}",
            }

        # ── Generate and store predictions ────────────────────────────────────
        n_stored = self._store_predictions(
            df,
            component,
            ses_models,
            xgb if n_days >= MIN_ROWS_FOR_RF else None,
        )
        result["predictions_stored"] = n_stored
        return result

    def _store_predictions(
        self,
        df: pd.DataFrame,
        component: str,
        ses_models: dict,
        xgb: "Optional[XGBForecaster]",
    ) -> int:
        feature_cols = self.pipe.get_feature_cols()
        records: list[dict] = []
        today = date.today()

        for bg in VALID_BLOOD_GROUPS:
            row = df[df["blood_group"] == bg]
            if row.empty:
                continue
            last_row = row.iloc[-1]

            # SES prediction
            ses_pred = ses_models[bg].predict(bg)

            # XGBoost prediction (if available)
            if xgb and xgb.trained:
                xgb_pred = xgb.predict(last_row)
                final = round(0.7 * xgb_pred + 0.3 * ses_pred, 1)
                model_used = "ensemble_xgb_ses"
            else:
                final = ses_pred
                model_used = "ses"

            # Confidence band: ±1 std of rolling_std_7d
            std = float(last_row.get("rolling_std_7d", 1) or 1)
            records.append(
                {
                    "prediction_date": today.isoformat(),
                    "blood_group": bg,
                    "component": component,
                    "predicted_demand": final,
                    "confidence_low": max(0, round(final - std, 1)),
                    "confidence_high": round(final + std, 1),
                    "model_used": model_used,
                }
            )

        if not records:
            return 0

        try:
            self._get_client().table(PRED_TABLE).upsert(
                records, on_conflict="prediction_date,blood_group,component"
            ).execute()
            return len(records)
        except Exception as e:
            print(f"  Warning: prediction store failed: {e}")
            return 0


# ── standalone ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Train blood bank ML models")
    parser.add_argument(
        "--from-csv",
        type=str,
        default=None,
        help="Path to cleaned_records.csv for offline training",
    )
    args = parser.parse_args()

    trainer = ModelTrainer(csv_path=args.from_csv)
    print("Training all ML models...")
    report = trainer.train_all()
    print("\n" + "=" * 55)
    print("Training Report:")
    for comp, res in report.items():
        print(f"\n  {comp}:")
        for k, v in res.items():
            print(f"    {k}: {v}")
