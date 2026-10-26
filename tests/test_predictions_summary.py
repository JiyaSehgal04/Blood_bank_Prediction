import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from unittest.mock import patch, MagicMock
from api.app import create_app


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def auth_header(client):
    res = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "bloodbank2026"},
    )
    return {"Authorization": f"Bearer {res.get_json()['token']}"}


def test_summary_returns_503_when_no_api_key(client):
    with patch.dict("os.environ", {"GROQ_API_KEY": ""}):
        res = client.get("/api/predictions/summary", headers=auth_header(client))
    assert res.status_code == 503
    assert b"error" in res.data


def test_summary_returns_200_with_mocked_groq(client):
    mock_choice = MagicMock()
    mock_choice.message.content = "O Pos demand is elevated this week."
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    def make_table_mock(name):
        m = MagicMock()
        if name == "predictions":
            m.select.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(data=[{
                "blood_group": "O Pos", "component": "WB/PRC",
                "predicted_demand": 12.5, "confidence_low": 10.0,
                "confidence_high": 15.0, "model_used": "xgb"
            }])
        else:
            m.select.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(data=[])
        m.select.return_value.eq.return_value.in_.return_value.limit.return_value.execute.return_value = MagicMock(data=[])
        return m

    mock_supabase = MagicMock()
    mock_supabase.table.side_effect = make_table_mock

    with patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}), \
         patch("api.routes.predictions.get_client", return_value=mock_supabase), \
         patch("ml.scripts.predict.MLPredictor", create=True), \
         patch("api.routes.predictions.Groq") as mock_groq_cls:
        mock_groq_cls.return_value.chat.completions.create.return_value = mock_response
        res = client.get("/api/predictions/summary", headers=auth_header(client))

    assert res.status_code == 200
    data = res.get_json()
    assert "summary" in data
    assert len(data["summary"]) > 0


def test_summary_returns_503_on_groq_error(client):
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value \
        .order.return_value.limit.return_value.execute.return_value \
        = MagicMock(data=[])
    mock_supabase.table.return_value.select.return_value \
        .eq.return_value.in_.return_value.limit.return_value.execute.return_value \
        = MagicMock(data=[])

    with patch("api.routes.predictions._SUMMARY_CACHE", {}), \
         patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}), \
         patch("api.routes.predictions.get_client", return_value=mock_supabase), \
         patch("api.routes.predictions.Groq", side_effect=Exception("network error")):
        res = client.get("/api/predictions/summary", headers=auth_header(client))

    assert res.status_code == 503


def test_replenishment_returns_empty_plan_when_ml_unavailable(client):
    with patch("ml.scripts.predict.MLPredictor") as mock_predictor:
        mock_predictor.side_effect = RuntimeError("supabase unavailable")

        res = client.get("/api/replenishment", headers=auth_header(client))

    assert res.status_code == 200
    data = res.get_json()
    assert data["replenishment"] == []
    assert data["count"] == 0
    assert "warning" in data


def _summary_response(content, finish_reason="stop"):
    choice = MagicMock()
    choice.message.content = content
    choice.finish_reason = finish_reason
    response = MagicMock()
    response.choices = [choice]
    return response


def _call_summary(client, response):
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.order.return_value.limit.return_value \
        .eq.return_value.execute.return_value = MagicMock(data=[])
    mock_supabase.table.return_value.select.return_value.order.return_value.limit.return_value \
        .execute.return_value = MagicMock(data=[])
    mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value \
        .limit.return_value.execute.return_value = MagicMock(data=[])
    mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value \
        .limit.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

    with patch("api.routes.predictions._SUMMARY_CACHE", {}) as cache, \
         patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}), \
         patch("api.routes.predictions.get_client", return_value=mock_supabase), \
         patch("api.routes.predictions._REPLENISHMENT") as repl, \
         patch("api.routes.predictions.Groq") as groq_cls:
        repl.get.return_value = []
        create = groq_cls.return_value.chat.completions.create
        create.return_value = response
        res = client.get("/api/predictions/summary?component=PLT", headers=auth_header(client))
        return res, cache, create


def test_summary_rejects_empty_answer_and_does_not_cache_it(client):
    res, cache, _ = _call_summary(client, _summary_response(""))

    assert res.status_code == 503
    assert cache == {}


def test_summary_rejects_answer_cut_off_by_token_limit(client):
    res, cache, _ = _call_summary(client, _summary_response("AB Negative is out of", finish_reason="length"))

    assert res.status_code == 503
    assert cache == {}


def test_summary_leaves_room_for_reasoning_tokens(client):
    res, cache, create = _call_summary(client, _summary_response("All stock levels are healthy."))

    assert res.status_code == 200
    assert create.call_args.kwargs["max_tokens"] >= 1000
    assert cache["PLT"]["summary"] == "All stock levels are healthy."
