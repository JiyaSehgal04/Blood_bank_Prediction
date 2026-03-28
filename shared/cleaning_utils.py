"""
shared/cleaning_utils.py
Reusable cleaning functions used by:
  - step1_data_cleaning/clean_data.py
  - ingest/ingest_file.py
  - api/routes/inventory.py
"""

import re
from datetime import datetime, date, timedelta

VALID_BLOOD_GROUPS = {
    "O Pos", "O Neg", "A Pos", "A Neg",
    "B Pos", "B Neg", "AB Pos", "AB Neg"
}

# Normalise shorthand / alternate spellings → canonical form
BLOOD_GROUP_ALIASES = {
    "O+": "O Pos", "O-": "O Neg",
    "A+": "A Pos", "A-": "A Neg",
    "B+": "B Pos", "B-": "B Neg",
    "AB+": "AB Pos", "AB-": "AB Neg",
    "O POSITIVE": "O Pos", "O NEGATIVE": "O Neg",
    "A POSITIVE": "A Pos", "A NEGATIVE": "A Neg",
    "B POSITIVE": "B Pos", "B NEGATIVE": "B Neg",
    "AB POSITIVE": "AB Pos", "AB NEGATIVE": "AB Neg",
}

# Normalise screening result variants → "Neg" / "Pos"
SCREENING_ALIASES = {
    "NEGATIVE": "Neg", "NEG": "Neg", "N": "Neg", "-": "Neg",
    "POSITIVE": "Pos", "POS": "Pos", "P": "Pos", "+": "Pos",
    "REACTIVE": "Pos", "NON-REACTIVE": "Neg", "NR": "Neg", "R": "Pos",
}

SHELF_LIFE_DAYS = {
    "WB/PRC": 42,
    "FFP":    365,
    "PLT":    5,
    "Cryo":   365,
}

DATA_SOURCES = ["manual", "excel_upload", "bulk_load"]

OUTPUT_FIELDS = [
    "unit_id", "sno", "unit_no", "segment_no",
    "blood_group", "component",
    "quantity_ml", "collection_date", "collection_time",
    "expiry_date", "status",
    "hiv", "hbsag", "hcv", "malaria", "vdrl",
    "notes", "flag", "source", "upload_batch_id"
]


def normalize_blood_group(raw: str) -> str:
    """Canonical blood group from any shorthand or variant spelling."""
    v = raw.strip().upper()
    if v in BLOOD_GROUP_ALIASES:
        return BLOOD_GROUP_ALIASES[v]
    # Check already-canonical (case-insensitive)
    for canonical in VALID_BLOOD_GROUPS:
        if canonical.upper() == v:
            return canonical
    return raw.strip()  # return original if unrecognised (will be flagged later)


def normalize_screening(raw: str) -> str:
    """Canonical Neg/Pos from any variant."""
    v = str(raw).strip().upper()
    return SCREENING_ALIASES.get(v, raw.strip())


def normalize_time(raw: str) -> str:
    """Convert 12-hour time (any casing) to 24-hour HH:MM. Returns 'Unknown' for blanks."""
    raw = str(raw).strip()
    if not raw or raw.lower() == "none":
        return "Unknown"
    raw_upper = raw.upper().replace(".", "").strip()
    for fmt in ("%I:%M %p", "%I:%M%p"):
        try:
            return datetime.strptime(raw_upper, fmt).strftime("%H:%M")
        except ValueError:
            pass
    if re.match(r"^\d{2}:\d{2}$", raw_upper):
        return raw_upper
    return "Unknown"


def parse_date(raw: str) -> date:
    """Parse DD/MM/YYYY to Python date."""
    return datetime.strptime(str(raw).strip(), "%d/%m/%Y").date()


def make_unit_id(sno: str, component: str, segment_no: str) -> str:
    """Generate unique unit_id: {sno}-{component}-{segment_no}."""
    seg  = (segment_no or "NA").replace(" ", "_")
    comp = component.replace("/", "_")
    return f"{sno}-{comp}-{seg}"


def compute_expiry(collection_date: date, component: str) -> date:
    """Compute expiry date from shelf life."""
    return collection_date + timedelta(days=SHELF_LIFE_DAYS.get(component, 42))


def clean_raw_rows(headers: list, raw_rows: list,
                   source: str = "excel_upload",
                   upload_batch_id: str = "") -> tuple:
    """
    Clean a list of raw row dicts (header→value).
    Returns (valid_records, flagged_records, log_lines).
    Each record is a dict matching OUTPUT_FIELDS.
    """
    log = []
    valid_records = []
    flagged_records = []

    for idx, row_values in enumerate(raw_rows, start=2):
        r = dict(zip(headers, row_values))

        # S.No
        sno_raw = str(r.get("S.No", "")).strip()
        try:
            sno = str(int(float(sno_raw)))
        except (ValueError, TypeError):
            sno = sno_raw

        unit_no    = str(r.get("Unit No", "")).strip()
        component  = str(r.get("Component", "")).strip()
        notes      = str(r.get("Notes", "")).strip()

        # Segment No
        segment_no = str(r.get("Segment No", "")).strip()
        if not segment_no or segment_no.lower() == "none":
            log.append(f"Row {idx} | S.No {sno} | segment_no missing → 'N/A'")
            segment_no = "N/A"

        # Collection date
        coll_raw = str(r.get("Collection Date", "")).strip()
        try:
            collection_date = parse_date(coll_raw)
        except Exception:
            collection_date = None
            log.append(f"Row {idx} | S.No {sno} | unparseable collection_date: {coll_raw!r}")

        # Collection time
        time_raw        = str(r.get("Collection Time", "")).strip()
        collection_time = normalize_time(time_raw)
        if collection_time == "Unknown":
            log.append(f"Row {idx} | S.No {sno} | collection_time unknown (was {time_raw!r})")

        # Expiry date
        exp_raw = str(r.get("Expiry Date", "")).strip()
        try:
            expiry_date = parse_date(exp_raw)
        except Exception:
            expiry_date = compute_expiry(collection_date, component) if collection_date else None
            log.append(f"Row {idx} | S.No {sno} | expiry_date missing → computed: {expiry_date}")

        # Quantity
        qty_raw = str(r.get("Quantity (ml)", "")).strip()
        quantity_ml = None
        if qty_raw and qty_raw.lower() != "none":
            try:
                quantity_ml = float(qty_raw)
            except ValueError:
                log.append(f"Row {idx} | S.No {sno} | unparseable quantity: {qty_raw!r}")

        # SDP FFP missing qty → fill 0
        if quantity_ml is None and unit_no == "SDP" and component == "FFP":
            quantity_ml = 0.0
            log.append(f"Row {idx} | S.No {sno} | SDP FFP qty missing → filled 0")

        # Blood group — normalise aliases first, then validate
        blood_group_raw = str(r.get("Blood Group", "")).strip()
        blood_group     = normalize_blood_group(blood_group_raw)
        if blood_group not in VALID_BLOOD_GROUPS:
            if blood_group_raw != blood_group:
                log.append(f"Row {idx} | S.No {sno} | blood_group {blood_group_raw!r} → unrecognised → flagging")
            else:
                log.append(f"Row {idx} | S.No {sno} | blood_group missing/invalid {blood_group!r} → flagging")
            blood_group = ""
        elif blood_group != blood_group_raw and blood_group_raw:
            log.append(f"Row {idx} | S.No {sno} | blood_group normalised {blood_group_raw!r} → {blood_group!r}")

        # Screening — normalise variants ("Negative" → "Neg", "Reactive" → "Pos", etc.)
        hiv    = normalize_screening(r.get("HIV 1&2", ""))
        hbsag  = normalize_screening(r.get("HBsAg",  ""))
        hcv    = normalize_screening(r.get("HCV",    ""))
        malaria= normalize_screening(r.get("Malaria",""))
        vdrl   = normalize_screening(r.get("VDRL",   ""))

        unit_id = make_unit_id(sno, component, segment_no)

        is_incomplete = blood_group == "" or quantity_ml is None
        flag   = "INCOMPLETE" if is_incomplete else ""
        status = "flagged" if is_incomplete else "available"

        record = {
            "unit_id":         unit_id,
            "sno":             sno,
            "unit_no":         unit_no,
            "segment_no":      segment_no,
            "blood_group":     blood_group,
            "component":       component,
            "quantity_ml":     None if quantity_ml is None else quantity_ml,
            "collection_date": collection_date.isoformat() if collection_date else None,
            "collection_time": collection_time,
            "expiry_date":     expiry_date.isoformat() if expiry_date else None,
            "status":          status,
            "hiv":    hiv,
            "hbsag":  hbsag,
            "hcv":    hcv,
            "malaria":malaria,
            "vdrl":   vdrl,
            "notes":  notes,
            "flag":   flag,
            "source":          source,
            "upload_batch_id": upload_batch_id,
        }

        if is_incomplete:
            flagged_records.append(record)
        else:
            valid_records.append(record)

    return valid_records, flagged_records, log
