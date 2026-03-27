"""
models/multi_list.py
Multi-List Inventory — Steps 4 & 5 of the workplan.

Architecture
────────────
  BloodGroupList  (x8, one per blood group)
    FIFO linked chain via BloodUnit.next_in_group
    head = oldest unit (allocated first)
    tail = newest unit (appended here on arrival)

  GlobalExpiryList  (x1)
    Sorted linked chain via BloodUnit.next_in_expiry
    head = unit expiring soonest
    Enables O(n) daily expiry scan that stops at the first valid unit.

  BloodGroupIndex  (HashMap)
    dict[blood_group → BloodGroupList]
    O(1) lookup for allocation and compatibility checks.

  MultiListInventory
    Wraps the index + expiry list.
    DB sync rule: write Supabase FIRST, then update in-memory lists.
    On startup: auto-rebuild from Supabase (available units only).
"""

import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from models.blood_unit import BloodUnit
from shared.cleaning_utils import VALID_BLOOD_GROUPS, SHELF_LIFE_DAYS

TABLE = "blood_inventory"


# ── BloodGroupList ─────────────────────────────────────────────────────────────

class BloodGroupList:
    """FIFO linked list for one blood group."""

    def __init__(self, blood_group: str):
        self.blood_group: str                   = blood_group
        self.head:        Optional[BloodUnit]   = None   # oldest (allocate from here)
        self.tail:        Optional[BloodUnit]   = None   # newest (append here)
        self.count:       int                   = 0

    def append(self, unit: BloodUnit) -> None:
        """Add unit to tail (FIFO — newest last)."""
        if self.tail is None:
            self.head = self.tail = unit
        else:
            self.tail.next_in_group = unit
            self.tail = unit
        unit.next_in_group = None
        self.count += 1

    def remove(self, unit_id: str) -> Optional[BloodUnit]:
        """Remove a unit by unit_id. Returns the removed unit or None."""
        prev = None
        curr = self.head
        while curr:
            if curr.unit_id == unit_id:
                if prev:
                    prev.next_in_group = curr.next_in_group
                else:
                    self.head = curr.next_in_group
                if curr is self.tail:
                    self.tail = prev
                curr.next_in_group = None
                self.count -= 1
                return curr
            prev = curr
            curr = curr.next_in_group
        return None

    def peek_head(self) -> Optional[BloodUnit]:
        return self.head

    def to_list(self) -> list:
        result, curr = [], self.head
        while curr:
            result.append(curr)
            curr = curr.next_in_group
        return result

    def __repr__(self):
        return f"BloodGroupList({self.blood_group}, count={self.count})"


# ── GlobalExpiryList ───────────────────────────────────────────────────────────

class GlobalExpiryList:
    """
    Singly linked list sorted ascending by expiry_date.
    head = soonest-to-expire unit.
    Insertion is O(n) — acceptable for blood bank scale (~few hundred units).
    """

    def __init__(self):
        self.head:  Optional[BloodUnit] = None
        self.count: int                 = 0

    def insert_sorted(self, unit: BloodUnit) -> None:
        """Insert unit in sorted position by expiry_date ASC."""
        unit.next_in_expiry = None
        if self.head is None or unit.expiry_date <= self.head.expiry_date:
            unit.next_in_expiry = self.head
            self.head = unit
            self.count += 1
            return
        curr = self.head
        while curr.next_in_expiry and curr.next_in_expiry.expiry_date <= unit.expiry_date:
            curr = curr.next_in_expiry
        unit.next_in_expiry  = curr.next_in_expiry
        curr.next_in_expiry  = unit
        self.count += 1

    def remove(self, unit_id: str) -> Optional[BloodUnit]:
        """Remove unit by unit_id. Returns removed unit or None."""
        prev = None
        curr = self.head
        while curr:
            if curr.unit_id == unit_id:
                if prev:
                    prev.next_in_expiry = curr.next_in_expiry
                else:
                    self.head = curr.next_in_expiry
                curr.next_in_expiry = None
                self.count -= 1
                return curr
            prev = curr
            curr = curr.next_in_expiry
        return None

    def units_expiring_within(self, days: int) -> list:
        """Return all units expiring within `days` days from today."""
        cutoff = date.today() + timedelta(days=days)
        result, curr = [], self.head
        while curr:
            if curr.expiry_date <= cutoff:
                result.append(curr)
                curr = curr.next_in_expiry
            else:
                break   # list is sorted — no need to continue
        return result

    def to_list(self) -> list:
        result, curr = [], self.head
        while curr:
            result.append(curr)
            curr = curr.next_in_expiry
        return result

    def __repr__(self):
        return f"GlobalExpiryList(count={self.count})"


# ── MultiListInventory ─────────────────────────────────────────────────────────

class MultiListInventory:
    """
    Top-level Multi-List container.

    group_index : dict[blood_group → BloodGroupList]   (8 lists)
    expiry_list : GlobalExpiryList                      (1 sorted list)

    Every BloodUnit lives in EXACTLY two lists — no data duplication.
    """

    def __init__(self):
        self.group_index: dict[str, BloodGroupList] = {
            bg: BloodGroupList(bg) for bg in VALID_BLOOD_GROUPS
        }
        self.expiry_list: GlobalExpiryList = GlobalExpiryList()
        self.total_units: int              = 0
        self._db_client = None             # lazy — set on first DB call

    # ── DB client ─────────────────────────────────────────────────────────────

    def _client(self):
        if self._db_client is None:
            from db.supabase_client import get_client
            self._db_client = get_client()
        return self._db_client

    # ── core operations ───────────────────────────────────────────────────────

    def _insert_node(self, unit: BloodUnit) -> None:
        """Insert an already-constructed node into both in-memory lists."""
        if unit.blood_group not in self.group_index:
            self.group_index[unit.blood_group] = BloodGroupList(unit.blood_group)
        self.group_index[unit.blood_group].append(unit)
        self.expiry_list.insert_sorted(unit)
        self.total_units += 1

    def _remove_node(self, unit_id: str, blood_group: str) -> Optional[BloodUnit]:
        """Remove node from both lists. Returns removed unit or None."""
        removed = self.group_index[blood_group].remove(unit_id)
        if removed:
            self.expiry_list.remove(unit_id)
            self.total_units -= 1
        return removed

    # ── Step 5: add_unit (Blood Supply Arrival) ───────────────────────────────

    def add_unit(self, record: dict, write_db: bool = True) -> BloodUnit:
        """
        Add a new blood unit.
        DB sync rule: write Supabase FIRST, then update in-memory lists.

        `record` must contain at minimum:
          unit_id, blood_group, component, quantity_ml,
          collection_date (ISO str or date), expiry_date (ISO str or date)
        """
        unit = BloodUnit.from_db_row(record)

        if write_db:
            try:
                self._client().table(TABLE).upsert(
                    unit.to_dict(), on_conflict="sno,segment_no,component"
                ).execute()
            except Exception as e:
                raise RuntimeError(f"DB write failed for {unit.unit_id}: {e}")

        self._insert_node(unit)
        return unit

    # ── remove_unit ───────────────────────────────────────────────────────────

    def remove_unit(self, unit_id: str, blood_group: str,
                    new_status: str = "issued",
                    write_db: bool = True) -> Optional[BloodUnit]:
        """
        Remove a unit from both lists and update its status in DB.
        Returns the removed BloodUnit or None if not found.
        """
        removed = self._remove_node(unit_id, blood_group)
        if removed and write_db:
            try:
                self._client().table(TABLE).update(
                    {"status": new_status}
                ).eq("unit_id", unit_id).execute()
            except Exception as e:
                print(f"Warning: DB status update failed for {unit_id}: {e}")
        return removed

    # ── load_from_db / rebuild ────────────────────────────────────────────────

    def load_from_db(self) -> int:
        """
        Load all available units from Supabase into both in-memory lists.
        Ordered by collection_date ASC so FIFO order is preserved.
        Returns number of units loaded.
        """
        try:
            result = (
                self._client()
                .table(TABLE)
                .select("*")
                .eq("status", "available")
                .order("collection_date", desc=False)
                .order("collection_time", desc=False)
                .execute()
            )
        except Exception as e:
            raise RuntimeError(f"Failed to load from DB: {e}")

        for row in result.data:
            if not row.get("blood_group") or not row.get("expiry_date"):
                continue   # skip incomplete rows
            unit = BloodUnit.from_db_row(row)
            self._insert_node(unit)

        return self.total_units

    def rebuild(self) -> int:
        """Clear in-memory state and reload from DB."""
        self.group_index = {bg: BloodGroupList(bg) for bg in VALID_BLOOD_GROUPS}
        self.expiry_list = GlobalExpiryList()
        self.total_units = 0
        return self.load_from_db()

    # ── Step 6: expiry scan ───────────────────────────────────────────────────

    def scan_expiry(self, log_to_db: bool = True) -> dict:
        """
        Walk GlobalExpiryList from head (soonest first).
        - expired        → status='expired', remove from both lists, log to wastage_log
        - expiring ≤ 3d  → flag critical_expiry
        - expiring ≤ 7d  → flag warning_expiry
        Returns summary dict.
        """
        today    = date.today()
        expired  = []
        critical = []   # ≤ 3 days
        warning  = []   # ≤ 7 days

        curr = self.expiry_list.head
        while curr:
            nxt = curr.next_in_expiry   # save before potential removal
            if curr.expiry_date < today:
                expired.append(curr)
                self._remove_node(curr.unit_id, curr.blood_group)
                if log_to_db:
                    self._log_wastage(curr, reason="expired")
            elif (curr.expiry_date - today).days <= 3:
                critical.append(curr)
            elif (curr.expiry_date - today).days <= 7:
                warning.append(curr)
            else:
                break   # sorted list — everything beyond is safe
            curr = nxt

        return {
            "expired":  [u.unit_id for u in expired],
            "critical": [u.unit_id for u in critical],
            "warning":  [u.unit_id for u in warning],
        }

    def _log_wastage(self, unit: BloodUnit, reason: str = "expired"):
        try:
            self._client().table("wastage_log").insert({
                "unit_id":    unit.unit_id,
                "blood_group":unit.blood_group,
                "component":  unit.component,
                "quantity_ml":unit.quantity_ml,
                "expiry_date":unit.expiry_date.isoformat(),
                "reason":     reason,
            }).execute()
        except Exception as e:
            print(f"Warning: wastage_log insert failed for {unit.unit_id}: {e}")

    # ── summary helpers ───────────────────────────────────────────────────────

    def stock_summary(self) -> dict:
        """Return {blood_group: count} for all groups."""
        return {bg: lst.count for bg, lst in self.group_index.items()}

    def component_summary(self) -> dict:
        """Return {component: count} across all units."""
        counts = {}
        curr = self.expiry_list.head
        while curr:
            counts[curr.component] = counts.get(curr.component, 0) + 1
            curr = curr.next_in_expiry
        return counts

    def get_units_by_group(self, blood_group: str) -> list:
        """Return ordered list of available units for a blood group."""
        if blood_group not in self.group_index:
            return []
        return self.group_index[blood_group].to_list()

    def print_summary(self) -> None:
        print(f"\n{'='*55}")
        print(f"  Multi-List Inventory Summary")
        print(f"{'='*55}")
        print(f"  Total units : {self.total_units}")
        print(f"  By blood group:")
        for bg in sorted(VALID_BLOOD_GROUPS):
            cnt = self.group_index[bg].count
            bar = "█" * cnt
            print(f"    {bg:8s}: {cnt:3d}  {bar}")
        print(f"\n  By component:")
        for comp, cnt in sorted(self.component_summary().items()):
            print(f"    {comp:8s}: {cnt}")
        print(f"\n  Expiry list head: ", end="")
        if self.expiry_list.head:
            h = self.expiry_list.head
            print(f"{h.unit_id} ({h.component}) expires {h.expiry_date}")
        else:
            print("(empty)")

        expiring_3d = self.expiry_list.units_expiring_within(3)
        expiring_7d = self.expiry_list.units_expiring_within(7)
        print(f"\n  Expiring within 3 days : {len(expiring_3d)}")
        print(f"  Expiring within 7 days : {len(expiring_7d)}")
        if expiring_3d:
            print("  Critical units:")
            for u in expiring_3d:
                print(f"    {u.unit_id} | {u.blood_group} {u.component} | expires {u.expiry_date} ({u.days_until_expiry}d)")
        print(f"{'='*55}\n")
