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
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    _SESSIONS.pop(token, None)
    return jsonify({"message": "Logged out"}), 200
