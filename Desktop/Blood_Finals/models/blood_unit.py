"""
models/blood_unit.py
BloodUnit — the core node of the Multi-List.

Each physical blood bag component lives in exactly TWO linked lists
simultaneously (no duplication of data):
  1. A BloodGroupList  (FIFO chain, oldest → newest)
  2. The GlobalExpiryList (sorted by expiry_date ASC)

Two separate next-pointers make this possible without copying data.
"""

from datetime import date
from dataclasses import dataclass, field
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from models.blood_unit import BloodUnit


@dataclass
class BloodUnit:
    # ── identity ──────────────────────────────────────────────────────────────
    unit_id:         str
    sno:             str
    unit_no:         str
    segment_no:      str

    # ── medical ───────────────────────────────────────────────────────────────
    blood_group:     str
    component:       str          # WB/PRC / FFP / PLT
    quantity_ml:     float
    collection_date: date
    collection_time: str
    expiry_date:     date

    # ── state ─────────────────────────────────────────────────────────────────
    status:          str = "available"   # available / reserved / issued / expired
    notes:           str = ""
    source:          str = "bulk_load"
    upload_batch_id: str = ""

    # ── screening results ─────────────────────────────────────────────────────
    hiv:    str = "Neg"
    hbsag:  str = "Neg"
    hcv:    str = "Neg"
    malaria:str = "Neg"
    vdrl:   str = "Neg"

    # ── Multi-List pointers (not stored in DB) ────────────────────────────────
    next_in_group:  Optional["BloodUnit"] = field(default=None, repr=False, compare=False)
    next_in_expiry: Optional["BloodUnit"] = field(default=None, repr=False, compare=False)

    # ── convenience ───────────────────────────────────────────────────────────
    @property
    def days_until_expiry(self) -> int:
        return (self.expiry_date - date.today()).days

    @property
    def is_expired(self) -> bool:
        return self.expiry_date < date.today()

    @property
    def screening_positive(self) -> bool:
        return any(v == "Pos" for v in (self.hiv, self.hbsag, self.hcv, self.malaria, self.vdrl))

    def to_dict(self) -> dict:
        """Serialise to flat dict (safe for JSON / Supabase insert)."""
        return {
            "unit_id":         self.unit_id,
            "sno":             self.sno,
            "unit_no":         self.unit_no,
            "segment_no":      self.segment_no,
            "blood_group":     self.blood_group,
            "component":       self.component,
            "quantity_ml":     self.quantity_ml,
            "collection_date": self.collection_date.isoformat(),
            "collection_time": self.collection_time,
            "expiry_date":     self.expiry_date.isoformat(),
            "status":          self.status,
            "hiv":             self.hiv,
            "hbsag":           self.hbsag,
            "hcv":             self.hcv,
            "malaria":         self.malaria,
            "vdrl":            self.vdrl,
            "notes":           self.notes,
            "source":          self.source,
            "upload_batch_id": self.upload_batch_id,
        }

    @staticmethod
    def from_db_row(row: dict) -> "BloodUnit":
        """Build a BloodUnit from a Supabase row dict."""
        def to_date(v):
            if isinstance(v, date):
                return v
            if v:
                return date.fromisoformat(str(v)[:10])
            return date.today()

        return BloodUnit(
            unit_id         = row["unit_id"],
            sno             = str(row.get("sno", "")),
            unit_no         = str(row.get("unit_no", "")),
            segment_no      = str(row.get("segment_no", "")),
            blood_group     = row["blood_group"],
            component       = row["component"],
            quantity_ml     = float(row.get("quantity_ml") or 0),
            collection_date = to_date(row.get("collection_date")),
            collection_time = str(row.get("collection_time", "Unknown")),
            expiry_date     = to_date(row.get("expiry_date")),
            status          = row.get("status", "available"),
            notes           = row.get("notes", "") or "",
            source          = row.get("source", "bulk_load") or "bulk_load",
            upload_batch_id = row.get("upload_batch_id", "") or "",
            hiv             = row.get("hiv", "Neg") or "Neg",
            hbsag           = row.get("hbsag", "Neg") or "Neg",
            hcv             = row.get("hcv", "Neg") or "Neg",
            malaria         = row.get("malaria", "Neg") or "Neg",
            vdrl            = row.get("vdrl", "Neg") or "Neg",
        )
