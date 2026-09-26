import json
import os
import joblib
import numpy as np
import pandas as pd

def main():
    print("=" * 60)
    print("STANDALONE ML MODEL VERIFICATION (ZERO BACKEND)")
    print("=" * 60)

    # 1. Read metadata
    metadata_path = os.path.join("models", "model_metadata.json")
    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as f:
            meta = json.load(f)
        print("Model Name:         ", meta["model_name"])
        print("Target Variable:    ", meta["target_variable"])
        print("Dataset Split:      ", meta["dataset_split"]["strategy"])
        print("Evaluation Metrics: ")
        print(f"  - R² (Variance Explained): {meta['evaluation_metrics']['test']['r2']:.4f}")
        print(f"  - MAE (veh/hr):            {meta['evaluation_metrics']['test']['mae']:.2f}")
        print(f"  - RMSE (veh/hr):           {meta['evaluation_metrics']['test']['rmse']:.2f}")

    # 2. Check model artifacts
    for fname in ["best_model.joblib", "preprocessing.joblib", "model_metadata.json"]:
        p = os.path.join("models", fname)
        print(f"Artifact {p}: exists={os.path.exists(p)}, size={os.path.getsize(p):,} bytes")

    # 3. Load artifacts
    model = joblib.load(os.path.join("models", "best_model.joblib"))
    preprocessor = joblib.load(os.path.join("models", "preprocessing.joblib"))
    print("\nModel and Preprocessor loaded successfully.")

    # 4. Load a real row from the test set in data/traffic.csv
    data_path = os.path.join("data", "traffic.csv")
    df = pd.read_csv(data_path)
    # Test set is the last 15% (e.g. index 45000)
    sample_row = df.iloc[45000].to_dict()
    print(f"\nEvaluating Real Test Instance (Row 45000):")
    print(f"  Timestamp:       {sample_row['date_time']}")
    print(f"  Weather:         {sample_row['weather_main']} ({sample_row['weather_description']})")
    print(f"  Temp:            {sample_row['temp'] - 273.15:.1f} °C ({sample_row['temp']:.1f} K)")
    print(f"  Actual Volume:   {sample_row['traffic_volume']} veh/hr")

    # Feature engineering for this sample
    dt = pd.to_datetime(sample_row['date_time'])
    sample_data = {
        'temp': float(sample_row['temp']),
        'rain_1h': float(sample_row['rain_1h']),
        'snow_1h': float(sample_row['snow_1h']),
        'clouds_all': int(sample_row['clouds_all']),
        'hour': int(dt.hour),
        'day_of_week': int(dt.dayofweek),
        'day': int(dt.day),
        'month': int(dt.month),
        'year': int(dt.year),
        'is_weekend': int(dt.dayofweek >= 5),
        'is_rush_hour': int((dt.dayofweek < 5) and (dt.hour in [7, 8, 9, 16, 17, 18])),
        'is_holiday': int(str(sample_row.get('holiday', 'None')).strip() not in ['', 'None']),
        'sin_hour': np.sin(2 * np.pi * dt.hour / 24.0),
        'cos_hour': np.cos(2 * np.pi * dt.hour / 24.0),
        'sin_month': np.sin(2 * np.pi * dt.month / 12.0),
        'cos_month': np.cos(2 * np.pi * dt.month / 12.0),
        'sin_dow': np.sin(2 * np.pi * dt.dayofweek / 7.0),
        'cos_dow': np.cos(2 * np.pi * dt.dayofweek / 7.0),
        'weather_main': str(sample_row['weather_main']),
        'holiday': str(sample_row.get('holiday', 'None')).strip() if pd.notnull(sample_row.get('holiday')) else 'None'
    }

    df_single = pd.DataFrame([sample_data])
    proc = preprocessor.transform(df_single)
    pred_vol = float(model.predict(proc)[0])
    abs_err = abs(sample_row['traffic_volume'] - pred_vol)

    def classify(v):
        if v < 2154.0: return "LOW"
        if v <= 4555.0: return "MODERATE"
        return "HIGH"

    print(f"  Predicted Volume:{pred_vol:.1f} veh/hr")
    print(f"  Absolute Error:  {abs_err:.1f} veh/hr")
    print(f"  Congestion Tier: {classify(pred_vol)}")
    print("=" * 60)
    print("Zero-backend verification complete: Python & Client ML ready.")

if __name__ == "__main__":
    main()
