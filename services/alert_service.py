"""
services/alert_service.py
Step 10 — Alert Generation

Threshold-based stock + screening alerts.
Dedup: same (alert_type, blood_group, component) on the same calendar day
       is suppressed by the DB UNIQUE constraint.

Alert types & severity:
  critical_stock    (stock = 0)        CRITICAL
  low_stock         (stock < 3)        HIGH
  expiry_critical   (>30% in 3d)       HIGH      ← handled in expiry_service
  expiry_warning    (>20% in 7d)       MEDIUM    ← handled in expiry_service
  plt_urgency       (PLT < 2d)         HIGH      ← handled in expiry_service
  screening_pos     (any Pos result)   HIGH
  ml_shortage       (forecast > stock) HIGH      ← raised by prediction_service
  ml_anomaly        (IF flag)          MEDIUM    ← raised by prediction_service
"""

import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.supabase_client import get_client
from shared.cleaning_utils import VALID_BLOOD_GROUPS

ALERTS_TABLE = "alerts"
INV_TABLE    = "blood_inventory"
COMPONENTS   = ["WB/PRC", "FFP", "PLT"]

LOW_STOCK_THRESHOLD      = 3
CRITICAL_STOCK_THRESHOLD = 0


class AlertService:
    def __init__(self):
        self._client = get_client()

    # ── main scan ─────────────────────────────────────────────────────────────

    def run_stock_alerts(self) -> dict:
        """
        Scan current inventory for stock-level and screening issues.
        Returns { critical_stock, low_stock, screening_pos, total_raised }.
        """
        available = (
            self._client.table(INV_TABLE)
            .select("blood_group,component,status,hiv,hbsag,hcv,malaria,vdrl,unit_id")
            .eq("status", "available")
            .execute()
            .data or []
        )

        # stock counts per (blood_group, component)
        stock: dict[tuple, int] = {}
        for row in available:
            k = (row["blood_group"], row["component"])
            stock[k] = stock.get(k, 0) + 1

        alerts         = []
        critical_stock = []
        low_stock      = []
        screening_pos  = []

        # ── stock-level alerts ────────────────────────────────────────────────
        for bg in VALID_BLOOD_GROUPS:
            for comp in COMPONENTS:
                cnt = stock.get((bg, comp), 0)
                if cnt == CRITICAL_STOCK_THRESHOLD:
                    critical_stock.append((bg, comp))
                    alerts.append(self._build(
                        "critical_stock", bg, comp, "CRITICAL",
                        f"ZERO stock: {bg} {comp} — immediate replenishment required"
                    ))
                elif cnt < LOW_STOCK_THRESHOLD:
                    low_stock.append((bg, comp))
                    alerts.append(self._build(
                        "low_stock", bg, comp, "HIGH",
                        f"Low stock: only {cnt} unit(s) of {bg} {comp} available"
                    ))

        # ── screening positive alerts ─────────────────────────────────────────
        for row in available:
            pos_tests = [t for t in ("hiv", "hbsag", "hcv", "malaria", "vdrl")
                         if (row.get(t) or "").strip().lower() == "pos"]
            if pos_tests:
                screening_pos.append(row["unit_id"])
                alerts.append(self._build(
                    "screening_pos",
                    row["blood_group"], row["component"], "HIGH",
                    f"Screening POSITIVE on unit {row['unit_id']}: "
                    f"{', '.join(pos_tests).upper()} — quarantine immediately"
                ))

        raised = self._insert_alerts(alerts)

        return {
            "critical_stock": critical_stock,
            "low_stock":      low_stock,
            "screening_pos":  screening_pos,
            "total_raised":   raised,
        }

    # ── resolve an alert ──────────────────────────────────────────────────────

    def resolve_alert(self, alert_id: str) -> Optional[dict]:
        from datetime import datetime
        result = (
            self._client.table(ALERTS_TABLE)
            .update({"is_resolved": True,
                     "resolved_at": datetime.utcnow().isoformat()})
            .eq("id", alert_id)
            .execute()
        )
        return result.data[0] if result.data else None

    # ── list active alerts ────────────────────────────────────────────────────

    def get_active_alerts(self, severity: str = None) -> list:
        q = (self._client.table(ALERTS_TABLE)
             .select("*").eq("is_resolved", False)
             .order("created_at", desc=True))
        if severity:
            q = q.eq("severity", severity)
        return q.execute().data or []

    # ── helpers ───────────────────────────────────────────────────────────────

    def _build(self, alert_type, blood_group, component, severity, message):
        return {
            "alert_type":  alert_type,
            "blood_group": blood_group,
            "component":   component,
            "severity":    severity,
            "message":     message,
            "is_resolved": False,
        }

    def _insert_alerts(self, alerts: list) -> int:
        if not alerts:
            return 0
        inserted = 0
        for alert in alerts:
            try:
                self._client.table(ALERTS_TABLE).insert(alert).execute()
                inserted += 1
            except Exception:
                pass   # duplicate on same day — suppressed by UNIQUE constraint
        return inserted
