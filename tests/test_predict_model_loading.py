import sys
from pathlib import Path

from ml.scripts import predict
from ml.scripts.train import AnomalyDetector, SESForecaster, XGBForecaster


def test_load_model_installs_legacy_main_class_aliases(monkeypatch, tmp_path):
    model_path = tmp_path / "legacy.joblib"
    model_path.write_bytes(b"not used")
    main_module = sys.modules["__main__"]
    class_names = ("SESForecaster", "XGBForecaster", "AnomalyDetector")
    originals = {
        name: getattr(main_module, name)
        for name in class_names
        if hasattr(main_module, name)
    }

    for name in class_names:
        monkeypatch.delattr(main_module, name, raising=False)

    def fake_load(path: Path):
        assert path == model_path
        assert main_module.SESForecaster is SESForecaster
        assert main_module.XGBForecaster is XGBForecaster
        assert main_module.AnomalyDetector is AnomalyDetector
        return {"loaded": True}

    monkeypatch.setattr(predict.joblib, "load", fake_load)

    assert predict._load_model(model_path) == {"loaded": True}

    for name, value in originals.items():
        monkeypatch.setattr(main_module, name, value)


def test_load_model_returns_none_for_missing_file(tmp_path):
    assert predict._load_model(tmp_path / "missing.joblib") is None

