"""
api/routes/inventory.py
Flask Blueprint: blood inventory endpoints

POST /api/inventory  — add a single unit via JSON
POST /api/upload     — upload a Numbers/Excel/CSV file, clean, upsert all records
GET  /api/inventory  — list units (filters: blood_group, component, status)
"""

from pathlib import Path

from flask import Blueprint, request, jsonify

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from shared.cleaning_utils import (
    VALID_BLOOD_GROUPS, SHELF_LIFE_DAYS,
    normalize_time, parse_date, make_unit_id, compute_expiry
)
from db.supabase_client import get_client

inventory_bp = Blueprint("inventory", __name__, url_prefix="/api")
TABLE = "blood_inventory"

ALLOWED_EXTENSIONS = {".numbers", ".xlsx", ".xls", ".csv"}


# ── helpers ───────────────────────────────────────────────────────────────────

def _upsert(records: list[dict]) -> tuple[int, int]:
    client = get_client()
    inserted = errors = 0
    batch_size = 50
    for i in range(0, len(records), batch_size):
        try:
            result = client.table(TABLE).upsert(records[i:i+batch_size], on_conflict="unit_id").execute()
            inserted += len(result.data)
        except Exception:
            errors += len(records[i:i+batch_size])
    return inserted, errors


def _read_numbers_or_xlsx(path: str):
    from numbers_parser import Document
    doc   = Document(path)
    table = doc.sheets[0].tables[0]
    rows  = list(table.iter_rows())
    headers  = [c.value for c in rows[0]]
    raw_rows = [
        [c.value if c.value is not None else "" for c in row]
        for row in rows[1:]
    ]
    return headers, raw_rows


def _read_csv(path: str):
    import csv
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        headers  = list(reader.fieldnames or [])
        raw_rows = [list(row.values()) for row in reader]
    return headers, raw_rows


# ── routes ────────────────────────────────────────────────────────────────────

@inventory_bp.route("/inventory", methods=["GET"])
def list_inventory():
    """GET /api/inventory?blood_group=O Pos&component=WB/PRC&status=available"""
    client = get_client()
    q = client.table(TABLE).select("*")

    for param in ("blood_group", "component", "status"):
        val = request.args.get(param)
        if val:
            q = q.eq(param, val)

    result = q.order("expiry_date").execute()
    return jsonify({"units": result.data, "count": len(result.data)}), 200


@inventory_bp.route("/inventory", methods=["POST"])
def add_single_unit():
    """
    POST /api/inventory
    Body (JSON):
      { sno, unit_no, segment_no, blood_group, component, quantity_ml,
        collection_date (DD/MM/YYYY), collection_time, expiry_date (DD/MM/YYYY, optional),
        hiv, hbsag, hcv, malaria, vdrl, notes }
    """
    data = request.get_json(force=True)
    errors = []

    blood_group = (data.get("blood_group") or "").strip()
    if blood_group not in VALID_BLOOD_GROUPS:
        errors.append(f"Invalid blood_group: {blood_group!r}. Must be one of {sorted(VALID_BLOOD_GROUPS)}")

    component = (data.get("component") or "").strip()
    if component not in SHELF_LIFE_DAYS:
        errors.append(f"Invalid component: {component!r}. Must be one of {list(SHELF_LIFE_DAYS)}")

    sno = str(data.get("sno", "")).strip()
    if not sno:
        errors.append("sno is required")

    try:
        qty = float(data.get("quantity_ml", 0))
    except (TypeError, ValueError):
        errors.append("quantity_ml must be a number")
        qty = None

    try:
        coll_date = parse_date(data.get("collection_date", ""))
    except Exception:
        errors.append("collection_date must be DD/MM/YYYY")
        coll_date = None

    if errors:
        return jsonify({"errors": errors}), 400

    segment_no      = str(data.get("segment_no", "N/A")).strip() or "N/A"
    collection_time = normalize_time(data.get("collection_time", ""))

    exp_raw = data.get("expiry_date", "")
    try:
        expiry_date = parse_date(exp_raw)
    except Exception:
        expiry_date = compute_expiry(coll_date, component)

    unit_id = make_unit_id(sno, component, segment_no)

    record = {
        "unit_id":         unit_id,
        "sno":             sno,
        "unit_no":         str(data.get("unit_no", "")).strip(),
        "segment_no":      segment_no,
        "blood_group":     blood_group,
        "component":       component,
        "quantity_ml":     qty,
        "collection_date": coll_date.isoformat(),
        "collection_time": collection_time,
        "expiry_date":     expiry_date.isoformat(),
        "status":          "available",
        "hiv":    str(data.get("hiv",    "Neg")).strip(),
        "hbsag":  str(data.get("hbsag",  "Neg")).strip(),
        "hcv":    str(data.get("hcv",    "Neg")).strip(),
        "malaria":str(data.get("malaria","Neg")).strip(),
        "vdrl":   str(data.get("vdrl",   "Neg")).strip(),
        "notes":  str(data.get("notes",  "")).strip(),
        "flag":   "",
    }

    client = get_client()
    try:
        result = client.table(TABLE).upsert(record, on_conflict="unit_id").execute()
        return jsonify({"inserted": record, "unit_id": unit_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@inventory_bp.route("/multilist/summary", methods=["GET"])
def multilist_summary():
    """GET /api/multilist/summary — live multi-list inventory state."""
    try:
        from models.multi_list import MultiListInventory
        inv = MultiListInventory()
        inv.load_from_db()
        by_group = inv.stock_summary()   # {blood_group: count}

        # by component from the group lists
        by_component: dict = {}
        for bg, gl in inv.group_index.items():
            node = gl.head
            while node:
                c = node.component
                by_component[c] = by_component.get(c, 0) + 1
                node = node.next_in_group

        # expiry list head
        expiry_head = None
        if inv.expiry_list.head:
            u = inv.expiry_list.head
            expiry_head = {
                "unit_id":    u.unit_id,
                "blood_group": u.blood_group,
                "component":  u.component,
                "expiry_date": u.expiry_date.isoformat() if u.expiry_date else None,
            }

        # critical units (expiring within 3 days)
        from datetime import date, timedelta
        cutoff3 = (date.today() + timedelta(days=3)).isoformat()
        critical = []
        node = inv.expiry_list.head
        while node and str(node.expiry_date) <= cutoff3:
            critical.append({
                "unit_id":    node.unit_id,
                "blood_group": node.blood_group,
                "component":  node.component,
                "expiry_date": str(node.expiry_date),
            })
            node = node.next_in_expiry

        return jsonify({
            "total_units":   inv.expiry_list.count,
            "by_group":      by_group,
            "by_component":  by_component,
            "expiry_head":   expiry_head,
            "critical_count": len(critical),
            "critical_units": critical[:10],
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
