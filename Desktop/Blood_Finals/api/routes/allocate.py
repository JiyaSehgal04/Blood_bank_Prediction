"""
api/routes/allocate.py
POST /api/allocate
GET  /api/allocations
"""

import sys
from pathlib import Path
from flask import Blueprint, request, jsonify

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from models.multi_list       import MultiListInventory
from services.allocation_service import AllocationService
from db.supabase_client      import get_client

allocate_bp = Blueprint("allocate", __name__, url_prefix="/api")

VALID_PRIORITIES = {"emergency", "urgent", "routine"}


def _get_inventory() -> MultiListInventory:
    inv = MultiListInventory()
    inv.load_from_db()
    return inv


@allocate_bp.route("/allocate", methods=["POST"])
def allocate():
    """
    POST /api/allocate
    Body: { blood_group, component, units_needed, priority, request_id? }
    """
    data = request.get_json(force=True)

    blood_group  = (data.get("blood_group") or "").strip()
    component    = (data.get("component")   or "").strip()
    units_needed = data.get("units_needed", 1)
    priority     = (data.get("priority") or "routine").lower()
    request_id   = data.get("request_id", "")

    errors = []
    if not blood_group:
        errors.append("blood_group is required")
    if not component:
        errors.append("component is required")
    try:
        units_needed = int(units_needed)
        if units_needed < 1:
            errors.append("units_needed must be >= 1")
    except (TypeError, ValueError):
        errors.append("units_needed must be an integer")
    if priority not in VALID_PRIORITIES:
        errors.append(f"priority must be one of {sorted(VALID_PRIORITIES)}")

    if errors:
        return jsonify({"errors": errors}), 400

    inv    = _get_inventory()
    svc    = AllocationService(inv)
    result = svc.allocate_now(blood_group, component, units_needed,
                              priority, request_id)

    status_code = 200 if result.status == "fulfilled" else (
                  207 if result.status == "partial"   else 422)

    return jsonify({
        "request_id":      result.request.request_id,
        "status":          result.status,
        "units_requested": result.request.units_needed,
        "units_fulfilled": result.units_fulfilled,
        "allocated_units": [u.to_dict() for u in result.allocated],
        "used_compatible": result.used_compatible,
        "notes":           result.notes,
    }), status_code


@allocate_bp.route("/allocations", methods=["GET"])
def list_allocations():
    """
    GET /api/allocations?blood_group=O Pos&status=fulfilled&limit=50
    """
    client = get_client()
    q = client.table("allocation_log").select("*").order("created_at", desc=True)

    blood_group = request.args.get("blood_group")
    status      = request.args.get("status")
    limit       = min(int(request.args.get("limit", 100)), 500)

    if blood_group:
        q = q.eq("blood_group", blood_group)
    if status:
        q = q.eq("status", status)
    q = q.limit(limit)

    result = q.execute()
    return jsonify({"allocations": result.data, "count": len(result.data)}), 200
