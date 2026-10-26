import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from werkzeug.security import generate_password_hash

from api.app import create_app
from api.routes.auth import validate_token


def _client():
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()


def _login(client, username, password):
    return client.post("/api/auth/login", json={"username": username, "password": password})


def test_login_uses_credentials_from_environment(monkeypatch):
    monkeypatch.setenv("ADMIN_USERNAME", "ops")
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", generate_password_hash("correct horse", method="pbkdf2:sha256"))

    with _client() as client:
        ok = _login(client, "ops", "correct horse")
        wrong_password = _login(client, "ops", "bloodbank2026")
        wrong_user = _login(client, "admin", "correct horse")

    assert ok.status_code == 200 and ok.get_json()["username"] == "ops"
    assert wrong_password.status_code == 401
    assert wrong_user.status_code == 401


def test_old_hardcoded_account_no_longer_exists(monkeypatch):
    monkeypatch.setenv("ADMIN_USERNAME", "ops")
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", generate_password_hash("a-new-password", method="pbkdf2:sha256"))

    with _client() as client:
        res = _login(client, "admin", "bloodbank2026")

    assert res.status_code == 401


def test_login_is_disabled_when_no_credentials_are_configured(monkeypatch):
    monkeypatch.delenv("ADMIN_PASSWORD_HASH", raising=False)

    with _client() as client:
        res = _login(client, "admin", "bloodbank2026")

    assert res.status_code == 503
    assert "token" not in (res.get_json() or {})


def test_token_for_a_different_user_is_rejected(monkeypatch):
    with _client() as client:
        token = _login(client, "admin", "bloodbank2026").get_json()["token"]

    monkeypatch.setenv("ADMIN_USERNAME", "ops")

    assert validate_token(token) is None


def test_token_secret_is_not_derivable_without_a_configured_secret(monkeypatch):
    """Tokens signed with the old public fallback secret must not validate."""
    import hashlib, hmac, json, base64

    monkeypatch.setenv("AUTH_SECRET", "a-real-server-secret")
    payload = base64.urlsafe_b64encode(
        json.dumps({"sub": "admin", "iat": 2**31 - 1, "nonce": "x"}).encode()
    ).rstrip(b"=").decode()
    legacy_key = hashlib.sha256(
        f"blood-bank-auth:{hashlib.sha256(b'bloodbank2026').hexdigest()}".encode()
    ).digest()
    forged = payload + "." + base64.urlsafe_b64encode(
        hmac.new(legacy_key, payload.encode(), hashlib.sha256).digest()
    ).rstrip(b"=").decode()

    assert validate_token(forged) is None
