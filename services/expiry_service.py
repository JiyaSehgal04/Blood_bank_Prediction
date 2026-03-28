"""
services/expiry_service.py
Step 6 — Expiry Check & Removal

Walks GlobalExpiryList from head (soonest first).
  expired      → status='expired', remove from both lists, log wastage_log, generate CRITICAL alert
  ≤ 3 days     → generate HIGH alert (critical_expiry)
  ≤ 7 days     → generate MEDIUM alert (warning_expiry)
  PLT < 2 days → HIGH alert regardless of group %

Alert dedup: same (alert_type, blood_group, component) on the same calendar day
is inserted only once (handled by the UNIQUE constraint on the alerts table).
"""

import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from models.multi_list import MultiListInventory

ALERTS_TABLE  = "alerts"
WASTAGE_TABLE = "wastage_log"


class ExpiryService:
    def __init__(self, inventory: MultiListInventory):
        self.inv = inventory

    # ── main entry point ──────────────────────────────────────────────────────

    def run_daily_scan(self) -> dict:
        """
        Full daily expiry scan.
        Returns summary: { expired, critical, warning, alerts_raised }
        """
        today   = date.today()
        result  = {"expired": [], "critical": [], "warning": [], "alerts_raised": []}

        expired_units  = []
        critical_units = []   # ≤ 3 days
        warning_units  = []   # ≤ 7 days

        curr = self.inv.expiry_list.head
        while curr:
            nxt = curr.next_in_expiry
            days_left = (curr.expiry_date - today).days

            if curr.expiry_date < today:
                expired_units.append(curr)
                self.inv._remove_node(curr.unit_id, curr.blood_group)
                self._log_wastage(curr)
            elif days_left <= 3:
                critical_units.append(curr)
            elif days_left <= 7:
                warning_units.append(curr)
            else:
                break   # sorted list — safe to stop
            curr = nxt

        # update DB status for expired units in one batch
        if expired_units:
            self._mark_expired_in_db([u.unit_id for u in expired_units])

        # ── generate alerts ───────────────────────────────────────────────────
        alerts = []

        # per-group expiry % alerts
        for bg, grp_list in self.inv.group_index.items():
            total = grp_list.count
            if total == 0:
                continue

            crit_in_group = [u for u in critical_units if u.blood_group == bg]
            warn_in_group = [u for u in warning_units  if u.blood_group == bg]

            if len(crit_in_group) / total > 0.30:
                alerts.append(self._build_alert(
                    "expiry_critical", bg, None,
                    "HIGH",
                    f"{len(crit_in_group)}/{total} {bg} units expire within 3 days "
                    f"({len(crit_in_group)/total:.0%} of stock)"
                ))
            elif len(warn_in_group) / total > 0.20:
                alerts.append(self._build_alert(
                    "expiry_warning", bg, None,
                    "MEDIUM",
                    f"{len(warn_in_group)}/{total} {bg} units expire within 7 days"
                ))

        # PLT urgency: any PLT with < 2 days
        plt_urgent = [u for u in critical_units if u.component == "PLT"
                      and (u.expiry_date - today).days < 2]
        for u in plt_urgent:
            alerts.append(self._build_alert(
                "plt_urgency", u.blood_group, "PLT",
                "HIGH",
                f"PLT unit {u.unit_id} ({u.blood_group}) expires in "
                f"{(u.expiry_date - today).days}d"
            ))

        # expired units → CRITICAL alert per group
        for u in expired_units:
            alerts.append(self._build_alert(
                "unit_expired", u.blood_group, u.component,
                "CRITICAL",
                f"Unit {u.unit_id} ({u.blood_group} {u.component}) expired on {u.expiry_date}"
            ))

        self._insert_alerts(alerts)

        result["expired"]       = [u.unit_id for u in expired_units]
        result["critical"]      = [u.unit_id for u in critical_units]
        result["warning"]       = [u.unit_id for u in warning_units]
        result["alerts_raised"] = len(alerts)
        return result

    # ── helpers ───────────────────────────────────────────────────────────────

    def _log_wastage(self, unit):
        try:
            self.inv._client().table(WASTAGE_TABLE).insert({
                "unit_id":    unit.unit_id,
                "blood_group":unit.blood_group,
                "component":  unit.component,
                "quantity_ml":unit.quantity_ml,
                "expiry_date":unit.expiry_date.isoformat(),
                "reason":     "expired",
            }).execute()
        except Exception as e:
            print(f"Warning: wastage_log failed for {unit.unit_id}: {e}")

    def _mark_expired_in_db(self, unit_ids: list):
        try:
            self.inv._client().table("blood_inventory").update(
                {"status": "expired"}
            ).in_("unit_id", unit_ids).execute()
        except Exception as e:
            print(f"Warning: DB status update failed: {e}")

    def _build_alert(self, alert_type, blood_group, component, severity, message):
        return {
            "alert_type":  alert_type,
            "blood_group": blood_group,
            "component":   component,
            "severity":    severity,
            "message":     message,
            "is_resolved": False,
        }

    def _insert_alerts(self, alerts: list):
        if not alerts:
            return
        try:
            # upsert — DB UNIQUE constraint on (alert_type, blood_group, component, date)
            # prevents duplicate alerts on the same day
            self.inv._client().table(ALERTS_TABLE).upsert(
                alerts, on_conflict="alert_type,blood_group,component,created_at::date"
            ).execute()
        except Exception:
            # fallback: insert one by one, ignore duplicates
            for alert in alerts:
                try:
                    self.inv._client().table(ALERTS_TABLE).insert(alert).execute()
                except Exception:
                    pass   # duplicate suppressed


# ── standalone runner ─────────────────────────────────────────────────────────

def run_scan():
    inv = MultiListInventory()
    print("Loading inventory from DB...")
    n = inv.load_from_db()
    print(f"Loaded {n} units.\n")

    svc    = ExpiryService(inv)
    result = svc.run_daily_scan()

    print(f"Expired   : {len(result['expired'])}")
    if result["expired"]:
        for uid in result["expired"]:
            print(f"  - {uid}")
    print(f"Critical  : {len(result['critical'])} units expiring within 3 days")
    print(f"Warning   : {len(result['warning'])} units expiring within 7 days")
    print(f"Alerts    : {result['alerts_raised']} raised")


if __name__ == "__main__":
    run_scan()
