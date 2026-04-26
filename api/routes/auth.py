"""
api/routes/auth.py
POST /api/auth/login
"""

from flask import Blueprint, request, jsonify
import hashlib, secrets

auth_bp = Blueprint("auth", __name__, url_prefix="/api")

# Simple hardcoded credentials for now (replace with DB-backed auth in prod)
_USERS = {
    "admin": hashlib.sha256("bloodbank2026".encode()).hexdigest(),
}
_SESSIONS: dict[str, str] = {}   # token → username


def get_bearer_token(auth_header: str | None = None) -> str:
    """Extract a Bearer token from an Authorization header."""
    header = auth_header if auth_header is not None else request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return ""
    return token.strip()


def validate_token(token: str) -> str | None:
    """Return the username for a valid session token, otherwise None."""
    return _SESSIONS.get(token)


def current_user() -> str | None:
    return validate_token(get_bearer_token())


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    data     = request.get_json(force=True)
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    hashed = hashlib.sha256(password.encode()).hexdigest()
    if _USERS.get(username) != hashed:
        return jsonify({"error": "Invalid credentials"}), 401

    token = secrets.token_hex(32)
    _SESSIONS[token] = username
    return jsonify({"token": token, "username": username}), 200


@auth_bp.route("/auth/logout", methods=["POST"])
def logout():
    token = get_bearer_token()
    _SESSIONS.pop(token, None)
    return jsonify({"message": "Logged out"}), 200
