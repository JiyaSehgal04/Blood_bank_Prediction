# ================================
# BLOOD BANK EDA + ML FORECASTING
# ================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error
from statsmodels.tsa.stattools import adfuller
import warnings
warnings.filterwarnings("ignore")

# ====================================
# 1️⃣ LOAD DATASET
# ====================================

import os
_here = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(_here, "register_to_excel_updated_option2.xlsx")
if not os.path.isfile(file_path):
    file_path = os.path.join(_here, "..", "bloodbank-forecasting", "backend", "app", "register_to_excel_updated_option2.xlsx")
df = pd.read_excel(file_path)

# Parse Dates
df["collection_date"] = pd.to_datetime(
    df["Collection Date"], dayfirst=True, errors="coerce"
)

df["expiry_date"] = pd.to_datetime(
    df["Expiry Date"], dayfirst=True, errors="coerce"
)

# Normalize blood group
df["blood_group"] = (
    df["Blood Group"]
    .astype(str)
    .str.replace(" Pos", "+")
    .str.replace(" Neg", "-")
    .str.strip()
)

df["component"] = df["Component"].astype(str).str.upper()

print("\n===== DATA OVERVIEW =====")
print(df.info())
print(df.describe())

# ====================================
# 2️⃣ EDA SECTION
# ====================================

print("\n===== DATE RANGE =====")
print("Start:", df["collection_date"].min())
print("End:", df["collection_date"].max())

print("\n===== BLOOD GROUP DISTRIBUTION =====")
bg_dist = df["blood_group"].value_counts()
print(bg_dist)

bg_dist.plot(kind="bar", title="Blood Group Distribution")
plt.show()

print("\n===== COMPONENT DISTRIBUTION =====")
comp_dist = df["component"].value_counts()
print(comp_dist)

comp_dist.plot(kind="bar", title="Component Distribution")
plt.show()

# ====================================
# 3️⃣ BUILD DAILY DEMAND (PROXY)
# ====================================

daily = (
    df.groupby(["collection_date", "blood_group"])["Quantity (ml)"]
    .sum()
    .reset_index()
)

print("\n===== DAILY AGGREGATED SAMPLE =====")
print(daily.head())

# ====================================
# 4️⃣ ML FORECAST FUNCTION
# ====================================

def run_ml_for_blood_group(bg, horizon=7):
    print(f"\n\n=========== ML FOR {bg} ===========")

    data = daily[daily["blood_group"] == bg].sort_values("collection_date")

    if len(data) < 10:
        print("Not enough data.")
        return

    y = data["Quantity (ml)"].values

    # Stationarity Check
    adf = adfuller(y)
    print("ADF p-value:", adf[1])

    # Train-Test Split (80-20)
    split = int(len(y) * 0.8)
    train, test = y[:split], y[split:]

    # --------------------------
    # Exponential Smoothing
    # --------------------------
    model_es = ExponentialSmoothing(
        train,
        trend="add",
        seasonal=None
    ).fit()

    pred_es = model_es.forecast(len(test))

    mape_es = mean_absolute_percentage_error(test, pred_es)
    rmse_es = np.sqrt(mean_squared_error(test, pred_es))

    print("\nExponential Smoothing")
    print("MAPE:", round(mape_es, 4))
    print("RMSE:", round(rmse_es, 2))

    # --------------------------
    # Random Forest
    # --------------------------
    train_index = np.arange(len(train)).reshape(-1, 1)
    test_index = np.arange(len(train), len(y)).reshape(-1, 1)

    model_rf = RandomForestRegressor(n_estimators=100, random_state=42)
    model_rf.fit(train_index, train)

    pred_rf = model_rf.predict(test_index)

    mape_rf = mean_absolute_percentage_error(test, pred_rf)
    rmse_rf = np.sqrt(mean_squared_error(test, pred_rf))

    print("\nRandom Forest")
    print("MAPE:", round(mape_rf, 4))
    print("RMSE:", round(rmse_rf, 2))

    # --------------------------
    # Plot Comparison
    # --------------------------
    plt.figure(figsize=(10, 5))
    plt.plot(data["collection_date"], y, label="Actual")
    plt.plot(data["collection_date"][split:], pred_es, label="ES Forecast")
    plt.plot(data["collection_date"][split:], pred_rf, label="RF Forecast")
    plt.title(f"{bg} Demand Forecast Comparison")
    plt.legend()
    plt.show()

    # --------------------------
    # Future 7-Day Forecast
    # --------------------------
    future_es = model_es.forecast(horizon)
    future_rf = model_rf.predict(
        np.arange(len(y), len(y) + horizon).reshape(-1, 1)
    )

    print("\nNext 7-Day Forecast (Exponential Smoothing):")
    print(np.round(future_es, 2))

    print("\nNext 7-Day Forecast (Random Forest):")
    print(np.round(future_rf, 2))


# ====================================
# 5️⃣ RUN ML FOR ALL BLOOD GROUPS
# ====================================

for bg in daily["blood_group"].unique():
    run_ml_for_blood_group(bg)

print("\n=========== ANALYSIS COMPLETE ===========")