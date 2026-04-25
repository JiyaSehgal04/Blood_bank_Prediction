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


def test_summary_returns_503_when_no_api_key(client):
    with patch.dict("os.environ", {"GROQ_API_KEY": ""}):
        res = client.get("/api/predictions/summary")
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
        res = client.get("/api/predictions/summary")

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

    with patch.dict("os.environ", {"GROQ_API_KEY": "test-key"}), \
         patch("api.routes.predictions.get_client", return_value=mock_supabase), \
         patch("api.routes.predictions.Groq", side_effect=Exception("network error")):
        res = client.get("/api/predictions/summary")

    assert res.status_code == 503
