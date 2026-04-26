"""
api/routes/predictions.py
GET  /api/predictions          — latest forecasts per blood group
GET  /api/predictions/seasonal — seasonal decomposition report
GET  /api/predictions/anomalies — flagged anomaly days
GET  /api/replenishment        — recommended order quantities

Predictions are auto-generated after each upload.
"""

import os
import sys
from pathlib import Path
from flask import Blueprint, request, jsonify
from groq import Groq

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


@predictions_bp.route("/predictions/run", methods=["POST"])
def run_predictions():
    """Manually trigger prediction generation."""
    try:
        from ml.scripts.predict import MLPredictor
        predictor = MLPredictor()
        all_preds = predictor.predict_all()
        predictor.run_ml_alerts(predictions=all_preds)
        total = sum(len(p) for p in all_preds.values())
        return jsonify({"predictions_generated": total, "status": "ok"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
        return jsonify({
            "replenishment": [],
            "count": 0,
            "warning": f"Replenishment unavailable: {e}",
        }), 200


def _get_summary_count() -> int:
    try:
        result = get_client().table("daily_summary").select("id", count="exact").execute()
        return result.count or 0
    except Exception:
        return 0


def _sanitize(value: str, max_len: int = 100) -> str:
    return str(value).replace("\n", " ").replace("\r", "")[:max_len]


_COMPONENT_NAMES = {
    "WB/PRC": "Whole Blood / Packed Red Blood Cells (WB/PRC)",
    "FFP":    "Fresh Frozen Plasma (FFP)",
    "PLT":    "Platelets (PLT)",
}


@predictions_bp.route("/predictions/summary", methods=["GET"])
def predictions_summary():
    """AI-generated plain-English summary of current forecast data."""
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return jsonify({"error": "Summary unavailable"}), 503

    component = request.args.get("component", "")
    component_label = _COMPONENT_NAMES.get(component, component or "all components")

    client_db = get_client()

    q = (
        client_db.table("predictions")
        .select("blood_group,component,predicted_demand,confidence_low,confidence_high,model_used")
        .order("prediction_date", desc=True)
        .limit(100)
    )
    if component:
        q = q.eq("component", component)
    try:
        preds = (q.execute().data or [])
    except Exception:
        preds = []

    replenishment = []
    try:
        from ml.scripts.predict import MLPredictor
        full_plan = MLPredictor().replenishment_plan()
        replenishment = [r for r in full_plan if not component or r.get("component") == component]
    except Exception:
        pass

    alerts_q = (
        client_db.table("alerts")
        .select("severity,message,blood_group,component")
        .eq("is_resolved", False)
        .in_("severity", ["HIGH", "CRITICAL"])
        .limit(20)
    )
    if component:
        alerts_q = alerts_q.eq("component", component)
    try:
        alerts = (alerts_q.execute().data or [])
    except Exception:
        alerts = []

    if not preds:
        prompt_data = (
            f"No forecast data is available yet for {component_label}. "
            "The system has not been trained."
        )
    else:
        lines = [f"FORECAST DATA FOR {component_label.upper()}:"]
        for p in preds[:24]:
            lines.append(
                f"  {_sanitize(p['blood_group'])}: "
                f"predicted demand = {p['predicted_demand']:.1f} units, "
                f"range {p.get('confidence_low', 0):.1f}–{p.get('confidence_high', 0):.1f} units"
            )
        if replenishment:
            lines.append("\nORDER RECOMMENDATIONS:")
            for r in replenishment[:8]:
                if r.get("recommended_order", 0) > 0:
                    lines.append(
                        f"  {_sanitize(r['blood_group'])}: "
                        f"current stock {r.get('current_stock', 0)} units, "
                        f"order {r['recommended_order']} units "
                        f"({_sanitize(r.get('urgency', 'UNKNOWN'))} priority)"
                    )
        if alerts:
            lines.append("\nACTIVE ALERTS:")
            for a in alerts[:5]:
                lines.append(
                    f"  [{_sanitize(a['severity'])}] "
                    f"{_sanitize(a.get('blood_group', ''))}: "
                    f"{_sanitize(a.get('message', ''), max_len=200)}"
                )
        prompt_data = "\n".join(lines)

    try:
        groq_client = Groq(api_key=api_key)
        response = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a clinical decision support assistant in a hospital blood bank. "
                        "Your job is to help doctors and clinical staff quickly understand blood inventory status. "
                        "Write in plain, simple English — avoid technical jargon. "
                        "Be direct and actionable: tell them what needs attention right now and what they should do. "
                        "Use full blood group names (e.g. 'O Positive' not 'O Pos'). "
                        "Keep it to 3-4 sentences. No bullet points."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Here is the current blood bank data for {component_label}:\n\n"
                        f"{prompt_data}\n\n"
                        "Give a brief, clear summary for the clinical team — "
                        "what is the overall situation, what blood types need attention, "
                        "and what actions should be taken today?"
                    ),
                },
            ],
            model="llama-3.3-70b-versatile",
            max_tokens=300,
        )
        if not response.choices:
            return jsonify({"error": "Summary unavailable"}), 503
        summary = response.choices[0].message.content
        return jsonify({"summary": summary, "component": component}), 200
    except Exception:
        return jsonify({"error": "Summary unavailable"}), 503
