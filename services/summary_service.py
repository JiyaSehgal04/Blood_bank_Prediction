"""
services/summary_service.py
Step 8 — Logging & Daily Summaries

Builds and maintains the `daily_summary` table — the ML training data source.

Schema per row (unique on summary_date + blood_group + component):
  units_received  — new units that arrived on this day
  units_issued    — units allocated/issued on this day
  units_expired   — units expired on this day
  closing_stock   — stock at end of day
  unmet_requests  — requests that were partial or unmet

Two modes:
  backfill_from_inventory()  — build history from existing blood_inventory
                               (uses collection_date as arrival date)
                               Run once after bulk load; re-run after each
                               new file upload to extend the training window.
  record_today()             — compute today's row from live logs and upsert.
                               Call at end of each operational day.
"""

import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.supabase_client import get_client
from shared.cleaning_utils import VALID_BLOOD_GROUPS

SUMMARY_TABLE  = "daily_summary"
INV_TABLE      = "blood_inventory"
ALLOC_TABLE    = "allocation_log"
WASTAGE_TABLE  = "wastage_log"


COMPONENTS = ["WB/PRC", "FFP", "PLT"]
BATCH_SIZE = 100


class SummaryService:
    def __init__(self):
        self._client = get_client()

    # ─────────────────────────────────────────────────────────────────────────
    # Backfill: build daily_summary rows from existing blood_inventory
    # ─────────────────────────────────────────────────────────────────────────

    def backfill_from_inventory(self) -> int:
        """
        Build daily_summary from blood_inventory (collection_date = arrival day).
        Also pulls allocation_log and wastage_log for issued/expired counts.
        Returns total rows upserted.
        """
        print("Fetching blood_inventory for backfill...")
        inv_rows = self._fetch_all(INV_TABLE, ["unit_id", "blood_group", "component",
                                                "collection_date", "status"])

        print("Fetching allocation_log for backfill...")
        alloc_rows = self._fetch_all(ALLOC_TABLE, ["blood_group", "component",
                                                    "units_fulfilled", "status",
                                                    "units_requested", "created_at"])

        print("Fetching wastage_log for backfill...")
        wastage_rows = self._fetch_all(WASTAGE_TABLE, ["blood_group", "component",
                                                         "created_at"])

        # ── index: (date, blood_group, component) ────────────────────────────
        received  = defaultdict(int)   # units that arrived
        issued    = defaultdict(int)   # units allocated
        expired   = defaultdict(int)   # units expired
        unmet     = defaultdict(int)   # unmet/partial requests

        for row in inv_rows:
            if not row.get("collection_date") or not row.get("blood_group"):
                continue
            key = (row["collection_date"][:10], row["blood_group"], row["component"])
            received[key] += 1

        for row in alloc_rows:
            if not row.get("created_at") or not row.get("blood_group"):
                continue
            d   = row["created_at"][:10]
            key = (d, row["blood_group"], row["component"])
            issued[key]  += row.get("units_fulfilled", 0) or 0
            if row.get("status") in ("unmet", "partial"):
                unmet[key] += 1

        for row in wastage_rows:
            if not row.get("created_at") or not row.get("blood_group"):
                continue
            d   = row["created_at"][:10]
            key = (d, row["blood_group"], row["component"])
            expired[key] += 1

        # ── collect all dates present ─────────────────────────────────────────
        all_keys = (set(received) | set(issued) | set(expired) | set(unmet))
        if not all_keys:
            print("  No data found — nothing to backfill.")
            return 0

        all_dates = sorted({k[0] for k in all_keys})
        print(f"  Date range: {all_dates[0]} → {all_dates[-1]}"
              f"  ({len(all_dates)} days)")

        # ── compute closing stock: cumulative across all dates ────────────────
        # running_stock[bg][comp] = stock at end of previous day
        running = defaultdict(lambda: defaultdict(int))

        summaries = []
        for d in all_dates:
            for bg in VALID_BLOOD_GROUPS:
                for comp in COMPONENTS:
                    key = (d, bg, comp)
                    rec = received.get(key, 0)
                    iss = issued.get(key, 0)
                    exp = expired.get(key, 0)
                    unm = unmet.get(key, 0)
                    opening = running[bg][comp]
                    closing = max(0, opening + rec - iss - exp)
                    running[bg][comp] = closing

                    # Skip entirely-zero rows to keep table lean
                    if rec == 0 and iss == 0 and exp == 0 and unm == 0 and closing == 0:
                        continue

                    summaries.append({
                        "summary_date":   d,
                        "blood_group":    bg,
                        "component":      comp,
                        "units_received": rec,
                        "units_issued":   iss,
                        "units_expired":  exp,
                        "closing_stock":  closing,
                        "unmet_requests": unm,
                    })

        print(f"  {len(summaries)} non-zero rows to upsert...")
        total = self._upsert_summaries(summaries)
        print(f"  Done — {total} rows upserted.")
        return total

    # ─────────────────────────────────────────────────────────────────────────
    # Record today's summary from live operational logs
    # ─────────────────────────────────────────────────────────────────────────

    def record_today(self) -> int:
        """
        Compute today's daily_summary rows from live DB logs and upsert.
        Call at the end of each operational day.
        Returns rows written.
        """
        today = date.today().isoformat()
        return self._compute_and_upsert_date(today)

    def record_date(self, target_date: str) -> int:
        """Compute summary for a specific date (YYYY-MM-DD). Returns rows written."""
        return self._compute_and_upsert_date(target_date)

    def _compute_and_upsert_date(self, d: str) -> int:
        # Received: units with collection_date = d
        inv = self._fetch_filtered(INV_TABLE,
                                   ["blood_group", "component"],
                                   "collection_date", d)

        # Issued: from allocation_log on date d
        alloc = self._fetch_date_rows(ALLOC_TABLE,
                                      ["blood_group", "component",
                                       "units_fulfilled", "status"], d)

        # Expired: from wastage_log on date d
        waste = self._fetch_date_rows(WASTAGE_TABLE,
                                      ["blood_group", "component"], d)

        received = defaultdict(int)
        issued   = defaultdict(int)
        expired  = defaultdict(int)
        unmet    = defaultdict(int)

        for r in inv:
            received[(r["blood_group"], r["component"])] += 1

        for r in alloc:
            k = (r["blood_group"], r["component"])
            issued[k] += r.get("units_fulfilled", 0) or 0
            if r.get("status") in ("unmet", "partial"):
                unmet[k] += 1

        for r in waste:
            expired[(r["blood_group"], r["component"])] += 1

        # Current stock from live inventory
        stock_rows = self._fetch_all(INV_TABLE,
                                     ["blood_group", "component", "status"])
        stock = defaultdict(int)
        for r in stock_rows:
            if r.get("status") == "available":
                stock[(r["blood_group"], r["component"])] += 1

        summaries = []
        for bg in VALID_BLOOD_GROUPS:
            for comp in COMPONENTS:
                k  = (bg, comp)
                rec = received.get(k, 0)
                iss = issued.get(k, 0)
                exp = expired.get(k, 0)
                unm = unmet.get(k, 0)
                closing = stock.get(k, 0)

                if rec == 0 and iss == 0 and exp == 0 and unm == 0 and closing == 0:
                    continue

                summaries.append({
                    "summary_date":   d,
                    "blood_group":    bg,
                    "component":      comp,
                    "units_received": rec,
                    "units_issued":   iss,
                    "units_expired":  exp,
                    "closing_stock":  closing,
                    "unmet_requests": unm,
                })

        return self._upsert_summaries(summaries)

    # ─────────────────────────────────────────────────────────────────────────
    # ML data export
    # ─────────────────────────────────────────────────────────────────────────

    def get_training_data(self) -> list:
        """
        Return all daily_summary rows ordered by date, ready for ML pipeline.
        """
        result = (
            self._client.table(SUMMARY_TABLE)
            .select("*")
            .order("summary_date")
            .order("blood_group")
            .execute()
        )
        return result.data

    def print_summary_stats(self):
        rows = self.get_training_data()
        if not rows:
            print("  No daily_summary rows found.")
            return

        dates = sorted({r["summary_date"] for r in rows})
        print(f"\n{'='*55}")
        print("  Daily Summary — Training Data Stats")
        print(f"{'='*55}")
        print(f"  Total rows      : {len(rows)}")
        print(f"  Date range      : {dates[0]} → {dates[-1]}")
        print(f"  Days covered    : {len(dates)}")
        print("\n  By blood group (total received across all days):")
        for bg in sorted(VALID_BLOOD_GROUPS):
            total_rec = sum(r["units_received"] for r in rows if r["blood_group"] == bg)
            total_iss = sum(r["units_issued"]   for r in rows if r["blood_group"] == bg)
            total_exp = sum(r["units_expired"]  for r in rows if r["blood_group"] == bg)
            if total_rec or total_iss or total_exp:
                print(f"    {bg:8s}: rcv={total_rec:4d}  iss={total_iss:4d}  exp={total_exp:4d}")
        print(f"{'='*55}\n")

    # ─────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _fetch_all(self, table: str, cols: list) -> list:
        """Paginate through all rows — Supabase caps unranged queries at 1000."""
        all_rows: list = []
        page_size = 1000
        start = 0
        while True:
            result = (
                self._client.table(table)
                .select(",".join(cols))
                .range(start, start + page_size - 1)
                .execute()
            )
            batch = result.data or []
            all_rows.extend(batch)
            if len(batch) < page_size:
                break
            start += page_size
        return all_rows

    def _fetch_filtered(self, table, cols, col, val) -> list:
        result = (
            self._client.table(table)
            .select(",".join(cols))
            .eq(col, val)
            .execute()
        )
        return result.data or []

    def _fetch_date_rows(self, table, cols, date_str) -> list:
        """Fetch rows where created_at::date = date_str."""
        result = (
            self._client.table(table)
            .select(",".join(cols))
            .gte("created_at", f"{date_str}T00:00:00")
            .lt("created_at",  f"{date_str}T23:59:59")
            .execute()
        )
        return result.data or []

    def _upsert_summaries(self, summaries: list) -> int:
        total = 0
        for i in range(0, len(summaries), BATCH_SIZE):
            batch = summaries[i:i + BATCH_SIZE]
            try:
                result = (
                    self._client.table(SUMMARY_TABLE)
                    .upsert(batch, on_conflict="summary_date,blood_group,component")
                    .execute()
                )
                total += len(result.data)
            except Exception as e:
                print(f"  ERROR upserting batch: {e}")
        return total


# ── standalone runner ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    svc = SummaryService()
    print("Running backfill from inventory...")
    svc.backfill_from_inventory()
    svc.print_summary_stats()
    print("Recording today's summary...")
    n = svc.record_today()
    print(f"Today: {n} rows written.")
