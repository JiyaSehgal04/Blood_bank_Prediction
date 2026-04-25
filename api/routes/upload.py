"""
api/routes/upload.py
POST /api/upload          — upload new Excel/CSV register file, clean, insert
GET  /api/upload/history  — list all upload batches
POST /api/upload/bulk-load — re-run bulk load from cleaned_records.csv
"""

import os
import sys
import tempfile
from pathlib import Path
from datetime import datetime
from flask import Blueprint, request, jsonify

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from shared.cleaning_utils import clean_raw_rows
from db.supabase_client    import get_client
from services.summary_service import SummaryService

upload_bp    = Blueprint("upload", __name__, url_prefix="/api")
TABLE        = "blood_inventory"
HISTORY_TABLE= "upload_history"
BATCH_SIZE   = 50
ALLOWED_EXT  = {".csv", ".xlsx"}
ALLOWED_EXT_LABEL = ", ".join(sorted(ALLOWED_EXT))


# ── file readers ──────────────────────────────────────────────────────────────

def _read_xlsx(path: str):
    """Read Excel .xlsx file via openpyxl."""
    import openpyxl
    wb    = openpyxl.load_workbook(path, data_only=True)
    ws    = wb.active
    rows  = list(ws.iter_rows(values_only=True))
    if not rows:
        raise ValueError("Empty workbook")
    headers  = [str(c) if c is not None else "" for c in rows[0]]
    raw_rows = [
        [c if c is not None else "" for c in row]
        for row in rows[1:]
        if any(c is not None for c in row)   # skip blank rows
    ]
    return headers, raw_rows


def _read_csv(path: str):
    """Read CSV file — preserves header order for clean_raw_rows()."""
    import csv
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader   = csv.DictReader(f)
        headers  = list(reader.fieldnames or [])
        raw_rows = [list(row.values()) for row in reader]
    return headers, raw_rows


def _parse_file(tmp_path: str, ext: str):
    """Dispatch to the correct reader based on extension."""
    if ext == ".csv":
        return _read_csv(tmp_path)
    return _read_xlsx(tmp_path)


# ── db helpers ────────────────────────────────────────────────────────────────

def _upsert(client, records: list, batch_id: str) -> tuple:
    for r in records:
        r["upload_batch_id"] = batch_id
    inserted = errors = 0
    for i in range(0, len(records), BATCH_SIZE):
        try:
            result = (client.table(TABLE)
                      .upsert(records[i:i + BATCH_SIZE],
                              on_conflict="sno,segment_no,component",
                              ignore_duplicates=True)
                      .execute())
            inserted += len(result.data or [])
        except Exception as e:
            print(f"  Upsert error batch {i}: {e}")
            errors += len(records[i:i + BATCH_SIZE])
    return inserted, errors


def _log_history(client, batch_id, filename, source, total, inserted, flagged, errors):
    dupes = max(0, total - flagged - inserted - errors)
    try:
        client.table(HISTORY_TABLE).upsert({
            "batch_id":   batch_id,
            "filename":   filename,
            "source":     source,
            "total_rows": total,
            "inserted":   inserted,
            "duplicates": dupes,
            "flagged":    flagged,
            "errors":     errors,
        }, on_conflict="batch_id").execute()
    except Exception as e:
        print(f"  Warning: upload_history log failed: {e}")


def _run_post_upload_predictions() -> dict:
    """Run ML predictions + alerts after successful upload. Non-fatal."""
    try:
        from ml.scripts.predict import MLPredictor
        predictor = MLPredictor()
        all_preds = predictor.predict_all()
        predictor.run_ml_alerts()
        total = sum(len(p) for p in all_preds.values())
        return {
            "predictions_generated": total,
            "prediction_warnings": list(getattr(predictor, "store_errors", [])),
        }
    except Exception as e:
        warning = f"post-upload predictions failed: {e}"
        print(f"  Warning: {warning}")
        return {"predictions_generated": 0, "prediction_warnings": [warning]}


def _run_summary_backfill() -> dict:
    try:
        return {"summary_rows_upserted": SummaryService().backfill_from_inventory()}
    except Exception as e:
        warning = f"summary backfill failed: {e}"
        print(f"  Warning: {warning}")
        return {"summary_rows_upserted": 0, "summary_warnings": [warning]}


# ── routes ────────────────────────────────────────────────────────────────────

@upload_bp.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file field in request"}), 400

    f    = request.files["file"]
    name = (f.filename or "upload").strip()
    ext  = Path(name).suffix.lower()

    if ext not in ALLOWED_EXT:
        return jsonify({
            "error": f"Unsupported file type '{ext}'. Allowed: {ALLOWED_EXT_LABEL}"
        }), 400

    # Save to temp file preserving original extension
    tmp_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    tmp = tmp_file.name
    tmp_file.close()
    try:
        f.save(tmp)

        try:
            headers, raw_rows = _parse_file(tmp, ext)
        except Exception as e:
            return jsonify({"error": f"Could not read file: {e}"}), 422
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)

        if not raw_rows:
            return jsonify({"error": "File is empty or has no data rows"}), 422

        batch_id = f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        valid, flagged, log = clean_raw_rows(
            headers, raw_rows,
            source="excel_upload",
            upload_batch_id=batch_id,
        )

        client = get_client()
        inserted, errors = _upsert(client, valid, batch_id)
        _log_history(client, batch_id, name, "excel_upload",
                     len(raw_rows), inserted, len(flagged), errors)

        summary_result = _run_summary_backfill()
        pred_result = _run_post_upload_predictions()
        warnings = (
            summary_result.get("summary_warnings", [])
            + pred_result.get("prediction_warnings", [])
        )

        return jsonify({
            "batch_id":        batch_id,
            "total_rows":      len(raw_rows),
            "inserted":        inserted,
            "duplicates":      max(0, len(valid) - inserted - errors),
            "flagged":         len(flagged),
            "errors":          errors,
            "summary_rows_upserted": summary_result.get("summary_rows_upserted", 0),
            "predictions_generated": pred_result.get("predictions_generated", 0),
            "warnings":        warnings,
            "message":         f"Processed {len(raw_rows)} rows: {inserted} inserted, "
                               f"{max(0, len(valid)-inserted-errors)} duplicates, "
                               f"{len(flagged)} flagged",
        }), 200

    except Exception as e:
        if os.path.exists(tmp):
            os.unlink(tmp)
        return jsonify({"error": str(e)}), 500


@upload_bp.route("/upload/history", methods=["GET"])
def upload_history():
    client = get_client()
    result = (client.table(HISTORY_TABLE)
              .select("*").order("uploaded_at", desc=True)
              .limit(50).execute())
    return jsonify({"history": result.data, "count": len(result.data)}), 200


@upload_bp.route("/upload/bulk-load", methods=["POST"])
def bulk_load():
    """Re-run bulk load from cleaned_records.csv."""
    from db.initial_load import load_csv, upsert_batch, log_upload_history, DEFAULT_CSV
    try:
        if not DEFAULT_CSV.exists():
            return jsonify({"error": f"cleaned_records.csv not found at {DEFAULT_CSV}"}), 404

        batch_id = f"bulk_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        records  = load_csv(DEFAULT_CSV)
        for r in records:
            r["upload_batch_id"] = batch_id

        valid   = [r for r in records if r.get("flag", "") != "INCOMPLETE"]
        flagged = [r for r in records if r.get("flag", "") == "INCOMPLETE"]

        client = get_client()
        total_inserted = total_errors = 0
        for i in range(0, len(valid), BATCH_SIZE):
            ins, err = upsert_batch(client, valid[i:i + BATCH_SIZE])
            total_inserted += ins
            total_errors   += err

        duplicates = max(0, len(valid) - total_inserted - total_errors)
        log_upload_history(client, batch_id, DEFAULT_CSV.name,
                           len(records), total_inserted,
                           duplicates, len(flagged), total_errors)

        summary_result = _run_summary_backfill()
        pred_result = _run_post_upload_predictions()
        warnings = (
            summary_result.get("summary_warnings", [])
            + pred_result.get("prediction_warnings", [])
        )

        return jsonify({
            "message":    "Bulk load complete",
            "batch_id":   batch_id,
            "total_rows": len(records),
            "inserted":   total_inserted,
            "duplicates": duplicates,
            "flagged":    len(flagged),
            "errors":     total_errors,
            "summary_rows_upserted": summary_result.get("summary_rows_upserted", 0),
            "predictions_generated": pred_result.get("predictions_generated", 0),
            "warnings":    warnings,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
