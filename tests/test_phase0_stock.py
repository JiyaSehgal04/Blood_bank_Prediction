import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd

from api.routes import dashboard
from ml.scripts.preprocess import FeaturePipeline, complete_daily_calendar
from tests.fakes import FakeClient, unit_row

TODAY = date.today()
PAST = (TODAY - timedelta(days=3)).isoformat()
SOON = (TODAY + timedelta(days=3)).isoformat()
LATER = (TODAY + timedelta(days=30)).isoformat()


# ── the forecast pipeline must not count past-due units as stock or as "expiring" ──

def _pipeline(rows):
    pipe = FeaturePipeline()
    pipe._client = FakeClient({"blood_inventory": rows}, max_rows=1000)
    return pipe


def test_stock_levels_exclude_past_due_units():
    pipe = _pipeline([
        unit_row(1, expiry=PAST), unit_row(2, expiry=PAST),
        unit_row(3, expiry=LATER), unit_row(4, expiry=SOON),
    ])

    assert pipe.fetch_stock_levels() == {("O Pos", "WB/PRC"): 2}


def test_expiring_soon_counts_only_units_still_in_date():
    pipe = _pipeline([unit_row(1, expiry=PAST), unit_row(2, expiry=SOON), unit_row(3, expiry=LATER)])

    assert pipe.fetch_expiry_counts() == {("O Pos", "WB/PRC"): 1}


# ── zero-demand days must exist in the history ──

def test_complete_daily_calendar_fills_missing_days_with_zero():
    pivot = pd.DataFrame({
        "summary_date": pd.to_datetime(["2026-01-01", "2026-01-04"]),
        "O Pos": [3, 5],
        "A Pos": [1, 0],
    })

    out = complete_daily_calendar(pivot)

    assert list(out["summary_date"].dt.strftime("%Y-%m-%d")) == [
        "2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04",
    ]
    assert list(out["O Pos"]) == [3, 0, 0, 5]
    assert list(out["A Pos"]) == [1, 0, 0, 0]


def test_complete_daily_calendar_handles_empty_and_single_day():
    assert complete_daily_calendar(pd.DataFrame({"summary_date": pd.to_datetime([])})).empty
    one = pd.DataFrame({"summary_date": pd.to_datetime(["2026-01-01"]), "O Pos": [2]})
    assert len(complete_daily_calendar(one)) == 1


# ── the dashboard counts in-date stock separately from past-due stock ──

def test_split_by_expiry_separates_in_date_from_past_due():
    rows = [
        {"expiry_date": PAST}, {"expiry_date": TODAY.isoformat()},
        {"expiry_date": LATER}, {"expiry_date": None},
    ]

    in_date, past_due = dashboard._split_by_expiry(rows, TODAY)

    assert [r["expiry_date"] for r in in_date] == [TODAY.isoformat(), LATER, None]
    assert [r["expiry_date"] for r in past_due] == [PAST]


# ── the scan endpoint expires past-due stock before it raises alerts ──

def test_scan_endpoint_runs_the_expiry_sweep_first(monkeypatch):
    from api.app import create_app
    from api.routes import alerts as alerts_routes

    order = []
    monkeypatch.setattr(alerts_routes, "get_client", lambda: "client", raising=False)
    monkeypatch.setattr(alerts_routes, "sweep_expired_units",
                        lambda client, **kw: order.append("sweep") or {"expired": 7, "wastage_logged": 7, "dry_run": False})

    class FakeAlerts:
        def run_stock_alerts(self):
            order.append("stock")
            return {"total_raised": 0}

    class FakeInventory:
        def load_from_db(self):
            order.append("load")
            return 0

    class FakeExpiry:
        def __init__(self, inv):
            pass

        def run_daily_scan(self):
            order.append("expiry")
            return {"expired": [], "critical": [], "warning": [], "alerts_raised": 0}

    monkeypatch.setattr(alerts_routes, "AlertService", FakeAlerts)
    monkeypatch.setattr(alerts_routes, "MultiListInventory", FakeInventory)
    monkeypatch.setattr(alerts_routes, "ExpiryService", FakeExpiry)

    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        token = client.post("/api/auth/login", json={"username": "admin", "password": "bloodbank2026"}).get_json()["token"]
        res = client.post("/api/alerts/scan", headers={"Authorization": f"Bearer {token}"})

    assert res.status_code == 200
    assert order[0] == "sweep" and order.index("sweep") < order.index("stock")
    assert res.get_json()["expiry_sweep"]["expired"] == 7
