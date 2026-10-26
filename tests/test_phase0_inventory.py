import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from models.multi_list import MultiListInventory
from services.alert_service import AlertService
from services.allocation_service import AllocationService
from services.compatibility import donor_groups
from services.expiry_sweep import sweep_expired_units
from tests.fakes import FakeClient, unit_row

TODAY = date.today()
PAST = (TODAY - timedelta(days=3)).isoformat()
FUTURE = (TODAY + timedelta(days=30)).isoformat()


def _inventory(client) -> MultiListInventory:
    inv = MultiListInventory()
    inv._db_client = client
    return inv


# ── 1. The loader must read every page and ignore units that are already expired ──

def test_load_from_db_reads_all_pages_and_skips_expired():
    rows = [unit_row(i, expiry=FUTURE) for i in range(2300)]
    rows += [unit_row(5000 + i, expiry=PAST) for i in range(400)]
    client = FakeClient({"blood_inventory": rows}, max_rows=1000)

    loaded = _inventory(client).load_from_db()

    assert loaded == 2300


# ── 2. Expiry sweep: DB-driven, paged, batched, idempotent ──

def test_sweep_marks_every_past_due_unit_expired_and_logs_wastage_once():
    past = [unit_row(i, expiry=PAST) for i in range(2500)]
    fresh = [unit_row(9000 + i, expiry=FUTURE) for i in range(10)]
    client = FakeClient({"blood_inventory": past + fresh, "wastage_log": []}, max_rows=1000)

    result = sweep_expired_units(client, today=TODAY)

    assert result["expired"] == 2500
    statuses = [r["status"] for r in client.tables["blood_inventory"]]
    assert statuses.count("expired") == 2500 and statuses.count("available") == 10
    assert len(client.tables["wastage_log"]) == 2500

    again = sweep_expired_units(client, today=TODAY)           # running twice must not double count
    assert again["expired"] == 0
    assert len(client.tables["wastage_log"]) == 2500


def test_sweep_does_not_relog_units_already_in_wastage_log():
    client = FakeClient({
        "blood_inventory": [unit_row(1, expiry=PAST), unit_row(2, expiry=PAST)],
        "wastage_log": [{"unit_id": "U00001", "reason": "expired"}],
    })

    sweep_expired_units(client, today=TODAY)

    assert sorted(r["unit_id"] for r in client.tables["wastage_log"]) == ["U00001", "U00002"]
    assert all(r["status"] == "expired" for r in client.tables["blood_inventory"])


def test_sweep_dry_run_changes_nothing():
    client = FakeClient({"blood_inventory": [unit_row(1, expiry=PAST)], "wastage_log": []})

    result = sweep_expired_units(client, today=TODAY, dry_run=True)

    assert result["expired"] == 1 and result["dry_run"] is True
    assert client.tables["blood_inventory"][0]["status"] == "available"
    assert client.tables["wastage_log"] == []


def test_sweep_updates_status_before_logging_wastage():
    client = FakeClient({"blood_inventory": [unit_row(1, expiry=PAST)], "wastage_log": []})

    sweep_expired_units(client, today=TODAY)

    ops = [(t, op) for t, op, _ in client.calls if op in ("update", "insert")]
    assert ops.index(("blood_inventory", "update")) < ops.index(("wastage_log", "insert"))


# ── 3. Compatibility depends on the component ──

def test_red_cells_follow_red_cell_rules():
    assert donor_groups("A Pos", "WB/PRC") == ["A Pos", "A Neg", "O Pos", "O Neg"]
    assert "AB Pos" not in donor_groups("O Pos", "WB/PRC")


def test_plasma_uses_reverse_abo_and_ignores_rh():
    ab = donor_groups("AB Pos", "FFP")
    assert set(ab) == {"AB Pos", "AB Neg"}                      # only AB plasma is safe for AB
    assert "O Pos" not in ab and "O Neg" not in ab
    o = donor_groups("O Pos", "FFP")
    assert {"O Pos", "O Neg", "A Pos", "A Neg", "B Pos", "B Neg", "AB Pos", "AB Neg"} == set(o)
    a_neg = donor_groups("A Neg", "FFP")
    assert "A Pos" in a_neg and "AB Pos" in a_neg               # Rh does not matter for plasma
    assert a_neg[0] == "A Neg"                                   # identical group preferred first


def test_platelets_prefer_identical_abo_then_compatible_plasma():
    plt = donor_groups("B Neg", "PLT")
    assert plt[:2] == ["B Neg", "B Pos"]                         # same ABO first, any Rh
    assert "A Pos" not in plt and "O Pos" not in plt            # incompatible plasma excluded


def test_unknown_component_falls_back_to_red_cell_rules():
    assert donor_groups("O Neg", "SOMETHING") == ["O Neg"]


# ── 4. Allocation never issues expired or screening-positive units ──

def _allocator(rows):
    client = FakeClient({"blood_inventory": rows, "allocation_log": [], "alerts": []})
    inv = _inventory(client)
    for r in rows:
        inv._insert_node(__import__("models.blood_unit", fromlist=["BloodUnit"]).BloodUnit.from_db_row(r))
    return AllocationService(inv), client


def test_allocation_skips_expired_units():
    svc, _ = _allocator([unit_row(1, expiry=PAST), unit_row(2, expiry=FUTURE)])

    result = svc.allocate_now("O Pos", "WB/PRC", 2)

    assert [u.unit_id for u in result.allocated] == ["U00002"]
    assert result.status == "partial"


def test_allocation_skips_screening_positive_units():
    svc, _ = _allocator([unit_row(1, expiry=FUTURE, hiv="Pos"), unit_row(2, expiry=FUTURE)])

    result = svc.allocate_now("O Pos", "WB/PRC", 1)

    assert [u.unit_id for u in result.allocated] == ["U00002"]


def test_plasma_for_ab_patient_is_not_drawn_from_o_donors():
    svc, _ = _allocator([unit_row(1, group="O Pos", component="FFP", expiry=FUTURE)])

    result = svc.allocate_now("AB Pos", "FFP", 1)

    assert result.status == "unmet"


def test_rh_negative_platelet_patient_can_receive_rh_positive_same_abo():
    svc, _ = _allocator([unit_row(1, group="B Pos", component="PLT", expiry=FUTURE)])

    result = svc.allocate_now("B Neg", "PLT", 1)

    assert result.status == "fulfilled"


# ── 5. Stock alerts count every in-date unit, not the first 1000 rows ──

def test_stock_alerts_page_through_all_available_units_and_ignore_expired():
    rows = [unit_row(i, group="O Pos", component="FFP", expiry=PAST) for i in range(1500)]
    rows += [unit_row(5000 + i, group="O Pos", component="FFP", expiry=FUTURE) for i in range(40)]
    client = FakeClient({"blood_inventory": rows, "alerts": []}, max_rows=1000)
    svc = AlertService(client)

    result = svc.run_stock_alerts()

    created = [a for a in client.tables["alerts"] if a["blood_group"] == "O Pos" and a["component"] == "FFP"]
    assert created == []                                         # 40 in-date units: no zero/low alert
    assert ("O Neg", "FFP") in [tuple(x) for x in result["critical_stock"]]


# ── the automatic sweep is opt-in, so deploying never silently rewrites data ──

def test_automatic_sweep_is_off_unless_enabled(monkeypatch):
    from services import expiry_sweep

    client = FakeClient({"blood_inventory": [unit_row(1, expiry=PAST)], "wastage_log": []})
    monkeypatch.delenv("AUTO_EXPIRY_SWEEP", raising=False)
    monkeypatch.setattr(expiry_sweep, "_last_auto_sweep", 0.0)

    assert expiry_sweep.maybe_sweep(client, now=10**9) is None
    assert client.tables["blood_inventory"][0]["status"] == "available"


def test_automatic_sweep_runs_once_per_interval_when_enabled(monkeypatch):
    from services import expiry_sweep

    client = FakeClient({"blood_inventory": [unit_row(1, expiry=PAST)], "wastage_log": []})
    monkeypatch.setenv("AUTO_EXPIRY_SWEEP", "1")
    monkeypatch.setattr(expiry_sweep, "_last_auto_sweep", 0.0)

    first = expiry_sweep.maybe_sweep(client, now=10**9)
    second = expiry_sweep.maybe_sweep(client, now=10**9 + 60)

    assert first and first["expired"] == 1
    assert second is None
