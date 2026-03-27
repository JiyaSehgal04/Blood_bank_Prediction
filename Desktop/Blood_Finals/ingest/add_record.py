"""
ingest/add_record.py
Interactive CLI to add a single blood unit to Supabase.

Usage:
    python3 ingest/add_record.py
"""

import sys
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared.cleaning_utils import (
    VALID_BLOOD_GROUPS, SHELF_LIFE_DAYS,
    normalize_time, parse_date, make_unit_id, compute_expiry
)
from db.supabase_client import get_client

TABLE = "blood_inventory"


def prompt(label: str, required: bool = True, default: str = "") -> str:
    suffix = f" [{default}]" if default else (" (required)" if required else " (optional, press Enter to skip)")
    while True:
        val = input(f"  {label}{suffix}: ").strip()
        if not val and default:
            return default
        if not val and required:
            print("    This field is required.")
            continue
        return val or ""


def prompt_choice(label: str, choices: list, required: bool = True) -> str:
    print(f"  {label}:")
    for i, c in enumerate(choices, 1):
        print(f"    {i}. {c}")
    while True:
        val = input("  Enter number or exact value: ").strip()
        if val.isdigit() and 1 <= int(val) <= len(choices):
            return choices[int(val) - 1]
        if val in choices:
            return val
        if not required and val == "":
            return ""
        print(f"    Please enter a number (1–{len(choices)}) or the exact value.")


def main():
    print("=" * 55)
    print("  Blood Bank — Add Single Blood Unit")
    print("=" * 55)
    print()

    sno        = prompt("S.No (serial number)")
    unit_no    = prompt("Unit No (e.g. 57432)")
    segment_no = prompt("Segment No", required=False, default="N/A")
    component  = prompt_choice("Component", list(SHELF_LIFE_DAYS.keys()))
    blood_group = prompt_choice("Blood Group", sorted(VALID_BLOOD_GROUPS))

    qty_raw = prompt("Quantity (ml)")
    try:
        quantity_ml = float(qty_raw)
    except ValueError:
        print("  Invalid quantity — defaulting to 0")
        quantity_ml = 0.0

    coll_date_raw = prompt("Collection Date (DD/MM/YYYY)")
    try:
        collection_date = parse_date(coll_date_raw)
    except ValueError:
        print("  Invalid date format. Using today.")
        collection_date = date.today()

    coll_time_raw   = prompt("Collection Time (e.g. 02:30 PM)", required=False)
    collection_time = normalize_time(coll_time_raw) if coll_time_raw else "Unknown"

    exp_raw = prompt("Expiry Date (DD/MM/YYYY)", required=False)
    if exp_raw:
        try:
            expiry_date = parse_date(exp_raw)
        except ValueError:
            expiry_date = compute_expiry(collection_date, component)
            print(f"  Invalid expiry — computed from shelf life: {expiry_date}")
    else:
        expiry_date = compute_expiry(collection_date, component)
        print(f"  Expiry computed from shelf life: {expiry_date}")

    print()
    print("  Screening results (Neg / Pos):")
    hiv    = prompt("HIV 1&2",  default="Neg")
    hbsag  = prompt("HBsAg",   default="Neg")
    hcv    = prompt("HCV",     default="Neg")
    malaria= prompt("Malaria", default="Neg")
    vdrl   = prompt("VDRL",    default="Neg")

    notes = prompt("Notes", required=False)

    unit_id = make_unit_id(sno, component, segment_no)

    record = {
        "unit_id":         unit_id,
        "sno":             sno,
        "unit_no":         unit_no,
        "segment_no":      segment_no,
        "blood_group":     blood_group,
        "component":       component,
        "quantity_ml":     quantity_ml,
        "collection_date": collection_date.isoformat(),
        "collection_time": collection_time,
        "expiry_date":     expiry_date.isoformat(),
        "status":          "available",
        "hiv":    hiv,
        "hbsag":  hbsag,
        "hcv":    hcv,
        "malaria":malaria,
        "vdrl":   vdrl,
        "notes":  notes,
        "flag":   "",
    }

    print()
    print("  Record to be inserted:")
    for k, v in record.items():
        if v:
            print(f"    {k}: {v}")

    confirm = input("\n  Confirm insert? (y/n): ").strip().lower()
    if confirm != "y":
        print("  Aborted.")
        return

    client = get_client()
    try:
        result = client.table(TABLE).upsert(record, on_conflict="unit_id").execute()
        print(f"\n  Inserted unit_id: {unit_id}")
        print("  Done.")
    except Exception as e:
        print(f"\n  ERROR: {e}")


if __name__ == "__main__":
    main()
