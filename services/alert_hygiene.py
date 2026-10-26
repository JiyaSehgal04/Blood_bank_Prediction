"""Close alerts that are no longer true, so staff only see current problems.

Resolved here (never deleted, so history is kept):
* alerts from the retired forecast model (ml_surplus, ml_anomaly, ml_trend_shift, ml_shortage),
  which were generated from near-empty data;
* one-per-unit 'unit_expired' alerts and daily stock/expiry alerts raised before today -
  each scan recomputes these from current stock;
Never auto-resolved: screening_pos (patient safety) and allocation 'shortage' alerts.
"""

from datetime import date
from typing import Any, Dict, List, Optional

TABLE = "alerts"
PAGE = 1000
BATCH = 200

RETIRED_MODEL_TYPES = ("ml_surplus", "ml_anomaly", "ml_trend_shift", "ml_shortage")
SUPERSEDED_DAILY_TYPES = ("unit_expired", "critical_stock", "low_stock", "expiry_critical", "expiry_warning", "plt_urgency")


def _unresolved_ids(client: Any, types: tuple, before: Optional[str]) -> List[str]:
    ids: List[str] = []
    start = 0
    while True:
        query = (
            client.table(TABLE).select("id").eq("is_resolved", False).in_("alert_type", list(types))
        )
        if before:
            query = query.lt("created_at", before)
        batch = query.order("id").range(start, start + PAGE - 1).execute().data or []
        ids.extend(r["id"] for r in batch)
        if len(batch) < PAGE:
            return ids
        start += PAGE


def resolve_stale_alerts(client: Any, today: Optional[date] = None) -> Dict[str, int]:
    today = today or date.today()
    from datetime import datetime, timezone

    stamp = datetime.now(timezone.utc).isoformat()
    ids = _unresolved_ids(client, RETIRED_MODEL_TYPES, None)
    ids += _unresolved_ids(client, SUPERSEDED_DAILY_TYPES, today.isoformat())
    for i in range(0, len(ids), BATCH):
        client.table(TABLE).update({"is_resolved": True, "resolved_at": stamp}).in_("id", ids[i : i + BATCH]).execute()
    return {"resolved": len(ids)}
