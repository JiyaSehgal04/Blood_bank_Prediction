"""
db/initial_load.py
Bulk-loads cleaned_records.csv into Supabase blood_inventory.
Safe to re-run — upserts on (sno, segment_no, component); duplicates are skipped.

Usage:
    python3 db/initial_load.py
    python3 db/initial_load.py path/to/other_cleaned.csv
"""

import csv
import sys
import uuid
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.supabase_client import get_client

DEFAULT_CSV = Path(__file__).resolve().parent.parent / "step1_data_cleaning" / "cleaned_records.csv"
TABLE        = "blood_inventory"
HISTORY_TABLE= "upload_history"
BATCH_SIZE   = 50
SOURCE       = "bulk_load"


def load_csv(path: Path) -> list:
    records = []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            for field in ("quantity_ml",):
                val = row.get(field, "")
                row[field] = float(val) if val else None

            for field in ("collection_date", "expiry_date"):
                val = row.get(field, "")
                row[field] = val if val else None

            # Ensure v3 columns exist
            row["source"]          = SOURCE
            row["upload_batch_id"] = ""  # will be set below
            records.append(dict(row))
    return records


def upsert_batch(client, records: list) -> tuple:
    try:
        result = (
            client.table(TABLE)
            .upsert(records, on_conflict="sno,segment_no,component", ignore_duplicates=True)
            .execute()
        )
        return len(result.data or []), 0
    except Exception as e:
        print(f"  ERROR: {e}")
        return 0, len(records)


def log_upload_history(client, batch_id: str, filename: str,
                       total: int, inserted: int, dupes: int,
                       flagged: int, errors: int):
    try:
        client.table(HISTORY_TABLE).upsert({
            "batch_id":   batch_id,
            "filename":   filename,
            "source":     SOURCE,
            "total_rows": total,
            "inserted":   inserted,
            "duplicates": dupes,
            "flagged":    flagged,
            "errors":     errors,
        }, on_conflict="batch_id").execute()
    except Exception as e:
        print(f"  Warning: could not log to upload_history: {e}")


def main():
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV

    if not csv_path.exists():
        print(f"ERROR: {csv_path} not found.")
        sys.exit(1)

    batch_id = f"bulk_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"Batch ID   : {batch_id}")
    print(f"Source     : {csv_path.name}")
    print(f"Loading into Supabase table '{TABLE}' ...")

    records = load_csv(csv_path)
    for r in records:
        r["upload_batch_id"] = batch_id

    # Separate flagged from valid
    valid   = [r for r in records if r.get("flag", "") != "INCOMPLETE"]
    flagged = [r for r in records if r.get("flag", "") == "INCOMPLETE"]
    print(f"  {len(records)} total | {len(valid)} valid | {len(flagged)} flagged")

    client = get_client()

    total_inserted = total_errors = 0
    for i in range(0, len(valid), BATCH_SIZE):
        ins, err = upsert_batch(client, valid[i:i + BATCH_SIZE])
        total_inserted += ins
        total_errors   += err
        print(f"  Batch {i // BATCH_SIZE + 1}: {ins} upserted, {err} errors")

    # Duplicates = valid rows that weren't new inserts
    duplicates = len(valid) - total_inserted - total_errors

    log_upload_history(client, batch_id, csv_path.name,
                       len(records), total_inserted,
                       max(0, duplicates), len(flagged), total_errors)

    print()
    print("=" * 50)
    print(f"  Upserted   : {total_inserted}")
    print(f"  Duplicates : {max(0, duplicates)}")
    print(f"  Flagged    : {len(flagged)}  (not inserted)")
    print(f"  Errors     : {total_errors}")
    if total_errors == 0:
        print("  Done.")
    else:
        print("  Some errors — check output above.")


if __name__ == "__main__":
    main()
