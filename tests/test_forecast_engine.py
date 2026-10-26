import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd

from ml.scripts import forecast_engine as fe
from ml.scripts.replenishment_policy import plan_replenishment

END = date(2026, 10, 26)
GROUPS = ["O Pos", "O Neg", "A Pos", "A Neg", "B Pos", "B Neg", "AB Pos", "AB Neg"]


def _summary(daily_by_group: dict, component="WB/PRC", end=END) -> pd.DataFrame:
    """daily_summary-style frame; daily_by_group maps group -> list of daily demand (oldest first)."""
    rows = []
    for group, series in daily_by_group.items():
        start = end - timedelta(days=len(series) - 1)
        for i, units in enumerate(series):
            if units:
                rows.append({
                    "summary_date": pd.Timestamp(start + timedelta(days=i)),
                    "blood_group": group,
                    "component": component,
                    "units_issued": units,
                    "unmet_requests": 0,
                })
    return pd.DataFrame(rows)


def _poisson(rate, n, seed):
    return list(np.random.default_rng(seed).poisson(rate, n))


# ── TSB: the standard method for intermittent demand ──

def test_tsb_tracks_a_steady_rate():
    series = pd.Series([3] * 120)
    assert abs(fe.tsb_daily(series) - 3.0) < 0.2


def test_tsb_is_zero_without_any_demand():
    assert fe.tsb_daily(pd.Series([0] * 90)) == 0.0


def test_tsb_decays_when_demand_stops():
    active = fe.tsb_daily(pd.Series([2] * 60))
    stopped = fe.tsb_daily(pd.Series([2] * 60 + [0] * 60))
    assert stopped < active * 0.5


# ── a forecast is only published when the history supports it ──

def test_history_is_insufficient_when_almost_nothing_was_issued():
    daily = pd.Series([0] * 85 + [1, 0, 0, 1, 0], index=pd.date_range(end=END, periods=90))
    result = fe.assess_history(daily, end_date=END)
    assert result["sufficient"] is False
    assert "20" in result["reason"]            # states the threshold


def test_history_is_sufficient_with_regular_demand():
    daily = pd.Series(_poisson(2.0, 90, 1), index=pd.date_range(end=END, periods=90))
    assert fe.assess_history(daily, end_date=END)["sufficient"] is True


def test_history_is_stale_when_nothing_recorded_recently():
    daily = pd.Series(_poisson(3.0, 120, 2), index=pd.date_range(end=END - timedelta(days=45), periods=120))
    result = fe.assess_history(daily, end_date=END)
    assert result["sufficient"] is False and "since" in result["reason"]


# ── 7-day forecast with a real interval ──

def test_weekly_forecast_interval_brackets_the_point_estimate():
    series = pd.Series(_poisson(2.0, 180, 3), index=pd.date_range(end=END, periods=180))
    out = fe.weekly_forecast(series)
    assert 0 <= out["low_7d"] <= out["point_7d"] <= out["high_7d"]
    assert 8 < out["point_7d"] < 22            # true weekly mean is 14
    assert out["high_7d"] - out["low_7d"] > 2  # an honest spread, not a fixed +/-1


def test_weekly_forecast_is_zero_for_empty_history():
    out = fe.weekly_forecast(pd.Series([0] * 60, index=pd.date_range(end=END, periods=60)))
    assert (out["low_7d"], out["point_7d"], out["high_7d"]) == (0.0, 0.0, 0.0)


# ── groups: share the component total using observed shares, with a prior for rare groups ──

def test_group_allocation_sums_to_the_component_total():
    daily = {"O Pos": [3] * 100, "A Pos": [1] * 100}
    shares = fe.group_shares(_summary(daily), "WB/PRC", END, window=90)
    assert abs(sum(shares.values()) - 1.0) < 1e-9
    assert shares["O Pos"] > shares["A Pos"] > shares["AB Neg"] > 0   # rare group keeps a small prior share


def test_forecast_component_reports_insufficient_data_instead_of_inventing_numbers():
    sparse = _summary({"O Pos": [0] * 80 + [1] * 2 + [0] * 8})
    out = fe.forecast_component(sparse, "WB/PRC", END)
    assert out["status"] == "insufficient_data"
    assert out["rows"] == [] and "20" in out["reason"]


def test_forecast_component_returns_a_row_per_group_when_data_supports_it():
    daily = {g: _poisson(r, 120, i) for i, (g, r) in enumerate(zip(GROUPS, [3, 1, 2, 0.5, 2, 0.5, 1, 0.2]))}
    out = fe.forecast_component(_summary(daily), "WB/PRC", END)

    assert out["status"] == "ok" and len(out["rows"]) == 8
    row = {r["blood_group"]: r for r in out["rows"]}
    assert row["O Pos"]["model_used"] == "tsb_hierarchical"
    assert row["O Pos"]["confidence_low"] <= row["O Pos"]["predicted_demand"] <= row["O Pos"]["confidence_high"]
    per_day_total = sum(r["predicted_demand"] for r in out["rows"])
    assert 5 < per_day_total < 14                              # true total is 9.2 a day


# ── accuracy is measured on held-out weeks, against a naive baseline ──

def test_backtest_scores_forecast_against_a_naive_baseline():
    daily = {g: _poisson(r, 200, 10 + i) for i, (g, r) in enumerate(zip(GROUPS, [3, 1, 2, 0.5, 2, 0.5, 1, 0.3]))}
    metrics = fe.backtest_component(_summary(daily), "WB/PRC", END, horizon=7, min_train=60)

    assert metrics["windows"] >= 10
    assert metrics["mae_model"] <= metrics["mae_naive"] * 1.25
    assert 0.5 <= metrics["interval_coverage"] <= 1.0
    assert set(metrics) >= {"mae_model", "mae_naive", "interval_coverage", "windows"}


# ── replenishment policy ──

def test_order_covers_demand_plus_safety_minus_usable_stock():
    plan = plan_replenishment(
        forecasts={("O Pos", "WB/PRC"): {"est_7d": 14.0, "daily": 2.0, "model": "tsb_hierarchical"}},
        stock={("O Pos", "WB/PRC"): 6},
        expiring={},
        groups=["O Pos"], components=["WB/PRC"],
    )
    row = plan[0]
    assert row["safety_stock"] == 7                      # ceil(0.5 * 14)
    assert row["recommended_order"] == 15                # 14 + 7 - 6
    assert row["basis"] == "forecast"


def test_expiring_units_that_will_be_used_are_not_reordered():
    # 10 units expire within 7 days but 14 will be demanded: FEFO uses them, so no extra order for them.
    plan = plan_replenishment(
        forecasts={("O Pos", "WB/PRC"): {"est_7d": 14.0, "daily": 2.0, "model": "tsb_hierarchical"}},
        stock={("O Pos", "WB/PRC"): 10}, expiring={("O Pos", "WB/PRC"): 10},
        groups=["O Pos"], components=["WB/PRC"],
    )
    assert plan[0]["recommended_order"] == 11            # 14 + 7 - 10


def test_expiring_units_beyond_expected_demand_are_written_off_from_usable_stock():
    plan = plan_replenishment(
        forecasts={("O Pos", "PLT"): {"est_7d": 2.0, "daily": 0.3, "model": "tsb_hierarchical"}},
        stock={("O Pos", "PLT"): 10}, expiring={("O Pos", "PLT"): 10},
        groups=["O Pos"], components=["PLT"],
    )
    row = plan[0]
    assert row["usable_stock"] == 2                      # 10 - (10 expiring - 2 demanded)
    assert row["safety_stock"] == 2                      # floor of 2 applies (0.5 * 2 = 1)
    assert row["recommended_order"] == 2                 # 2 demand + 2 safety - 2 usable


def test_groups_without_a_forecast_get_a_clearly_labelled_minimum_stock_order():
    plan = plan_replenishment(
        forecasts={}, stock={("O Neg", "WB/PRC"): 1}, expiring={},
        groups=["O Neg"], components=["WB/PRC"], minimum_stock=5,
    )
    row = plan[0]
    assert row["basis"] == "minimum_stock" and row["recommended_order"] == 4
    assert row["est_demand_7d"] is None and row["forecast_daily"] is None
