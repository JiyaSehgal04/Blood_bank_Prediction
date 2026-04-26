"""
api/routes/dashboard.py
GET /api/dashboard/stats
"""

import sys
from pathlib import Path
from datetime import date
from flask import Blueprint, jsonify

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from db.supabase_client import get_client

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


@dashboard_bp.route("/dashboard/stats", methods=["GET"])
def dashboard_stats():
    client = get_client()

    # ── inventory counts ──────────────────────────────────────────────────────
    inv_rows = _fetch_query(
        lambda: client.table("blood_inventory").select(
            "blood_group,component,status,expiry_date,quantity_ml"
        )
    )

    total_units    = len(inv_rows)
    available_rows = [r for r in inv_rows if r["status"] == "available"]
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
    from datetime import timedelta
    cutoff = (date.today() + timedelta(days=7)).isoformat()
    expiring_soon = [
        r for r in available_rows
        if r.get("expiry_date") and r["expiry_date"] <= cutoff
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
        },
        "donors": {
            "total":    total_donors,
            "eligible": eligible_donors,
        },
        "allocations": {
            "total_today":    len([r for r in alloc_rows
                                   if r.get("created_at", "")[:10] == date.today().isoformat()]),
            "total_all_time": len(alloc_rows),
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
