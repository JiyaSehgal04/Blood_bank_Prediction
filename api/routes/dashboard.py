"""
api/routes/dashboard.py
GET /api/dashboard/stats
"""

import sys
from pathlib import Path
from datetime import date, timedelta
from flask import Blueprint, jsonify

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from db.supabase_client import get_client
from services.expiry_sweep import maybe_sweep
from shared.screening import SCREENING_COLUMNS, is_screening_positive

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api")
FETCH_PAGE_SIZE = 1000


def _fetch_query(query_factory) -> list:
    rows = []
    start = 0
    while True:
        result = query_factory().range(start, start + FETCH_PAGE_SIZE - 1).execute()
        batch = result.data or []
        rows.extend(batch)
        if len(batch) < FETCH_PAGE_SIZE:
            return rows
        start += FETCH_PAGE_SIZE


def _upload_totals(client) -> tuple[int, int]:
    upload_rows = _fetch_query(
        lambda: client.table("upload_history").select("inserted,total_rows")
    )
    total_batches = len(upload_rows)
    total_records = sum(r.get("total_rows") or r.get("inserted", 0) for r in upload_rows)
    return total_batches, total_records


EXPIRY_BUCKETS = [
    ("Past due",   None, -1),
    ("0–3 days",   0,    3),
    ("4–7 days",   4,    7),
    ("8–14 days",  8,    14),
    ("15–30 days", 15,   30),
    ("31+ days",   31,   None),
]


def _expiry_buckets(rows: list, today: date) -> list:
    """Count units by days left until expiry (rows without an expiry date are ignored)."""
    counts = [0] * len(EXPIRY_BUCKETS)
    for r in rows:
        raw = r.get("expiry_date")
        if not raw:
            continue
        days_left = (date.fromisoformat(str(raw)[:10]) - today).days
        for i, (_label, low, high) in enumerate(EXPIRY_BUCKETS):
            if (low is None or days_left >= low) and (high is None or days_left <= high):
                counts[i] += 1
                break
    return [{"label": b[0], "units": counts[i]} for i, b in enumerate(EXPIRY_BUCKETS)]


def _split_by_expiry(rows: list, today: date) -> tuple:
    """Split rows into (in_date, past_due). Rows without an expiry date count as in date."""
    in_date: list = []
    past_due: list = []
    cutoff = today.isoformat()
    for r in rows:
        expiry = r.get("expiry_date")
        (past_due if expiry and str(expiry)[:10] < cutoff else in_date).append(r)
    return in_date, past_due


def _split_stock(rows: list, today: date) -> tuple:
    """Split 'available' rows into (usable, past_due, quarantined).

    Quarantined = in date but a screening test is positive: not issuable, so not stock."""
    in_date, past_due = _split_by_expiry(rows, today)
    usable = [r for r in in_date if not is_screening_positive(r)]
    quarantined = [r for r in in_date if is_screening_positive(r)]
    return usable, past_due, quarantined


def _group_component_matrix(rows: list) -> dict:
    """{blood_group: {component: units}} for the stock heat-map."""
    matrix: dict = {}
    for r in rows:
        group, comp = r.get("blood_group"), r.get("component")
        if not group or not comp:
            continue
        matrix.setdefault(group, {})
        matrix[group][comp] = matrix[group].get(comp, 0) + 1
    return matrix


def _allocation_summary(rows: list) -> dict:
    requested = sum(r.get("units_requested") or 0 for r in rows)
    fulfilled = sum(r.get("units_fulfilled") or 0 for r in rows)
    by_status: dict = {}
    for r in rows:
        status = r.get("status")
        if status:
            by_status[status] = by_status.get(status, 0) + 1
    return {
        "total_requested":  requested,
        "total_fulfilled":  fulfilled,
        "fulfillment_rate": round(fulfilled / requested * 100, 1) if requested else 0,
        "by_status":        by_status,
    }


@dashboard_bp.route("/dashboard/stats", methods=["GET"])
def dashboard_stats():
    client = get_client()
    maybe_sweep(client)   # at most once per 6 h: keeps past-due units from lingering as stock

    # ── inventory counts ──────────────────────────────────────────────────────
    inv_rows = _fetch_query(
        lambda: client.table("blood_inventory").select(
            "blood_group,component,status,expiry_date,quantity_ml," + SCREENING_COLUMNS
        )
    )

    total_units    = len(inv_rows)
    all_available  = [r for r in inv_rows if r["status"] == "available"]
    # Only in-date units are stock; past-due units still marked available are reported
    # separately (and are cleaned up by the expiry sweep).
    available_rows, past_due_rows, quarantined_rows = _split_stock(all_available, date.today())
    total_available= len(available_rows)
    total_volume   = sum(float(r.get("quantity_ml") or 0) for r in available_rows)

    # by blood group
    stock_by_group: dict = {}
    for r in available_rows:
        bg = r["blood_group"]
        stock_by_group[bg] = stock_by_group.get(bg, 0) + 1

    # by component
    stock_by_comp: dict = {}
    for r in available_rows:
        c = r["component"]
        stock_by_comp[c] = stock_by_comp.get(c, 0) + 1

    # expiring within 7 days
    cutoff = (date.today() + timedelta(days=7)).isoformat()
    today_iso = date.today().isoformat()
    expiring_soon = [
        r for r in available_rows
        if r.get("expiry_date") and today_iso <= r["expiry_date"] <= cutoff
    ]

    # ── donors ────────────────────────────────────────────────────────────────
    donor_rows = _fetch_query(
        lambda: client.table("donors").select("is_eligible")
    )
    total_donors   = len(donor_rows)
    eligible_donors= sum(1 for d in donor_rows if d.get("is_eligible"))

    # ── allocations ───────────────────────────────────────────────────────────
    alloc_rows = _fetch_query(
        lambda: client.table("allocation_log").select(
            "units_requested,units_fulfilled,status,created_at"
        )
    )
    total_requested  = sum(r.get("units_requested", 0) for r in alloc_rows)
    total_fulfilled  = sum(r.get("units_fulfilled", 0) for r in alloc_rows)
    fulfillment_rate = (
        round(total_fulfilled / total_requested * 100, 1)
        if total_requested else 0
    )

    # ── wastage ───────────────────────────────────────────────────────────────
    wastage = client.table("wastage_log").select("id", count="exact").execute()
    total_wasted = wastage.count or 0

    # ── active alerts ─────────────────────────────────────────────────────────
    alert_rows = _fetch_query(
        lambda: client.table("alerts").select("severity").eq("is_resolved", False)
    )
    alert_counts = {}
    for a in alert_rows:
        s = a["severity"]
        alert_counts[s] = alert_counts.get(s, 0) + 1

    # ── upload history ────────────────────────────────────────────────────────
    total_batches, total_records = _upload_totals(client)

    return jsonify({
        "inventory": {
            "total":          total_available,
            "by_group":       stock_by_group,
            "by_component":   stock_by_comp,
            "expiring_soon":  len(expiring_soon),
            "total_volume_ml": round(total_volume),
            "by_group_component": _group_component_matrix(available_rows),
            "expiry_buckets": _expiry_buckets(all_available, date.today()),
            "past_due":       len(past_due_rows),
            "quarantined":    len(quarantined_rows),
        },
        "donors": {
            "total":    total_donors,
            "eligible": eligible_donors,
        },
        "allocations": {
            "total_today":    len([r for r in alloc_rows
                                   if r.get("created_at", "")[:10] == date.today().isoformat()]),
            "total_all_time": len(alloc_rows),
            **_allocation_summary(alloc_rows),
        },
        "wastage": {
            "total_expired": total_wasted,
            "today":         0,
        },
        "alerts": {
            "active":   len(alert_rows),
            "critical": alert_counts.get("CRITICAL", 0),
        },
        "uploads": {
            "total_batches": total_batches,
            "total_records": total_records,
        },
    }), 200
