"""
api/routes/alerts.py
GET /api/alerts
PUT /api/alerts/:id/resolve
POST /api/alerts/scan   (trigger manual stock scan)
"""

import sys
from pathlib import Path
from flask import Blueprint, request, jsonify

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from services.alert_service  import AlertService
from services.expiry_service import ExpiryService
from models.multi_list       import MultiListInventory
from services.expiry_sweep   import sweep_expired_units
from db.supabase_client      import get_client

alerts_bp = Blueprint("alerts", __name__, url_prefix="/api")


@alerts_bp.route("/alerts", methods=["GET"])
def list_alerts():
    """GET /api/alerts?severity=HIGH&resolved=false"""
    svc      = AlertService()
    severity = request.args.get("severity")
    resolved = request.args.get("resolved", "false").lower() == "true"

    from db.supabase_client import get_client
    client = get_client()
    q = (client.table("alerts").select("*")
         .eq("is_resolved", resolved)
         .order("created_at", desc=True))
    if severity:
        q = q.eq("severity", severity)

    limit = min(int(request.args.get("limit", 100)), 500)
    result = q.limit(limit).execute()
    return jsonify({"alerts": result.data, "count": len(result.data)}), 200


@alerts_bp.route("/alerts/<alert_id>/resolve", methods=["PUT"])
def resolve_alert(alert_id):
    svc     = AlertService()
    updated = svc.resolve_alert(alert_id)
    if not updated:
        return jsonify({"error": "Alert not found"}), 404
    return jsonify({"alert": updated}), 200


@alerts_bp.route("/alerts/scan", methods=["POST"])
def run_scan():
    """Trigger a full expiry sweep + stock + expiry scan and generate alerts."""
    # 1. Move every past-due unit out of stock first, so the alerts below see real stock.
    sweep_result = sweep_expired_units(get_client())

    # Stock alerts
    alert_svc  = AlertService()
    stock_result = alert_svc.run_stock_alerts()

    # Expiry alerts
    inv = MultiListInventory()
    inv.load_from_db()
    expiry_svc    = ExpiryService(inv)
    expiry_result = expiry_svc.run_daily_scan()

    return jsonify({
        "expiry_sweep": sweep_result,
        "stock_scan":   stock_result,
        "expiry_scan":  expiry_result,
    }), 200
