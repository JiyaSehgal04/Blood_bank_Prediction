"""
ml/scripts/preprocess.py
Step 12 — Feature Engineering Pipeline

Reads daily_summary from Supabase → builds ML-ready feature matrix.
Pipeline grows automatically as new data is uploaded.

Features (per blood_group per day):
  Temporal  : day_of_week, month, is_weekend, is_holiday
  Rolling   : rolling_avg_7d, rolling_avg_30d, rolling_std_7d
  Lag       : lag_1d, lag_7d
  Encoded   : blood_group_encoded (one-hot, 8 cols)
  Inventory : expiring_within_7d, current_stock_level
  Population: population_demand_rate (Indian blood type distribution)

Target: units_demanded_next_day (units_received of the NEXT day, as proxy)
"""

import sys
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import date, timedelta

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from db.supabase_client   import get_client
from shared.cleaning_utils import VALID_BLOOD_GROUPS

# ── Indian blood type distribution (population demand baseline) ───────────────
INDIAN_BLOOD_DIST = {
    'O Pos': 0.327, 'B Pos': 0.304, 'A Pos': 0.221, 'AB Pos': 0.071,
    'O Neg': 0.037, 'A Neg': 0.019, 'B Neg': 0.015, 'AB Neg': 0.006,
}

# ── Indian public holidays (static list — extend annually) ───────────────────
INDIAN_HOLIDAYS = {
    date(2025, 1, 26), date(2025, 8, 15), date(2025, 10, 2),
    date(2025, 10, 24), date(2025, 11, 1), date(2025, 12, 25),
    date(2026, 1, 1),  date(2026, 1, 14), date(2026, 1, 26),
    date(2026, 3, 14), date(2026, 3, 31), date(2026, 4, 14),
}

BLOOD_GROUPS_SORTED = sorted(VALID_BLOOD_GROUPS)
COMPONENTS          = ["WB/PRC", "FFP", "PLT"]
MIN_ROWS_FOR_RF     = 30   # need 30+ days before Random Forest is useful


class FeaturePipeline:
    def __init__(self):
        self._client = get_client()

    # ── fetch raw data ────────────────────────────────────────────────────────

    def fetch_daily_summary(self) -> pd.DataFrame:
        rows = (self._client.table("daily_summary")
                .select("*").order("summary_date").execute().data or [])
        if not rows:
            return pd.DataFrame()
        df = pd.DataFrame(rows)
        df["summary_date"] = pd.to_datetime(df["summary_date"])
        for col in ("units_received", "units_issued", "units_expired",
                    "closing_stock", "unmet_requests"):
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)
        return df

    def fetch_expiry_counts(self) -> dict:
        """Return {blood_group: count of units expiring within 7 days}."""
        cutoff = (date.today() + timedelta(days=7)).isoformat()
        rows = (self._client.table("blood_inventory")
                .select("blood_group")
                .eq("status", "available")
                .lte("expiry_date", cutoff)
                .execute().data or [])
        counts = {}
        for r in rows:
            bg = r["blood_group"]
            counts[bg] = counts.get(bg, 0) + 1
        return counts

    def fetch_stock_levels(self) -> dict:
        """Return {blood_group: current available count}."""
        rows = (self._client.table("blood_inventory")
                .select("blood_group")
                .eq("status", "available")
                .execute().data or [])
        counts = {}
        for r in rows:
            bg = r["blood_group"]
            counts[bg] = counts.get(bg, 0) + 1
        return counts

    # ── build feature matrix ──────────────────────────────────────────────────

    def build_features(self, component: str = "WB/PRC") -> pd.DataFrame:
        """
        Build full feature matrix for one component.
        Returns DataFrame with all features + target column.
        """
        raw = self.fetch_daily_summary()
        if raw.empty:
            return pd.DataFrame()

        # Filter to this component
        df = raw[raw["component"] == component].copy()
        if df.empty:
            return pd.DataFrame()

        # Pivot: one row per date, one column per blood group (units_received = demand proxy)
        pivot = df.pivot_table(
            index="summary_date",
            columns="blood_group",
            values="units_issued",        # issued = actual demand signal
            aggfunc="sum",
            fill_value=0
        ).reset_index()

        # Ensure all blood groups present
        for bg in BLOOD_GROUPS_SORTED:
            if bg not in pivot.columns:
                pivot[bg] = 0

        # Melt back to long format for per-group features
        long = pivot.melt(id_vars="summary_date",
                          value_vars=BLOOD_GROUPS_SORTED,
                          var_name="blood_group",
                          value_name="units_demanded")

        long = long.sort_values(["blood_group", "summary_date"]).reset_index(drop=True)

        # ── temporal features ─────────────────────────────────────────────────
        long["day_of_week"] = long["summary_date"].dt.dayofweek   # 0=Mon, 6=Sun
        long["month"]       = long["summary_date"].dt.month
        long["is_weekend"]  = (long["day_of_week"] >= 5).astype(int)
        long["is_holiday"]  = long["summary_date"].dt.date.apply(
            lambda d: int(d in INDIAN_HOLIDAYS)
        )

        # ── rolling features (per blood group) ───────────────────────────────
        long = long.sort_values(["blood_group", "summary_date"])
        for bg, grp in long.groupby("blood_group"):
            idx = grp.index
            long.loc[idx, "rolling_avg_7d"]  = (
                grp["units_demanded"].rolling(7,  min_periods=1).mean()
            )
            long.loc[idx, "rolling_avg_30d"] = (
                grp["units_demanded"].rolling(30, min_periods=1).mean()
            )
            long.loc[idx, "rolling_std_7d"]  = (
                grp["units_demanded"].rolling(7,  min_periods=2).std().fillna(0)
            )
            long.loc[idx, "lag_1d"] = grp["units_demanded"].shift(1).fillna(0)
            long.loc[idx, "lag_7d"] = grp["units_demanded"].shift(7).fillna(0)

        # ── one-hot encode blood group ────────────────────────────────────────
        ohe = pd.get_dummies(long["blood_group"], prefix="bg").astype(int)
        # ensure all 8 columns exist
        for bg in BLOOD_GROUPS_SORTED:
            col = f"bg_{bg.replace(' ', '_')}"
            if col not in ohe.columns:
                ohe[col] = 0
        long = pd.concat([long, ohe], axis=1)

        # ── inventory features (live, same value for all rows on today) ───────
        expiry_counts = self.fetch_expiry_counts()
        stock_levels  = self.fetch_stock_levels()
        long["expiring_within_7d"]   = long["blood_group"].map(
            lambda bg: expiry_counts.get(bg, 0)
        )
        long["current_stock_level"]  = long["blood_group"].map(
            lambda bg: stock_levels.get(bg, 0)
        )

        # ── population demand rate ────────────────────────────────────────────
        long["population_demand_rate"] = long["blood_group"].map(INDIAN_BLOOD_DIST)

        # ── target: next-day demand ───────────────────────────────────────────
        for bg, grp in long.groupby("blood_group"):
            long.loc[grp.index, "target_next_day"] = (
                grp["units_demanded"].shift(-1)
            )

        # Drop last row per group (no target) and NaN targets
        long = long.dropna(subset=["target_next_day"])
        long["target_next_day"] = long["target_next_day"].astype(int)

        long["component"] = component
        return long.reset_index(drop=True)

    def get_feature_cols(self) -> list:
        """Return ordered list of feature column names used for model input."""
        bg_cols = [f"bg_{bg.replace(' ', '_')}" for bg in BLOOD_GROUPS_SORTED]
        return [
            "day_of_week", "month", "is_weekend", "is_holiday",
            "rolling_avg_7d", "rolling_avg_30d", "rolling_std_7d",
            "lag_1d", "lag_7d",
            "expiring_within_7d", "current_stock_level",
            "population_demand_rate",
        ] + bg_cols

    def get_latest_row(self, blood_group: str,
                       component: str = "WB/PRC") -> pd.Series:
        """Return the most recent feature row for a blood_group (for prediction)."""
        df = self.build_features(component)
        if df.empty:
            return pd.Series()
        mask = df["blood_group"] == blood_group
        return df[mask].iloc[-1] if mask.any() else pd.Series()


# ── standalone ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    pipe = FeaturePipeline()
    print("Building features for WB/PRC...")
    df = pipe.build_features("WB/PRC")
    if df.empty:
        print("No data yet.")
    else:
        print(f"Feature matrix: {df.shape[0]} rows × {df.shape[1]} cols")
        print(f"Date range    : {df['summary_date'].min().date()} → {df['summary_date'].max().date()}")
        print(f"Blood groups  : {sorted(df['blood_group'].unique())}")
        print(f"\nFeature columns:\n  {pipe.get_feature_cols()}")
        print(f"\nSample row (O Pos):")
        row = df[df["blood_group"] == "O Pos"].iloc[-1]
        for col in pipe.get_feature_cols() + ["target_next_day"]:
            print(f"  {col:30s}: {row.get(col, 'N/A')}")
