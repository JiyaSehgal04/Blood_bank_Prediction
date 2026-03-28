"""
Step 1: Data Cleaning & Preparation
Blood Bank Inventory & Distribution Management System

Reads raw Numbers register file, cleans and standardises all records,
outputs:
  - cleaned_records.csv   : 76 valid records ready for Multi-List ingestion
  - flagged_records.csv   : 1 incomplete record (missing blood group / qty)
  - cleaning_report.txt   : full audit of every transformation applied
"""

import csv
import re
from datetime import datetime, date, timedelta
from numbers_parser import Document

# ── constants ────────────────────────────────────────────────────────────────
SOURCE_FILE   = "/tmp/register_data.numbers"
OUT_CLEAN     = "cleaned_records.csv"
OUT_FLAGGED   = "flagged_records.csv"
OUT_REPORT    = "cleaning_report.txt"

VALID_BLOOD_GROUPS = {
    "O Pos", "O Neg", "A Pos", "A Neg",
    "B Pos", "B Neg", "AB Pos", "AB Neg"
}

SHELF_LIFE_DAYS = {
    "WB/PRC": 42,
    "FFP":    365,
    "PLT":    5,
    "Cryo":   365,
}

SCREENING_COLS = ["HIV 1&2", "HBsAg", "HCV", "Malaria", "VDRL"]

OUTPUT_FIELDS = [
    "unit_id", "sno", "unit_no", "segment_no",
    "blood_group", "component",
    "quantity_ml", "collection_date", "collection_time",
    "expiry_date", "status",
    "hiv", "hbsag", "hcv", "malaria", "vdrl",
    "notes", "flag"
]


# ── helpers ───────────────────────────────────────────────────────────────────

def normalize_time(raw: str) -> str:
    """
    Convert any 12-hour time string (mixed casing, with/without leading zero)
    to 24-hour HH:MM.  Returns 'Unknown' for blank / unparseable input.
    """
    raw = raw.strip()
    if not raw:
        return "Unknown"

    raw_upper = raw.upper().replace(".", "").replace(" ", " ").strip()

    # Try various 12-hour patterns: '01:00 PM', '1:00PM', '11:45 pm'
    for fmt in ("%I:%M %p", "%I:%M%p"):
        try:
            t = datetime.strptime(raw_upper, fmt)
            return t.strftime("%H:%M")
        except ValueError:
            pass

    # Already looks like 24-hour HH:MM
    if re.match(r"^\d{2}:\d{2}$", raw_upper):
        return raw_upper

    return "Unknown"


def parse_date(raw: str) -> date:
    """Parse DD/MM/YYYY to a Python date object."""
    return datetime.strptime(raw.strip(), "%d/%m/%Y").date()


def make_unit_id(sno: str, component: str, segment_no: str) -> str:
    """Generate unique unit_id: SNO-COMPONENT-SEGNO  (spaces → underscores)."""
    seg = segment_no.replace(" ", "_") if segment_no else "NA"
    comp = component.replace("/", "_")
    return f"{sno}-{comp}-{seg}"


def compute_expiry(collection_date: date, component: str) -> date:
    """Return expiry date based on component shelf life."""
    days = SHELF_LIFE_DAYS.get(component, 42)
    return collection_date + timedelta(days=days)


# ── main ──────────────────────────────────────────────────────────────────────

def run():
    log = []   # collects every cleaning action for the report

    # 1. Load raw data
    doc = Document(SOURCE_FILE)
    table = doc.sheets[0].tables[0]

    headers = [c.value for c in list(table.iter_rows())[0]]
    raw_rows = []
    for row in list(table.iter_rows())[1:]:
        raw_rows.append([c.value if c.value is not None else "" for c in row])

    log.append(f"Loaded {len(raw_rows)} raw rows from source file.")
    log.append(f"Columns: {headers}\n")

    valid_records  = []
    flagged_records = []

    for idx, row in enumerate(raw_rows, start=2):   # row 2 = first data row
        r = dict(zip(headers, row))

        # ── normalise S.No to int string ──────────────────────────────────
        sno_raw = str(r.get("S.No", "")).strip()
        sno = str(int(float(sno_raw))) if sno_raw else ""

        unit_no   = str(r.get("Unit No", "")).strip()
        segment_no = str(r.get("Segment No", "")).strip()
        component  = str(r.get("Component", "")).strip()
        notes      = str(r.get("Notes", "")).strip()

        # ── missing segment_no → 'N/A' ────────────────────────────────────
        if not segment_no:
            log.append(f"  Row {idx} | S.No {sno} | segment_no missing → 'N/A'")
            segment_no = "N/A"

        # ── collection date ───────────────────────────────────────────────
        coll_date_raw = str(r.get("Collection Date", "")).strip()
        try:
            collection_date = parse_date(coll_date_raw)
        except Exception:
            collection_date = None
            log.append(f"  Row {idx} | S.No {sno} | unparseable collection_date: {coll_date_raw!r}")

        # ── collection time → 24-hour ─────────────────────────────────────
        time_raw = str(r.get("Collection Time", "")).strip()
        collection_time = normalize_time(time_raw)
        if collection_time == "Unknown":
            log.append(f"  Row {idx} | S.No {sno} | collection_time missing/unknown (was {time_raw!r}) → 'Unknown'")

        # ── expiry date (use raw; recompute as validation cross-check) ────
        exp_date_raw = str(r.get("Expiry Date", "")).strip()
        try:
            expiry_date = parse_date(exp_date_raw)
        except Exception:
            # Recompute from shelf life if raw is missing/bad
            expiry_date = compute_expiry(collection_date, component) if collection_date else None
            log.append(f"  Row {idx} | S.No {sno} | expiry_date missing → computed from shelf life: {expiry_date}")

        # ── quantity ──────────────────────────────────────────────────────
        qty_raw = str(r.get("Quantity (ml)", "")).strip()
        if qty_raw == "" or qty_raw is None:
            quantity_ml = None
            log.append(f"  Row {idx} | S.No {sno} | quantity_ml missing")
        else:
            try:
                quantity_ml = float(qty_raw)
                # Row 66/67 SDP FFP qty=0 fill rule
                if quantity_ml == 0.0:
                    log.append(f"  Row {idx} | S.No {sno} | quantity_ml = 0 → kept as 0 (SDP rule)")
            except ValueError:
                quantity_ml = None
                log.append(f"  Row {idx} | S.No {sno} | quantity_ml unparseable: {qty_raw!r} → None")

        # ── SDP FFP missing quantity → fill 0 ────────────────────────────
        if quantity_ml is None and unit_no == "SDP" and component == "FFP":
            quantity_ml = 0.0
            log.append(f"  Row {idx} | S.No {sno} | SDP FFP qty missing → filled 0")

        # ── blood group ───────────────────────────────────────────────────
        blood_group = str(r.get("Blood Group", "")).strip()
        if blood_group not in VALID_BLOOD_GROUPS:
            if blood_group == "":
                log.append(f"  Row {idx} | S.No {sno} | blood_group MISSING → flagging row as INCOMPLETE")
            else:
                log.append(f"  Row {idx} | S.No {sno} | invalid blood_group {blood_group!r} → flagging")
            blood_group = ""  # will trigger flag below

        # ── screening results ─────────────────────────────────────────────
        hiv    = str(r.get("HIV 1&2", "")).strip()
        hbsag  = str(r.get("HBsAg",  "")).strip()
        hcv    = str(r.get("HCV",    "")).strip()
        malaria= str(r.get("Malaria","")).strip()
        vdrl   = str(r.get("VDRL",   "")).strip()

        # ── unit_id ───────────────────────────────────────────────────────
        unit_id = make_unit_id(sno, component, segment_no)

        # ── determine flag status ──────────────────────────────────────────
        is_incomplete = (blood_group == "" or quantity_ml is None)
        flag = "INCOMPLETE" if is_incomplete else ""

        record = {
            "unit_id":         unit_id,
            "sno":             sno,
            "unit_no":         unit_no,
            "segment_no":      segment_no,
            "blood_group":     blood_group,
            "component":       component,
            "quantity_ml":     "" if quantity_ml is None else quantity_ml,
            "collection_date": collection_date.isoformat() if collection_date else "",
            "collection_time": collection_time,
            "expiry_date":     expiry_date.isoformat() if expiry_date else "",
            "status":          "available" if not is_incomplete else "flagged",
            "hiv":    hiv,
            "hbsag":  hbsag,
            "hcv":    hcv,
            "malaria":malaria,
            "vdrl":   vdrl,
            "notes":  notes,
            "flag":   flag,
        }

        if is_incomplete:
            flagged_records.append(record)
        else:
            valid_records.append(record)

    # ── write outputs ─────────────────────────────────────────────────────────

    with open(OUT_CLEAN, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(valid_records)

    with open(OUT_FLAGGED, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        writer.writerows(flagged_records)

    # ── verification summary ───────────────────────────────────────────────────
    from collections import Counter
    group_counts = Counter(r["blood_group"] for r in valid_records)
    comp_counts  = Counter(r["component"]   for r in valid_records)

    log.append("\n" + "="*60)
    log.append("VERIFICATION SUMMARY")
    log.append("="*60)
    log.append(f"  Total raw rows       : {len(raw_rows)}")
    log.append(f"  Valid records        : {len(valid_records)}")
    log.append(f"  Flagged (incomplete) : {len(flagged_records)}")
    log.append("")
    log.append("  Blood group distribution:")
    for bg in sorted(VALID_BLOOD_GROUPS):
        log.append(f"    {bg:8s}: {group_counts.get(bg, 0)}")
    log.append("")
    log.append("  Component distribution:")
    for comp, cnt in sorted(comp_counts.items()):
        log.append(f"    {comp:8s}: {cnt}")
    log.append("")
    log.append("  Time normalization check (sample):")
    for r in valid_records[:5]:
        log.append(f"    S.No {r['sno']} | {r['component']} | time={r['collection_time']}")
    log.append("")
    log.append("  Expiry date sample:")
    for r in valid_records[:5]:
        log.append(f"    unit_id={r['unit_id']} | expiry={r['expiry_date']}")
    log.append("")
    log.append("  Flagged records:")
    for r in flagged_records:
        log.append(f"    unit_id={r['unit_id']} | blood_group={r['blood_group']!r} | qty={r['quantity_ml']!r} | notes={r['notes']!r}")

    report_text = "\n".join(log)
    with open(OUT_REPORT, "w") as f:
        f.write(report_text)

    print(report_text)
    print(f"\nOutputs written:")
    print(f"  {OUT_CLEAN}    ({len(valid_records)} records)")
    print(f"  {OUT_FLAGGED}   ({len(flagged_records)} records)")
    print(f"  {OUT_REPORT}")


if __name__ == "__main__":
    run()
