import sys
from pathlib import Path
from types import SimpleNamespace

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ml.scripts.preprocess import FeaturePipeline
from ml.scripts import predict


def test_feature_inventory_counts_are_component_specific():
    raw = pd.DataFrame([
        {"summary_date": "2026-04-01", "component": "WB/PRC", "blood_group": "O Pos", "units_issued": 1, "units_received": 1, "units_expired": 0, "closing_stock": 1, "unmet_requests": 0},
        {"summary_date": "2026-04-02", "component": "WB/PRC", "blood_group": "O Pos", "units_issued": 2, "units_received": 2, "units_expired": 0, "closing_stock": 2, "unmet_requests": 0},
        {"summary_date": "2026-04-01", "component": "FFP", "blood_group": "O Pos", "units_issued": 3, "units_received": 3, "units_expired": 0, "closing_stock": 3, "unmet_requests": 0},
        {"summary_date": "2026-04-02", "component": "FFP", "blood_group": "O Pos", "units_issued": 4, "units_received": 4, "units_expired": 0, "closing_stock": 4, "unmet_requests": 0},
    ])
    raw["summary_date"] = pd.to_datetime(raw["summary_date"])

    features = FeaturePipeline()._build_features_from_summary(
        raw,
        "FFP",
        expiry_counts={("O Pos", "WB/PRC"): 9, ("O Pos", "FFP"): 2},
        stock_levels={("O Pos", "WB/PRC"): 10, ("O Pos", "FFP"): 4},
    )

    row = features[features["blood_group"] == "O Pos"].iloc[-1]
    assert row["expiring_within_7d"] == 2
    assert row["current_stock_level"] == 4


def test_replenishment_uses_matching_component_inventory(monkeypatch):
    predictor = predict.MLPredictor.__new__(predict.MLPredictor)
    predictor.pipe = SimpleNamespace(
        fetch_stock_levels=lambda: {("O Pos", "WB/PRC"): 99, ("O Pos", "FFP"): 1},
        fetch_expiry_counts=lambda: {("O Pos", "WB/PRC"): 0, ("O Pos", "FFP"): 2},
    )

    def fake_predict_component(_self, component, store=True):
        if component == "FFP":
            return [{
                "blood_group": "O Pos",
                "component": "FFP",
                "predicted_demand": 1,
                "model_used": "test",
            }]
        return []

    monkeypatch.setattr(predict.MLPredictor, "predict_component", fake_predict_component)

    plan = predictor.replenishment_plan()

    assert plan[0]["component"] == "FFP"
    assert plan[0]["current_stock"] == 1
    assert plan[0]["expiring_in_7d"] == 2
    assert plan[0]["recommended_order"] == 13
