import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from api.app import create_app
from api.routes.auth import _SESSIONS


def _auth_header(client):
    res = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "bloodbank2026"},
    )
    return {"Authorization": f"Bearer {res.get_json()['token']}"}


def test_allocate_route_honors_units_needed(monkeypatch):
    captured = {}

    class FakeService:
        def __init__(self, _inventory):
            pass

        def allocate_now(self, blood_group, component, units_needed, priority, request_id):
            captured["args"] = (blood_group, component, units_needed, priority, request_id)
            request = SimpleNamespace(request_id=request_id, units_needed=units_needed)
            unit = SimpleNamespace(to_dict=lambda: {"unit_id": "u1"})
            return SimpleNamespace(
                request=request,
                status="fulfilled",
                units_fulfilled=units_needed,
                allocated=[unit],
                used_compatible=False,
                notes="",
            )

    monkeypatch.setattr("api.routes.allocate._get_inventory", lambda: object())
    monkeypatch.setattr("api.routes.allocate.AllocationService", FakeService)

    _SESSIONS.clear()
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        res = client.post(
            "/api/allocate",
            json={
                "blood_group": "O Pos",
                "component": "WB/PRC",
                "units_needed": 3,
                "priority": "urgent",
                "request_id": "REQ-1",
            },
            headers=_auth_header(client),
        )

    assert res.status_code == 200
    assert captured["args"] == ("O Pos", "WB/PRC", 3, "urgent", "REQ-1")
    assert res.get_json()["units_fulfilled"] == 3
