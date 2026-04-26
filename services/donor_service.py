"""
services/donor_service.py
Step 9 — Donor Management

Donor CRUD + 56-day eligibility check + donation history linked to inventory.
"""

import sys
import uuid
from datetime import date
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.supabase_client import get_client

DONORS_TABLE    = "donors"
DONATIONS_TABLE = "donations"
INV_TABLE       = "blood_inventory"
MIN_GAP_DAYS    = 56


class DonorService:
    def __init__(self):
        self._client = get_client()

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def create_donor(self, data: dict) -> dict:
        """
        Register a new donor.
        Required: name, blood_group
        Optional: age, gender, phone, email, last_donation_date
        """
        donor = {
            "donor_id":          str(uuid.uuid4()),
            "name":              data.get("name", "").strip(),
            "blood_group":       data.get("blood_group", "").strip(),
            "age":               data.get("age"),
            "gender":            data.get("gender", "").strip(),
            "phone":             data.get("phone", "").strip(),
            "email":             data.get("email", "").strip(),
            "last_donation_date":data.get("last_donation_date"),
            "total_donations":   0,
            "is_eligible":       True,
        }
        # recompute eligibility if last_donation_date provided
        if donor["last_donation_date"]:
            donor["is_eligible"] = self._check_eligible(donor["last_donation_date"])

        result = self._client.table(DONORS_TABLE).insert(donor).execute()
        return result.data[0] if result.data else donor

    def get_donor(self, donor_id: str) -> Optional[dict]:
        result = (self._client.table(DONORS_TABLE)
                  .select("*").eq("donor_id", donor_id).execute())
        return result.data[0] if result.data else None

    def list_donors(self, blood_group: str = None,
                    eligible_only: bool = False,
                    search: str = "") -> list:
        q = self._client.table(DONORS_TABLE).select("*")
        if blood_group:
            q = q.eq("blood_group", blood_group)
        if eligible_only:
            q = q.eq("is_eligible", True)
        donors = q.order("name").execute().data or []

        term = (search or "").strip().lower()
        if not term:
            return donors
        return [
            d for d in donors
            if term in str(d.get("name") or "").lower()
            or term in str(d.get("phone") or "").lower()
            or term in str(d.get("email") or "").lower()
        ]

    def update_donor(self, donor_id: str, data: dict) -> Optional[dict]:
        # Recompute eligibility if last_donation_date changed
        if "last_donation_date" in data and data["last_donation_date"]:
            data["is_eligible"] = self._check_eligible(data["last_donation_date"])
        result = (self._client.table(DONORS_TABLE)
                  .update(data).eq("donor_id", donor_id).execute())
        return result.data[0] if result.data else None

    # ── Donation linkage ──────────────────────────────────────────────────────

    def record_donation(self, donor_id: str, unit_id: str) -> Optional[dict]:
        """
        Link a donor to a blood_inventory unit.
        Updates donor's last_donation_date and recalculates eligibility.
        """
        # Fetch unit details
        inv = (self._client.table(INV_TABLE)
               .select("sno,component,quantity_ml,collection_date")
               .eq("unit_id", unit_id).execute())
        if not inv.data:
            return None
        unit = inv.data[0]

        donation = {
            "donation_id":   str(uuid.uuid4()),
            "donor_id":      donor_id,
            "unit_id":       unit_id,
            "sno":           unit.get("sno", ""),
            "donation_date": unit.get("collection_date"),
            "component":     unit.get("component"),
            "quantity_ml":   unit.get("quantity_ml"),
        }
        result = self._client.table(DONATIONS_TABLE).insert(donation).execute()

        # Update donor: last_donation_date, total_donations, eligibility
        donor = self.get_donor(donor_id)
        if donor:
            new_last = unit.get("collection_date")
            self.update_donor(donor_id, {
                "last_donation_date": new_last,
                "total_donations": (donor.get("total_donations") or 0) + 1,
                "is_eligible": self._check_eligible(new_last),
            })

        return result.data[0] if result.data else donation

    def get_donation_history(self, donor_id: str) -> list:
        return (self._client.table(DONATIONS_TABLE)
                .select("*").eq("donor_id", donor_id)
                .order("donation_date", desc=True).execute().data or [])

    def refresh_all_eligibility(self) -> int:
        """Recompute is_eligible for every donor. Run daily."""
        donors = self.list_donors()
        updated = 0
        for d in donors:
            eligible = self._check_eligible(d.get("last_donation_date"))
            if eligible != d.get("is_eligible"):
                self.update_donor(d["donor_id"], {"is_eligible": eligible})
                updated += 1
        return updated

    # ── helpers ───────────────────────────────────────────────────────────────

    def _check_eligible(self, last_donation_date) -> bool:
        if not last_donation_date:
            return True
        if isinstance(last_donation_date, str):
            last = date.fromisoformat(last_donation_date[:10])
        else:
            last = last_donation_date
        return (date.today() - last).days >= MIN_GAP_DAYS
