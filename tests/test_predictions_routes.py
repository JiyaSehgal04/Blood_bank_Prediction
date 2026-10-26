import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from api.app import create_app
from ml.scripts.forecast_engine import MODEL_NAME

LEGACY = {"blood_group": "O Pos", "component": "WB/PRC", "predicted_demand": 6.5,
          "confidence_low": 5.5, "confidence_high": 7.5, "model_used": "ensemble_xgb_ses",
          "prediction_date": "2026-10-26"}
CURRENT = {**LEGACY, "model_used": MODEL_NAME, "predicted_demand": 2.1}


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def _auth(client):
    token = client.post("/api/auth/login", json={"username": "admin", "password": "bloodbank2026"}).get_json()["token"]
    return {"Authorization": f"Bearer {token}"}


def _db(rows):
    db = MagicMock()
    db.table.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(data=rows)
    return db


STATUS = {"WB/PRC": {"status": "insufficient_data", "reason": "Only 1 units were issued in the last 90 days."}}


def test_predictions_hide_rows_from_the_retired_model(client):
    with patch("api.routes.predictions.get_client", return_value=_db([LEGACY, CURRENT])):
        body = client.get("/api/predictions", headers=_auth(client)).get_json()

    assert [p["model_used"] for p in body["predictions"]] == [MODEL_NAME]


def test_predictions_explain_when_only_retired_rows_exist(client):
    status = SimpleNamespace(get=lambda: STATUS, invalidate=lambda: None)
    with patch("api.routes.predictions.get_client", return_value=_db([LEGACY])), \
         patch("api.routes.predictions._FORECAST_STATUS", status):
        body = client.get("/api/predictions", headers=_auth(client)).get_json()

    assert body["predictions"] == []
    assert body["model_status"] == "insufficient_data"
    assert body["data_status"]["WB/PRC"]["reason"].startswith("Only 1 units")


def test_status_endpoint_reports_per_component_history(client):
    status = SimpleNamespace(get=lambda: STATUS, invalidate=lambda: None)
    with patch("api.routes.predictions._FORECAST_STATUS", status):
        body = client.get("/api/predictions/status", headers=_auth(client)).get_json()

    assert body["components"]["WB/PRC"]["status"] == "insufficient_data"


# ── the AI is handed computed stock facts instead of being left to read the table ──

def test_stock_facts_state_zero_and_nonzero_groups_exactly():
    from api.routes.predictions import _stock_facts

    plan = [
        {"blood_group": "O Neg", "current_stock": 0, "recommended_order": 5},
        {"blood_group": "A Pos", "current_stock": 3, "recommended_order": 2},
        {"blood_group": "B Pos", "current_stock": 0, "recommended_order": 5},
    ]

    facts = _stock_facts(plan, "WB/PRC")

    assert "O Neg: 0" in facts and "B Pos: 0" in facts and "A Pos: 3" in facts
    assert "2 of 3 listed blood groups have no in-date units" in facts
    assert "Total in-date units listed: 3" in facts


def test_stock_facts_handle_an_empty_plan():
    from api.routes.predictions import _stock_facts

    assert "No stock information" in _stock_facts([], "PLT")
