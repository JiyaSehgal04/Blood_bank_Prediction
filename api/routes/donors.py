"""
api/routes/donors.py
GET  /api/donors
POST /api/donors
GET  /api/donors/:id
PUT  /api/donors/:id
GET  /api/donors/:id/donations
POST /api/donors/:id/donations
"""

import sys
from pathlib import Path
from flask import Blueprint, request, jsonify

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from services.donor_service import DonorService

donors_bp = Blueprint("donors", __name__, url_prefix="/api")


@donors_bp.route("/donors", methods=["GET"])
def list_donors():
    svc = DonorService()
    blood_group   = request.args.get("blood_group")
    eligible_only = request.args.get("eligible", "").lower() == "true"
    search        = request.args.get("search", "")
    donors = svc.list_donors(
        blood_group=blood_group,
        eligible_only=eligible_only,
        search=search,
    )
    return jsonify({"donors": donors, "count": len(donors)}), 200


@donors_bp.route("/donors", methods=["POST"])
def create_donor():
    data = request.get_json(force=True)
    if not data.get("name") or not data.get("blood_group"):
        return jsonify({"error": "name and blood_group are required"}), 400
    svc   = DonorService()
    donor = svc.create_donor(data)
    return jsonify({"donor": donor}), 201


@donors_bp.route("/donors/<donor_id>", methods=["GET"])
def get_donor(donor_id):
    svc   = DonorService()
    donor = svc.get_donor(donor_id)
    if not donor:
        return jsonify({"error": "Donor not found"}), 404
    history = svc.get_donation_history(donor_id)
    return jsonify({"donor": donor, "donation_history": history}), 200


@donors_bp.route("/donors/<donor_id>", methods=["PUT"])
def update_donor(donor_id):
    data    = request.get_json(force=True)
    svc     = DonorService()
    updated = svc.update_donor(donor_id, data)
    if not updated:
        return jsonify({"error": "Donor not found"}), 404
    return jsonify({"donor": updated}), 200


@donors_bp.route("/donors/<donor_id>/donations", methods=["GET"])
def get_donations(donor_id):
    svc     = DonorService()
    history = svc.get_donation_history(donor_id)
    return jsonify({"donations": history, "count": len(history)}), 200


@donors_bp.route("/donors/<donor_id>/donations", methods=["POST"])
def record_donation(donor_id):
    data    = request.get_json(force=True)
    unit_id = data.get("unit_id")
    if not unit_id:
        return jsonify({"error": "unit_id is required"}), 400
    svc      = DonorService()
    donation = svc.record_donation(donor_id, unit_id)
    if not donation:
        return jsonify({"error": "unit_id not found in inventory"}), 404
    return jsonify({"donation": donation}), 201
