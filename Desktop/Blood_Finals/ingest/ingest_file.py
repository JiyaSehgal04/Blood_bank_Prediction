"""
ingest/ingest_file.py
Add new blood unit data from a file (Numbers, Excel, or CSV) into Supabase.
Deduplicates on (sno, segment_no, component) — uploading same file twice → 0 new inserts.

Usage:
    python3 ingest/ingest_file.py path/to/register.numbers
    python3 ingest/ingest_file.py path/to/register.xlsx
    python3 ingest/ingest_file.py path/to/records.csv
"""

import csv
import sys
import shutil
import tempfile
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared.cleaning_utils import clean_raw_rows
from db.supabase_client import get_client

TABLE         = "blood_inventory"
HISTORY_TABLE = "upload_history"
BATCH_SIZE    = 50
ALLOWED_EXT   = {".numbers", ".xlsx", ".xls", ".csv"}


def read_numbers_or_xlsx(file_path: Path) -> tuple:
    suffix = file_path.suffix.lower()
    # numbers-parser requires .numbers extension
    if suffix in (".xlsx", ".xls"):
        tmp = tempfile.mktemp(suffix=".numbers")
        shutil.copy(file_path, tmp)
        src = tmp
    else:
        src = str(file_path)
    try:
        from numbers_parser import Document
        doc      = Document(src)
        table    = doc.sheets[0].tables[0]
        rows     = list(table.iter_rows())
        headers  = [c.value for c in rows[0]]
        raw_rows = [[c.value if c.value is not None else "" for c in row] for row in rows[1:]]
        return headers, raw_rows
    except Exception as e:
        print(f"ERROR reading file: {e}")
        sys.exit(1)


def read_csv(file_path: Path) -> tuple:
    with open(file_path, newline="") as f:
        reader = csv.DictReader(f)
        headers  = list(reader.fieldnames or [])
        raw_rows = [list(row.values()) for row in reader]
    return headers, raw_rows


def upsert_records(client, records: list) -> tuple:
    inserted = errors = 0
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        try:
            result = (
                client.table(TABLE)
                .upsert(batch, on_conflict="sno,segment_no,component")
                .execute()
            )
            inserted += len(result.data)
        except Exception as e:
            print(f"  ERROR batch {i // BATCH_SIZE + 1}: {e}")
            errors += len(batch)
    return inserted, errors


def log_history(client, batch_id, filename, total, inserted, flagged, errors):
    dupes = max(0, total - flagged - inserted - errors)
    try:
        client.table(HISTORY_TABLE).upsert({
            "batch_id":   batch_id,
            "filename":   filename,
            "source":     "excel_upload",
            "total_rows": total,
            "inserted":   inserted,
            "duplicates": dupes,
            "flagged":    flagged,
            "errors":     errors,
        }, on_conflict="batch_id").execute()
    except Exception as e:
        print(f"  Warning: upload_history log failed: {e}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 ingest/ingest_file.py <path_to_file>")
        sys.exit(1)

    file_path = Path(sys.argv[1])
    if not file_path.exists():
        print(f"ERROR: File not found: {file_path}")
        sys.exit(1)

    if file_path.suffix.lower() not in ALLOWED_EXT:
        print(f"ERROR: Unsupported file type. Allowed: {ALLOWED_EXT}")
        sys.exit(1)

    batch_id = f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"Batch ID : {batch_id}")
    print(f"File     : {file_path.name}")

    if file_path.suffix.lower() == ".csv":
        headers, raw_rows = read_csv(file_path)
    else:
        headers, raw_rows = read_numbers_or_xlsx(file_path)

    print(f"  {len(raw_rows)} raw rows found.")

    valid, flagged, log = clean_raw_rows(
        headers, raw_rows,
        source="excel_upload",
        upload_batch_id=batch_id
    )

    if log:
        print("\nCleaning log:")
        for line in log:
            print(f"  {line}")

    print(f"\n  Valid   : {len(valid)}")
    print(f"  Flagged : {len(flagged)}")

    if flagged:
        print("  Flagged records (not inserted):")
        for r in flagged:
            print(f"    {r['unit_id']} | blood_group={r['blood_group']!r} | qty={r['quantity_ml']!r}")

    if not valid:
        print("No valid records to insert.")
        return

    client   = get_client()
    inserted, errors = upsert_records(client, valid)

    log_history(client, batch_id, file_path.name,
                len(raw_rows), inserted, len(flagged), errors)

    dupes = max(0, len(valid) - inserted - errors)

    print()
    print("=" * 50)
    print(f"  Inserted   : {inserted}")
    print(f"  Duplicates : {dupes}  (already in DB — skipped)")
    print(f"  Flagged    : {len(flagged)}  (missing blood_group or quantity)")
    print(f"  Errors     : {errors}")
    if errors == 0:
        print("  Done.")


if __name__ == "__main__":
    main()
