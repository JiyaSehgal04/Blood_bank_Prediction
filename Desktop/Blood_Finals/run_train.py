"""
run_train.py — train all ML models with correct module paths.

Run from the project root:
    python3 run_train.py

Classes are imported from ml.scripts.train (not __main__), so joblib
serialises them as ml.scripts.train.SESForecaster etc., which predict.py
can load without AttributeError.
"""
from ml.scripts.train import ModelTrainer

trainer = ModelTrainer()
print("Training all ML models...")
report = trainer.train_all()

print("\n" + "=" * 55)
print("Training Report:")
for comp, res in report.items():
    print(f"\n  {comp}:")
    for k, v in res.items():
        print(f"    {k}: {v}")
