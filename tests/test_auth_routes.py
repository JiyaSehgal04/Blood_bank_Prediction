import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from api.app import create_app
from api.routes.auth import _SESSIONS, validate_token


def test_protected_api_route_rejects_missing_token():
    app = create_app()

    @app.route("/api/protected-ping")
    def protected_ping():
        return {"ok": True}, 200

    app.config["TESTING"] = True
    with app.test_client() as client:
        res = client.get("/api/protected-ping")

    assert res.status_code == 401


def test_protected_api_route_accepts_login_token():
    _SESSIONS.clear()
    app = create_app()

    @app.route("/api/protected-ping")
    def protected_ping():
        return {"ok": True}, 200

    app.config["TESTING"] = True
    with app.test_client() as client:
        login = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "bloodbank2026"},
        )
        token = login.get_json()["token"]
        res = client.get(
            "/api/protected-ping",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert login.status_code == 200
    assert res.status_code == 200
    assert res.get_json() == {"ok": True}


def test_login_token_validates_without_in_memory_session():
    _SESSIONS.clear()
    app = create_app()
    app.config["TESTING"] = True

    with app.test_client() as client:
        login = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "bloodbank2026"},
        )
        token = login.get_json()["token"]

    _SESSIONS.clear()

    assert validate_token(token) == "admin"


def test_tampered_login_token_is_rejected():
    _SESSIONS.clear()
    app = create_app()
    app.config["TESTING"] = True

    with app.test_client() as client:
        login = client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "bloodbank2026"},
        )
        token = login.get_json()["token"]

    assert validate_token(f"{token}x") is None
