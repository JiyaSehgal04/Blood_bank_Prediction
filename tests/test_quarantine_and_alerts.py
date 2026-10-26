import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from api.routes import dashboard
from ml.scripts.preprocess import FeaturePipeline
from services.alert_hygiene import resolve_stale_alerts
from services.alert_service import AlertService
from services.expiry_sweep import sweep_expired_units
from shared.screening import is_screening_positive
from tests.fakes import FakeClient, unit_row

TODAY = date.today()
PAST = (TODAY - timedelta(days=3)).isoformat()
FUTURE = (TODAY + timedelta(days=30)).isoformat()


# ── screening-positive units are quarantined: never counted as usable stock ──

def test_is_screening_positive_reads_any_positive_test():
    assert is_screening_positive({"hiv": "Neg", "hbsag": "Pos"})
    assert is_screening_positive({"malaria": " pos "})
    assert not is_screening_positive({"hiv": "Neg", "vdrl": "Neg"})
    assert not is_screening_positive({"hiv": None})


def test_dashboard_splits_usable_stock_from_quarantined_and_past_due():
    rows = [
        unit_row(1, expiry=FUTURE),
        unit_row(2, expiry=FUTURE, hiv="Pos"),
        unit_row(3, expiry=PAST),
        unit_row(4, expiry=PAST, hbsag="Pos"),
    ]

    usable, past_due, quarantined = dashboard._split_stock(rows, TODAY)

    assert [r["unit_id"] for r in usable] == ["U00001"]
    assert [r["unit_id"] for r in quarantined] == ["U00002"]
    assert sorted(r["unit_id"] for r in past_due) == ["U00003", "U00004"]


def test_pipeline_stock_levels_exclude_quarantined_units():
    pipe = FeaturePipeline()
    pipe._client = FakeClient({"blood_inventory": [
        unit_row(1, expiry=FUTURE), unit_row(2, expiry=FUTURE, malaria="Pos"), unit_row(3, expiry=FUTURE),
    ]})

    assert pipe.fetch_stock_levels() == {("O Pos", "WB/PRC"): 2}
    assert pipe.fetch_expiry_counts() == {}


def test_stock_alerts_do_not_count_quarantined_units_as_stock():
    rows = [unit_row(i, group="O Pos", component="FFP", expiry=FUTURE, hiv="Pos") for i in range(6)]
    client = FakeClient({"blood_inventory": rows, "alerts": []})

    result = AlertService(client).run_stock_alerts()

    assert ("O Pos", "FFP") in [tuple(x) for x in result["critical_stock"]]   # 6 units, none usable


# ── the sweep raises ONE alert per group and component, not one per unit ──

def test_sweep_raises_a_single_summary_alert_per_group_and_component():
    rows = [unit_row(i, group="O Pos", expiry=PAST) for i in range(5)]
    rows += [unit_row(10 + i, group="A Pos", component="PLT", expiry=PAST) for i in range(2)]
    client = FakeClient({"blood_inventory": rows, "wastage_log": [], "alerts": []})

    sweep_expired_units(client, today=TODAY)

    alerts = client.tables["alerts"]
    assert len(alerts) == 2
    by_key = {(a["blood_group"], a["component"]): a for a in alerts}
    assert "5 unit" in by_key[("O Pos", "WB/PRC")]["message"]
    assert "2 unit" in by_key[("A Pos", "PLT")]["message"]
    assert all(a["alert_type"] == "unit_expired" and a["is_resolved"] is False for a in alerts)


# ── stale alerts are resolved, current ones are kept ──

def _alert(i, kind, created, resolved=False, severity="HIGH"):
    return {"id": f"a{i}", "alert_type": kind, "severity": severity, "created_at": created,
            "is_resolved": resolved, "blood_group": "O Pos", "component": "WB/PRC", "message": "m"}


def test_resolve_stale_alerts_closes_retired_and_superseded_alerts_only():
    now = TODAY.isoformat() + "T08:00:00+00:00"
    old = (TODAY - timedelta(days=4)).isoformat() + "T08:00:00+00:00"
    client = FakeClient({"alerts": [
        _alert(1, "ml_surplus", now),                 # retired model: always stale
        _alert(2, "ml_anomaly", now),                 # retired model: always stale
        _alert(3, "unit_expired", old),               # one-per-unit legacy alert, old
        _alert(4, "critical_stock", old),             # superseded by today's scan
        _alert(5, "critical_stock", now),             # raised today: keep
        _alert(6, "screening_pos", old),              # safety alert: never auto-resolved
        _alert(7, "shortage", old),                   # allocation shortage: keep for staff
    ]})

    result = resolve_stale_alerts(client, today=TODAY)

    state = {a["id"]: a["is_resolved"] for a in client.tables["alerts"]}
    assert state == {"a1": True, "a2": True, "a3": True, "a4": True, "a5": False, "a6": False, "a7": False}
    assert result["resolved"] == 4


def test_resolve_stale_alerts_handles_more_than_one_page():
    old = (TODAY - timedelta(days=9)).isoformat() + "T08:00:00+00:00"
    client = FakeClient({"alerts": [_alert(i, "ml_surplus", old) for i in range(2500)]}, max_rows=1000)

    result = resolve_stale_alerts(client, today=TODAY)

    assert result["resolved"] == 2500
    assert all(a["is_resolved"] for a in client.tables["alerts"])
