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
import time
from pathlib import Path
from flask import Blueprint, request, jsonify
from groq import Groq
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from db.supabase_client import get_client
from services.replenishment_cache import ReplenishmentCache
from ml.scripts.forecast_engine import MODEL_NAME

predictions_bp = Blueprint("predictions", __name__, url_prefix="/api")

# (component -> {"summary": str, "expires_at": float})
_SUMMARY_CACHE: dict[str, dict] = {}
_SUMMARY_TTL_SECONDS = 600
_SUMMARY_MAX_TOKENS = 1200


def _compute_replenishment() -> list:
    from ml.scripts.predict import MLPredictor
    return MLPredictor().replenishment_plan()


# Building the plan takes ~20 s, so every caller shares one cached copy.
_REPLENISHMENT = ReplenishmentCache(compute=_compute_replenishment, ttl=600)


def _compute_forecast_status() -> dict:
    """Per component: can the recorded demand support a forecast, and if not, why not."""
    from datetime import date
    from ml.scripts.forecast_engine import forecast_component
    from ml.scripts.preprocess import FeaturePipeline

    summary = FeaturePipeline().fetch_daily_summary()
    status = {}
    for component in ("WB/PRC", "FFP", "PLT"):
        result = forecast_component(summary, component, date.today())
        info = result["assessment"]
        status[component] = {
            "status": result["status"],
            "reason": result["reason"],
            "units": info["units"],
            "active_days": info["active_days"],
            "window_days": info["window_days"],
            "last_demand_date": info["last_demand_date"],
        }
    return status


_FORECAST_STATUS = ReplenishmentCache(compute=_compute_forecast_status, ttl=600)


def invalidate_prediction_caches() -> None:
    """Call after predictions/stock change so the next read rebuilds fresh data."""
    _SUMMARY_CACHE.clear()
    _REPLENISHMENT.invalidate()
    _FORECAST_STATUS.invalidate()


def _forecast_status_safe() -> dict:
    try:
        return _FORECAST_STATUS.get() or {}
    except Exception:
        return {}


@predictions_bp.route("/predictions", methods=["GET"])
def get_predictions():
    """Latest demand forecast per blood group (current model only)."""
    client = get_client()
    blood_group = request.args.get("blood_group")
    q = (client.table("predictions").select("*")
         .order("prediction_date", desc=True).limit(100))
    if blood_group:
        q = q.eq("blood_group", blood_group)
    result = q.execute()

    # Rows from the retired XGBoost/SES ensemble were trained on near-empty data and are
    # not shown; they are left in the table rather than deleted.
    rows = [r for r in (result.data or []) if r.get("model_used") == MODEL_NAME]
    status = _forecast_status_safe()

    if not rows:
        return jsonify({
            "predictions": [],
            "message": "Forecasts are paused until enough demand (issued units) has been recorded.",
            "model_status": "insufficient_data" if status else "not_trained",
            "data_status": status,
        }), 200

    return jsonify({"predictions": rows, "count": len(rows), "data_status": status}), 200


@predictions_bp.route("/predictions/status", methods=["GET"])
def predictions_status():
    """Why a component is (or is not) being forecast."""
    return jsonify({"components": _forecast_status_safe()}), 200


@predictions_bp.route("/predictions/run", methods=["POST"])
def run_predictions():
    """Manually trigger prediction generation."""
    try:
        from ml.scripts.predict import MLPredictor
        predictor = MLPredictor()
        all_preds = predictor.predict_all()
        predictor.run_ml_alerts(predictions=all_preds)
        total = sum(len(p) for p in all_preds.values())
        invalidate_prediction_caches()
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
        plan = _REPLENISHMENT.get()
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

    cached = _SUMMARY_CACHE.get(component)
    if cached and cached["expires_at"] > time.time():
        return jsonify({"summary": cached["summary"], "component": component}), 200
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
        preds = [p for p in (q.execute().data or []) if p.get("model_used") == MODEL_NAME]
    except Exception:
        preds = []
    forecast_status = _forecast_status_safe().get(component) if component else None

    replenishment = []
    try:
        full_plan = _REPLENISHMENT.get()
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
        reason = (forecast_status or {}).get("reason") or "not enough demand has been recorded yet."
        lines = [
            f"FORECAST STATUS for {component_label}: forecasting is paused because {reason} "
            "Do not invent or estimate demand numbers. Describe only what the stock and alert "
            "data below show, and say that recording every issued unit is needed to enable forecasts."
        ]
    else:
        lines = [f"FORECAST DATA FOR {component_label.upper()}:"]
        for p in preds[:24]:
            lines.append(
                f"  {_sanitize(p['blood_group'])}: "
                f"predicted demand = {p['predicted_demand']:.1f} units/day, "
                f"range {p.get('confidence_low', 0):.1f}–{p.get('confidence_high', 0):.1f} units/day"
            )
    if replenishment:
        lines.append("\nORDER RECOMMENDATIONS (in-date stock only):")
        for r in replenishment[:8]:
            if r.get("recommended_order", 0) > 0:
                lines.append(
                    f"  {_sanitize(r['blood_group'])}: "
                    f"in-date stock {r.get('current_stock', 0)} units, "
                    f"order {r['recommended_order']} units "
                    f"({_sanitize(r.get('urgency', 'UNKNOWN'))} priority, "
                    f"basis: {_sanitize(r.get('basis', 'forecast'))})"
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
        groq_client = Groq(api_key=api_key, http_client=httpx.Client(http2=False, timeout=15.0))
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
            model="openai/gpt-oss-120b",
            # gpt-oss is a reasoning model: hidden reasoning tokens count against this limit,
            # so a small cap leaves the visible answer empty or cut off mid-sentence.
            max_tokens=_SUMMARY_MAX_TOKENS,
            extra_body={"reasoning_effort": "low"},
        )
        if not response.choices:
            return jsonify({"error": "Summary unavailable"}), 503
        choice = response.choices[0]
        summary = (choice.message.content or "").strip()
        if not summary or choice.finish_reason == "length":
            return jsonify({"error": "Summary unavailable"}), 503
        _SUMMARY_CACHE[component] = {"summary": summary, "expires_at": time.time() + _SUMMARY_TTL_SECONDS}
        return jsonify({"summary": summary, "component": component}), 200
    except Exception:
        return jsonify({"error": "Summary unavailable"}), 503
