"""
ml/scripts/seasonal.py
Step 15 — Seasonal & Trend Analysis

Uses statsmodels seasonal_decompose (additive, period=7 for weekly cycle).
Requires 14+ days; period=30 monthly needs 60+ days.

Reports:
  - Trend      : growing/declining demand over time
  - Seasonal   : weekly cycle (Tuesday peaks, Sunday troughs)
  - Residual   : unexplained variation (camp spikes land here)
  - Monthly    : Dec dip → Jan ramp → Feb peak (visible with 76-day data)
"""

import sys
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ml.scripts.preprocess import FeaturePipeline
from db.supabase_client    import get_client
from shared.cleaning_utils import VALID_BLOOD_GROUPS

MIN_DAYS_WEEKLY  = 14
MIN_DAYS_MONTHLY = 60


class SeasonalAnalyzer:
    def __init__(self):
        self.pipe   = FeaturePipeline()
        self.client = get_client()

    # ── weekly decomposition ──────────────────────────────────────────────────

    def decompose_weekly(self, blood_group: str = None,
                         component: str = "WB/PRC") -> dict:
        """
        Decompose demand time series into trend + weekly seasonal + residual.
        Returns dict with series arrays and summary stats.
        """
        from statsmodels.tsa.seasonal import seasonal_decompose

        df = self._load_demand(component)
        if df.empty:
            return {"error": "No data available"}

        n_days = df["summary_date"].nunique()
        if n_days < MIN_DAYS_WEEKLY:
            return {
                "error": f"Need {MIN_DAYS_WEEKLY}+ days, have {n_days}",
                "days_available": n_days
            }

        groups = [blood_group] if blood_group else list(VALID_BLOOD_GROUPS)
        results = {}

        for bg in groups:
            series = (df[df["blood_group"] == bg]
                      .set_index("summary_date")["units_demanded"]
                      .sort_index()
                      .asfreq("D", fill_value=0))

            if len(series) < MIN_DAYS_WEEKLY * 2:
                results[bg] = {"status": "insufficient_data"}
                continue

            period = min(7, len(series) // 2)
            try:
                decomp = seasonal_decompose(series, model="additive",
                                             period=period, extrapolate_trend="freq")
                trend_direction = ("increasing"
                                   if decomp.trend.dropna().iloc[-1] >
                                      decomp.trend.dropna().iloc[0]
                                   else "decreasing")
                peak_day = int(decomp.seasonal.groupby(
                    decomp.seasonal.index.dayofweek).mean().idxmax())
                trough_day = int(decomp.seasonal.groupby(
                    decomp.seasonal.index.dayofweek).mean().idxmin())
                day_names = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

                results[bg] = {
                    "status":          "ok",
                    "n_days":          n_days,
                    "trend_direction": trend_direction,
                    "trend_start":     round(float(decomp.trend.dropna().iloc[0]), 2),
                    "trend_end":       round(float(decomp.trend.dropna().iloc[-1]), 2),
                    "peak_day":        day_names[peak_day],
                    "trough_day":      day_names[trough_day],
                    "seasonal_amplitude": round(
                        float(decomp.seasonal.max() - decomp.seasonal.min()), 2
                    ),
                    "trend":    self._series_to_list(decomp.trend),
                    "seasonal": self._series_to_list(decomp.seasonal),
                    "residual": self._series_to_list(decomp.resid),
                    "dates":    [str(d.date()) for d in series.index],
                }
            except Exception as e:
                results[bg] = {"status": "error", "message": str(e)}

        return results

    # ── monthly report ────────────────────────────────────────────────────────

    def monthly_report(self, component: str = "WB/PRC") -> dict:
        """
        Monthly aggregation: received, issued, expired, wastage rate, fulfillment rate.
        """
        rows = (self.client.table("daily_summary")
                .select("*").eq("component", component)
                .order("summary_date").execute().data or [])

        if not rows:
            return {"error": "No daily_summary data"}

        df = pd.DataFrame(rows)
        df["summary_date"] = pd.to_datetime(df["summary_date"])
        df["month"]        = df["summary_date"].dt.to_period("M").astype(str)

        monthly = (df.groupby(["month", "blood_group"])
                   .agg(
                       received  =("units_received", "sum"),
                       issued    =("units_issued",   "sum"),
                       expired   =("units_expired",  "sum"),
                       unmet     =("unmet_requests", "sum"),
                   ).reset_index())

        monthly["wastage_rate"]     = monthly.apply(
            lambda r: round(r["expired"] / r["received"] * 100, 1)
            if r["received"] > 0 else 0, axis=1
        )
        monthly["fulfillment_rate"] = monthly.apply(
            lambda r: round(r["issued"] / (r["issued"] + r["unmet"]) * 100, 1)
            if (r["issued"] + r["unmet"]) > 0 else 100.0, axis=1
        )

        # Overall by month
        monthly_total = (df.groupby("month")
                         .agg(total_received=("units_received", "sum"),
                              total_issued   =("units_issued",   "sum"),
                              total_expired  =("units_expired",  "sum"),
                              avg_daily      =("units_received", "mean"))
                         .reset_index())

        return {
            "component":     component,
            "by_group":      monthly.to_dict(orient="records"),
            "monthly_totals":monthly_total.to_dict(orient="records"),
        }

    # ── heatmap data ──────────────────────────────────────────────────────────

    def demand_heatmap(self, component: str = "WB/PRC") -> dict:
        """
        Return month × blood_group demand matrix for heatmap visualisation.
        """
        rows = (self.client.table("daily_summary")
                .select("summary_date,blood_group,units_received")
                .eq("component", component)
                .execute().data or [])

        if not rows:
            return {"error": "No data"}

        df = pd.DataFrame(rows)
        df["summary_date"] = pd.to_datetime(df["summary_date"])
        df["month"]        = df["summary_date"].dt.strftime("%b %Y")

        pivot = (df.groupby(["month", "blood_group"])["units_received"]
                 .sum()
                 .unstack(fill_value=0)
                 .reset_index())

        return {
            "months":       pivot["month"].tolist(),
            "blood_groups": [c for c in pivot.columns if c != "month"],
            "matrix":       pivot.drop("month", axis=1).values.tolist(),
        }

    # ── helpers ───────────────────────────────────────────────────────────────

    def _load_demand(self, component: str) -> pd.DataFrame:
        rows = (self.client.table("daily_summary")
                .select("summary_date,blood_group,units_issued")
                .eq("component", component)
                .order("summary_date").execute().data or [])
        if not rows:
            return pd.DataFrame()
        df = pd.DataFrame(rows)
        df.rename(columns={"units_issued": "units_demanded"}, inplace=True)
        df["summary_date"] = pd.to_datetime(df["summary_date"])
        df["units_demanded"] = pd.to_numeric(df["units_demanded"],
                                              errors="coerce").fillna(0)
        return df

    def _series_to_list(self, s: pd.Series) -> list:
        return [None if np.isnan(v) else round(float(v), 3)
                for v in s.values]


# ── standalone ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    analyzer = SeasonalAnalyzer()
    print("Running seasonal decomposition (WB/PRC)...")
    result = analyzer.decompose_weekly(component="WB/PRC")
    if "error" in result:
        print(f"  {result['error']}")
    else:
        for bg, r in result.items():
            status = r.get("status", "?") if isinstance(r, dict) else "?"
            if status == "ok":
                print(f"  {bg:8s}: trend={r['trend_direction']:10s} "
                      f"peak={r['peak_day']}  trough={r['trough_day']}  "
                      f"amplitude={r['seasonal_amplitude']}")
            else:
                print(f"  {bg:8s}: {r}")

    print("\nMonthly report (WB/PRC):")
    report = analyzer.monthly_report("WB/PRC")
    for row in report.get("monthly_totals", []):
        print(f"  {row['month']}: rcv={row['total_received']}  "
              f"iss={row['total_issued']}  exp={row['total_expired']}")
