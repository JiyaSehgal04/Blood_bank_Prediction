"""
services/allocation_service.py
Step 7 — Request Queue & Allocation Engine

Priority queue (min-heap):
  Emergency (0) > Urgent (1) > Routine (2)
  Tie-break: FIFO by request timestamp

Allocation logic per request:
  1. Compatibility check  → O(1) via BloodGroupIndex HashMap
  2. Unit selection       → FIFO from group list head (oldest first)
  3. Expiry-aware opt     → among FIFO candidates, prefer nearest-expiry
  4. Compatible fallback  → if exact group exhausted, try donor-compatible groups
  5. Log to allocation_log
  6. If still unmet       → generate HIGH alert

Compatibility matrix (transfusion rules):
  O Neg  → [O Neg]
  O Pos  → [O Neg, O Pos]
  A Neg  → [O Neg, A Neg]
  A Pos  → [O Neg, O Pos, A Neg, A Pos]
  B Neg  → [O Neg, B Neg]
  B Pos  → [O Neg, O Pos, B Neg, B Pos]
  AB Neg → [O Neg, A Neg, B Neg, AB Neg]
  AB Pos → all 8 groups (universal recipient)
"""

import heapq
import sys
import uuid
from datetime import datetime, date
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from models.multi_list import MultiListInventory
from models.blood_unit  import BloodUnit

# ── Compatibility matrix ───────────────────────────────────────────────────────
# Key: patient blood group → list of donor groups (ordered by preference)
COMPATIBILITY: dict[str, list[str]] = {
    "O Neg":  ["O Neg"],
    "O Pos":  ["O Pos",  "O Neg"],
    "A Neg":  ["A Neg",  "O Neg"],
    "A Pos":  ["A Pos",  "A Neg", "O Pos", "O Neg"],
    "B Neg":  ["B Neg",  "O Neg"],
    "B Pos":  ["B Pos",  "B Neg", "O Pos", "O Neg"],
    "AB Neg": ["AB Neg", "A Neg", "B Neg", "O Neg"],
    "AB Pos": ["AB Pos", "AB Neg", "A Pos", "A Neg",
               "B Pos",  "B Neg",  "O Pos", "O Neg"],
}

ALLOC_TABLE  = "allocation_log"
ALERTS_TABLE = "alerts"
PRIORITY_MAP = {"emergency": 0, "urgent": 1, "routine": 2}


# ── BloodRequest ───────────────────────────────────────────────────────────────

class BloodRequest:
    _counter = 0   # tie-break FIFO within same priority

    def __init__(self, blood_group: str, component: str,
                 units_needed: int, priority: str = "routine",
                 request_id: str = ""):
        BloodRequest._counter += 1
        self.request_id   = request_id or f"REQ-{uuid.uuid4().hex[:8].upper()}"
        self.blood_group  = blood_group
        self.component    = component
        self.units_needed = units_needed
        self.priority     = priority.lower()
        self.timestamp    = datetime.now()
        self._seq         = BloodRequest._counter          # FIFO tie-break

    def is_emergency(self) -> bool:
        return self.priority == "emergency"

    # heapq compares tuples: (priority_int, seq, request)
    def heap_key(self):
        return (PRIORITY_MAP.get(self.priority, 2), self._seq)

    def __lt__(self, other):
        return self.heap_key() < other.heap_key()

    def __repr__(self):
        return (f"BloodRequest({self.request_id} | {self.blood_group} {self.component} "
                f"x{self.units_needed} | {self.priority})")


# ── AllocationResult ──────────────────────────────────────────────────────────

class AllocationResult:
    def __init__(self, request: BloodRequest):
        self.request        = request
        self.allocated      : list[BloodUnit] = []
        self.status         : str = "unmet"      # fulfilled / partial / unmet
        self.used_compatible: bool = False        # True if fallback groups used
        self.notes          : str = ""

    @property
    def units_fulfilled(self) -> int:
        return len(self.allocated)

    def to_dict(self) -> dict:
        return {
            "request_id":      self.request.request_id,
            "blood_group":     self.request.blood_group,
            "component":       self.request.component,
            "units_requested": self.request.units_needed,
            "units_fulfilled": self.units_fulfilled,
            "unit_ids":        [u.unit_id for u in self.allocated],
            "priority":        self.request.priority,
            "was_emergency":   self.request.is_emergency(),
            "status":          self.status,
            "notes":           self.notes,
        }


# ── AllocationService ─────────────────────────────────────────────────────────

class AllocationService:
    def __init__(self, inventory: MultiListInventory):
        self.inv   = inventory
        self._heap: list = []    # min-heap of (priority_int, seq, BloodRequest)

    # ── queue management ──────────────────────────────────────────────────────

    def enqueue(self, request: BloodRequest) -> None:
        heapq.heappush(self._heap, request)

    def queue_size(self) -> int:
        return len(self._heap)

    # ── process next request ──────────────────────────────────────────────────

    def process_next(self) -> Optional[AllocationResult]:
        if not self._heap:
            return None
        request = heapq.heappop(self._heap)
        return self._allocate(request)

    def process_all(self) -> list[AllocationResult]:
        results = []
        while self._heap:
            results.append(self.process_next())
        return results

    # ── immediate allocation (no queue) ───────────────────────────────────────

    def allocate_now(self, blood_group: str, component: str,
                     units_needed: int, priority: str = "routine",
                     request_id: str = "") -> AllocationResult:
        req = BloodRequest(blood_group, component, units_needed,
                           priority, request_id)
        return self._allocate(req)

    # ── core allocation logic ─────────────────────────────────────────────────

    def _allocate(self, request: BloodRequest) -> AllocationResult:
        result = AllocationResult(request)
        remaining = request.units_needed

        # Try exact group first, then compatible groups (by preference order)
        donor_groups = COMPATIBILITY.get(request.blood_group,
                                          [request.blood_group])

        for donor_group in donor_groups:
            if remaining <= 0:
                break

            grp_list = self.inv.group_index.get(donor_group)
            if not grp_list or grp_list.count == 0:
                continue

            # Build candidate list: available units of required component
            candidates = [
                u for u in grp_list.to_list()
                if u.component == request.component
                and u.status   == "available"
            ]

            if not candidates:
                continue

            # Expiry-aware: sort by expiry_date ASC (use soonest-to-expire first)
            # This overrides pure FIFO within a compatible group to reduce wastage
            candidates.sort(key=lambda u: u.expiry_date)

            for unit in candidates:
                if remaining <= 0:
                    break
                # Remove from both lists, mark issued in DB
                removed = self.inv.remove_unit(
                    unit.unit_id, donor_group, new_status="issued"
                )
                if removed:
                    result.allocated.append(removed)
                    if donor_group != request.blood_group:
                        result.used_compatible = True
                    remaining -= 1

        # Determine outcome
        fulfilled = result.units_fulfilled
        if fulfilled == 0:
            result.status = "unmet"
            result.notes  = f"No {request.blood_group}/{request.component} or compatible units available"
        elif fulfilled < request.units_needed:
            result.status = "partial"
            result.notes  = (f"Only {fulfilled}/{request.units_needed} units available"
                             + (" (used compatible groups)" if result.used_compatible else ""))
        else:
            result.status = "fulfilled"
            if result.used_compatible:
                result.notes = "Fulfilled using compatible blood groups"

        # Write to DB
        self._log_allocation(result)
        if result.status in ("unmet", "partial"):
            self._raise_shortage_alert(request, result)

        return result

    # ── DB helpers ────────────────────────────────────────────────────────────

    def _log_allocation(self, result: AllocationResult):
        try:
            self.inv._client().table(ALLOC_TABLE).insert(
                result.to_dict()
            ).execute()
        except Exception as e:
            print(f"Warning: allocation_log failed: {e}")

    def _raise_shortage_alert(self, request: BloodRequest,
                               result: AllocationResult):
        severity = "CRITICAL" if request.is_emergency() else "HIGH"
        msg = (f"{result.status.upper()}: {request.blood_group} {request.component} "
               f"— needed {request.units_needed}, got {result.units_fulfilled}")
        try:
            self.inv._client().table(ALERTS_TABLE).insert({
                "alert_type":  "shortage",
                "blood_group": request.blood_group,
                "component":   request.component,
                "severity":    severity,
                "message":     msg,
                "is_resolved": False,
            }).execute()
        except Exception as e:
            print(f"Warning: shortage alert failed: {e}")


# ── standalone demo ───────────────────────────────────────────────────────────

def demo():
    inv = MultiListInventory()
    print("Loading inventory...")
    n = inv.load_from_db()
    print(f"Loaded {n} units.\n")

    svc = AllocationService(inv)

    # Queue mixed-priority requests
    requests = [
        BloodRequest("O Pos",  "FFP",    2, "routine"),
        BloodRequest("A Pos",  "FFP",    1, "urgent"),
        BloodRequest("AB Pos", "WB/PRC", 1, "emergency"),
        BloodRequest("B Neg",  "FFP",    1, "routine"),   # B Neg has only 2 units
        BloodRequest("AB Neg", "FFP",    1, "routine"),   # AB Neg = 0 units → fallback
    ]

    for req in requests:
        svc.enqueue(req)

    print(f"Queue: {svc.queue_size()} requests\n")
    print(f"{'─'*60}")

    results = svc.process_all()
    for r in results:
        icon = "✓" if r.status == "fulfilled" else ("~" if r.status == "partial" else "✗")
        compat = " [compatible fallback]" if r.used_compatible else ""
        print(f"  {icon} {r.request.request_id} | {r.request.priority:9s} | "
              f"{r.request.blood_group} {r.request.component} x{r.request.units_needed} "
              f"→ {r.status} ({r.units_fulfilled}/{r.request.units_needed}){compat}")
        if r.notes:
            print(f"      {r.notes}")

    print(f"{'─'*60}")
    print(f"\nStock after allocation:")
    for bg, cnt in sorted(inv.stock_summary().items()):
        print(f"  {bg:8s}: {cnt}")


if __name__ == "__main__":
    demo()
