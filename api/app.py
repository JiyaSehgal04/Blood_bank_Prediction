"""
api/app.py — Flask application factory (Step 11)

Endpoints:
  Inventory  : GET/POST/PUT/DELETE /api/inventory
  Upload     : POST /api/upload, GET /api/upload/history, POST /api/upload/bulk-load
  Allocate   : POST /api/allocate, GET /api/allocations
  Donors     : GET/POST /api/donors, GET/PUT /api/donors/:id
  Predictions: GET /api/predictions, /seasonal, /anomalies
               POST /api/predictions/retrain
               GET /api/replenishment
  Alerts     : GET /api/alerts, PUT /api/alerts/:id/resolve, POST /api/alerts/scan
  Dashboard  : GET /api/dashboard/stats
  Auth       : POST /api/auth/login, /api/auth/logout
  Health     : GET /health

Run:
    python3 api/app.py
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from flask import Flask, jsonify, request
from flask_cors import CORS

from api.routes.inventory   import inventory_bp
from api.routes.donors      import donors_bp
from api.routes.allocate    import allocate_bp
from api.routes.alerts      import alerts_bp
from api.routes.dashboard   import dashboard_bp
from api.routes.predictions import predictions_bp
from api.routes.upload      import upload_bp
from api.routes.auth        import auth_bp, current_user


PUBLIC_ROUTES = {
    "/health",
    "/api/routes",
    "/api/auth/login",
    "/api/auth/logout",
}


def create_app() -> Flask:
    app = Flask(__name__)
    _extra = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
    _origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://blood-bank-srm.vercel.app",
    ] + _extra
    CORS(app, origins=_origins)

    @app.before_request
    def enforce_api_auth():
        if request.method == "OPTIONS":
            return None
        if request.path in PUBLIC_ROUTES:
            return None
        if request.path.startswith("/api/") and not current_user():
            return jsonify({"error": "Unauthorized"}), 401
        return None

    for bp in (inventory_bp, donors_bp, allocate_bp, alerts_bp,
               dashboard_bp, predictions_bp, upload_bp, auth_bp):
        app.register_blueprint(bp)

    @app.route("/health")
    def health():
        return {"status": "ok", "version": "v3"}, 200

    # List all routes on startup
    @app.route("/api/routes")
    def list_routes():
        routes = [
            {"method": list(r.methods - {"HEAD", "OPTIONS"}),
             "path": r.rule}
            for r in app.url_map.iter_rules()
            if r.rule.startswith("/api") or r.rule == "/health"
        ]
        return {"routes": sorted(routes, key=lambda x: x["path"])}, 200

    return app


if __name__ == "__main__":
    app = create_app()
    port = 5001
    print(f"\nBlood Bank API v3 — http://localhost:{port}")
    print(f"Routes: http://localhost:{port}/api/routes\n")
    app.run(debug=False, port=port)
