"""
api/routes/auth.py
POST /api/auth/login
"""

from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Optional

auth_bp = Blueprint("auth", __name__, url_prefix="/api")

# The single admin account comes from the environment (never from source code):
#   ADMIN_USERNAME        (default "admin")
#   ADMIN_PASSWORD_HASH   a werkzeug hash, see .env.example for how to create one
# With no ADMIN_PASSWORD_HASH configured, login is disabled.
_PROCESS_SECRET = secrets.token_bytes(32)  # last-resort signing key; tokens die with the process


def _admin_username() -> str:
    return (os.environ.get("ADMIN_USERNAME") or "admin").strip()


def _admin_password_hash() -> str:
    return (os.environ.get("ADMIN_PASSWORD_HASH") or "").strip()


_SESSIONS: dict[str, str] = {}   # compatibility/debug cache; validation is stateless
_REVOKED_TOKENS: set[str] = set()
_TOKEN_TTL_SECONDS = int(os.environ.get("AUTH_TOKEN_TTL_SECONDS", str(24 * 60 * 60)))


def _auth_secret() -> bytes:
    secret = os.environ.get("AUTH_SECRET")
    if secret:
        return secret.encode()
    # Without AUTH_SECRET, derive the key from the (secret) password hash so tokens survive
    # multi-worker deployments; it is never derivable from anything in the source code.
    password_hash = _admin_password_hash()
    if password_hash:
        return hashlib.sha256(f"blood-bank-auth:{password_hash}".encode()).digest()
    return _PROCESS_SECRET


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}".encode())


def _signature(payload: str) -> str:
    digest = hmac.new(_auth_secret(), payload.encode(), hashlib.sha256).digest()
    return _b64url_encode(digest)


def issue_token(username: str) -> str:
    payload = {
        "sub": username,
        "iat": int(time.time()),
        "nonce": secrets.token_hex(16),
    }
    encoded_payload = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    )
    return f"{encoded_payload}.{_signature(encoded_payload)}"


def get_bearer_token(auth_header: Optional[str] = None) -> str:
    """Extract a Bearer token from an Authorization header."""
    header = auth_header if auth_header is not None else request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return ""
    return token.strip()


def validate_token(token: str) -> Optional[str]:
    """Return the username for a valid signed token, otherwise None."""
    if not token or token in _REVOKED_TOKENS:
        return None

    try:
        encoded_payload, provided_signature = token.split(".", 1)
    except ValueError:
        return None

    expected_signature = _signature(encoded_payload)
    if not hmac.compare_digest(provided_signature, expected_signature):
        return None

    try:
        payload = json.loads(_b64url_decode(encoded_payload))
    except (ValueError, json.JSONDecodeError):
        return None

    username = payload.get("sub")
    issued_at = payload.get("iat")
    if username != _admin_username() or not isinstance(issued_at, int):
        return None

    if _TOKEN_TTL_SECONDS > 0 and time.time() - issued_at > _TOKEN_TTL_SECONDS:
        return None

    return username


def current_user() -> Optional[str]:
    return validate_token(get_bearer_token())


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    data     = request.get_json(force=True)
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    password_hash = _admin_password_hash()
    if not password_hash:
        return jsonify({"error": "Login is not configured on this server"}), 503

    # Always run the hash check so a wrong username takes as long as a wrong password.
    password_ok = check_password_hash(password_hash, password)
    username_ok = hmac.compare_digest(username.encode(), _admin_username().encode())
    if not (password_ok and username_ok):
        return jsonify({"error": "Invalid credentials"}), 401

    token = issue_token(username)
    _SESSIONS[token] = username
    return jsonify({"token": token, "username": username}), 200


@auth_bp.route("/auth/logout", methods=["POST"])
def logout():
    token = get_bearer_token()
    if token:
        _REVOKED_TOKENS.add(token)
    _SESSIONS.pop(token, None)
    return jsonify({"message": "Logged out"}), 200
