"""Database-driven expiry sweep.

Finds every unit that is still 'available' but past its expiry date, marks it 'expired'
and records it in wastage_log. Unlike the in-memory scan it reads every page of results
(Supabase returns at most 1000 rows per request), updates in small batches, writes the
status change BEFORE the wastage rows, and never logs a unit twice, so it is safe to run
repeatedly (manually, from a schedule, or throttled from the dashboard).
"""

import os
import time
from datetime import date
from typing import Any, Dict, List, Optional

INVENTORY_TABLE = "blood_inventory"
WASTAGE_TABLE = "wastage_log"
PAGE_SIZE = 1000
BATCH_SIZE = 200
AUTO_SWEEP_INTERVAL_SECONDS = 6 * 60 * 60

_last_auto_sweep = 0.0


def _past_due_units(client: Any, today: date) -> List[dict]:
    rows: List[dict] = []
    start = 0
    while True:
        batch = (
            client.table(INVENTORY_TABLE)
            .select("unit_id,blood_group,component,quantity_ml,expiry_date")
            .eq("status", "available")
            .lt("expiry_date", today.isoformat())
            .order("unit_id")
            .range(start, start + PAGE_SIZE - 1)
            .execute()
            .data
            or []
        )
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            return rows
        start += PAGE_SIZE


def _already_logged(client: Any, unit_ids: List[str]) -> set:
    logged: set = set()
    for i in range(0, len(unit_ids), BATCH_SIZE):
        chunk = unit_ids[i : i + BATCH_SIZE]
        rows = client.table(WASTAGE_TABLE).select("unit_id").in_("unit_id", chunk).execute().data or []
        logged.update(r["unit_id"] for r in rows)
    return logged


def sweep_expired_units(client: Any, today: Optional[date] = None, dry_run: bool = False) -> Dict[str, Any]:
    """Expire all past-due 'available' units. Returns {expired, wastage_logged, dry_run}."""
    today = today or date.today()
    units = _past_due_units(client, today)
    result: Dict[str, Any] = {"expired": len(units), "wastage_logged": 0, "dry_run": dry_run}
    if dry_run or not units:
        return result

    ids = [u["unit_id"] for u in units]
    for i in range(0, len(ids), BATCH_SIZE):
        client.table(INVENTORY_TABLE).update({"status": "expired"}).in_("unit_id", ids[i : i + BATCH_SIZE]).execute()

    logged = _already_logged(client, ids)
    new_rows = [
        {
            "unit_id": u["unit_id"],
            "blood_group": u["blood_group"],
            "component": u["component"],
            "quantity_ml": u.get("quantity_ml"),
            "expiry_date": u["expiry_date"],
            "reason": "expired",
        }
        for u in units
        if u["unit_id"] not in logged
    ]
    for i in range(0, len(new_rows), BATCH_SIZE):
        client.table(WASTAGE_TABLE).insert(new_rows[i : i + BATCH_SIZE]).execute()
    result["wastage_logged"] = len(new_rows)
    return result


def maybe_sweep(client: Any, now: Optional[float] = None) -> Optional[Dict[str, Any]]:
    """Opt-in housekeeping: set AUTO_EXPIRY_SWEEP=1 to sweep at most once per
    AUTO_SWEEP_INTERVAL_SECONDS per process. Off by default so a deploy never rewrites data
    on its own; the 'Run Scan' button and sweep_expired_units() always work. Never raises."""
    global _last_auto_sweep
    if os.environ.get("AUTO_EXPIRY_SWEEP", "").strip().lower() not in ("1", "true", "yes"):
        return None
    now = time.time() if now is None else now
    if now - _last_auto_sweep < AUTO_SWEEP_INTERVAL_SECONDS:
        return None
    _last_auto_sweep = now
    try:
        return sweep_expired_units(client)
    except Exception as exc:  # a failed housekeeping run must never break the caller
        print(f"Warning: automatic expiry sweep failed: {exc}")
        return None
