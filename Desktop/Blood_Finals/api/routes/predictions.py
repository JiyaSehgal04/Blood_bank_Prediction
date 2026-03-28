"""
api/routes/predictions.py
GET  /api/predictions          — latest forecasts per blood group
GET  /api/predictions/seasonal — seasonal decomposition report
GET  /api/predictions/anomalies — flagged anomaly days
GET  /api/replenishment        — recommended order quantities

ML models (Steps 12-16) are built in a later phase.
These routes return stored predictions from the `predictions` table,
or a stub response when no model has run yet.
"""

import sys
from pathlib import Path
from flask import Blueprint, request, jsonify

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from db.supabase_client import get_client

predictions_bp = Blueprint("predictions", __name__, url_prefix="/api")


@predictions_bp.route("/predictions", methods=["GET"])
def get_predictions():
    """Latest demand forecast per blood group."""
    client = get_client()
    blood_group = request.args.get("blood_group")
    q = (client.table("predictions").select("*")
         .order("prediction_date", desc=True).limit(100))
    if blood_group:
        q = q.eq("blood_group", blood_group)
    result = q.execute()

    if not result.data:
        return jsonify({
            "predictions": [],
            "message": "No predictions yet. Upload data to generate predictions automatically.",
            "model_status": "not_trained"
        }), 200

    return jsonify({"predictions": result.data, "count": len(result.data)}), 200


@predictions_bp.route("/predictions/seasonal", methods=["GET"])
def seasonal_report():
    """Seasonal decomposition data from daily_summary."""
    client   = get_client()
    result   = (client.table("daily_summary").select("*")
                .order("summary_date").execute())
    rows     = result.data or []

    if len(rows) < 14:
        return jsonify({
            "message": f"Only {len(rows)} days of data. Need 14+ days for seasonal analysis.",
            "days_available": len(rows)
        }), 200

    return jsonify({
        "summary_rows": rows,
        "days_covered": len({r["summary_date"] for r in rows}),
        "message": "Use ml/scripts/seasonal.py to run full decomposition."
    }), 200


@predictions_bp.route("/predictions/anomalies", methods=["GET"])
def get_anomalies():
    """Days flagged as anomalous by Isolation Forest."""
    component = request.args.get("component", "WB/PRC")
    try:
        from ml.scripts.predict import MLPredictor
        predictor  = MLPredictor()
        anomalies  = predictor.detect_anomalies(component)
        return jsonify({"anomalies": anomalies, "count": len(anomalies),
                        "component": component}), 200
    except Exception as e:
        return jsonify({"error": str(e), "anomalies": []}), 200


@predictions_bp.route("/replenishment", methods=["GET"])
def replenishment():
    """ML-powered replenishment recommendations."""
    try:
        from ml.scripts.predict import MLPredictor
        plan = MLPredictor().replenishment_plan()
        return jsonify({"replenishment": plan, "count": len(plan)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def _get_summary_count() -> int:
    try:
        result = get_client().table("daily_summary").select("id", count="exact").execute()
        return result.count or 0
    except Exception:
        return 0
