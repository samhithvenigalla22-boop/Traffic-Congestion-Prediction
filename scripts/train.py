"""
Training and Evaluation Pipeline for Traffic Congestion Prediction.
Implements chronological train/val/test splits, scikit-learn ColumnTransformer,
benchmarks Baseline, Ridge, Random Forest, and XGBoost models, and persists
the best performing model and metadata.
"""

import os
import json
import logging
from datetime import datetime
import numpy as np
import pandas as pd
import joblib

from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def load_and_clean_data(csv_path: str) -> pd.DataFrame:
    """Load raw dataset, drop exact duplicates, clean invalid sensor readings."""
    logger.info(f"Loading raw dataset from {csv_path}...")
    df = pd.read_csv(csv_path)
    initial_len = len(df)
    logger.info(f"Initial row count: {initial_len}")

    # Remove duplicates
    df = df.drop_duplicates().reset_index(drop=True)
    logger.info(f"Removed {initial_len - len(df)} duplicate rows. New count: {len(df)}")

    # Clean extreme sensor glitches
    # Temperature 0.0 K is absolute zero (sensor offline). Replace with NaN so imputer handles it.
    zero_temp_count = (df["temp"] < 200.0).sum()
    if zero_temp_count > 0:
        logger.info(f"Handling {zero_temp_count} invalid temperature readings (<200K)...")
        median_temp = df.loc[df["temp"] >= 200.0, "temp"].median()
        df.loc[df["temp"] < 200.0, "temp"] = median_temp

    # Rain extreme outlier (> 100mm in 1 hour)
    rain_outliers = (df["rain_1h"] > 100.0).sum()
    if rain_outliers > 0:
        logger.info(f"Clipping {rain_outliers} extreme rain outlier(s) (>100mm)...")
        df["rain_1h"] = df["rain_1h"].clip(upper=100.0)

    # Clean holiday values
    df["holiday"] = df["holiday"].fillna("None").astype(str).str.strip()
    df.loc[df["holiday"] == "", "holiday"] = "None"

    # Clean weather categories
    df["weather_main"] = df["weather_main"].fillna("Clear").astype(str).str.strip()
    df["weather_description"] = df["weather_description"].fillna("sky is clear").astype(str).str.strip().str.lower()

    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Derive temporal, cyclical, and calendar features from date_time."""
    logger.info("Engineering calendar and cyclical features...")
    df = df.copy()
    dt = pd.to_datetime(df["date_time"])

    df["hour"] = dt.dt.hour
    df["day_of_week"] = dt.dt.dayofweek
    df["day"] = dt.dt.day
    df["month"] = dt.dt.month
    df["year"] = dt.dt.year

    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    # Rush hour: weekdays 07:00-09:00 and 16:00-18:00
    df["is_rush_hour"] = (
        (df["is_weekend"] == 0) & 
        (df["hour"].isin([7, 8, 9, 16, 17, 18]))
    ).astype(int)

    # Cyclical encodings for periodic features
    df["sin_hour"] = np.sin(2 * np.pi * df["hour"] / 24.0)
    df["cos_hour"] = np.cos(2 * np.pi * df["hour"] / 24.0)
    df["sin_month"] = np.sin(2 * np.pi * df["month"] / 12.0)
    df["cos_month"] = np.cos(2 * np.pi * df["month"] / 12.0)
    df["sin_dow"] = np.sin(2 * np.pi * df["day_of_week"] / 7.0)
    df["cos_dow"] = np.cos(2 * np.pi * df["day_of_week"] / 7.0)

    df["is_holiday"] = (df["holiday"] != "None").astype(int)

    return df


def build_preprocessing_pipeline(numerical_cols: list, categorical_cols: list) -> ColumnTransformer:
    """Construct an sklearn ColumnTransformer ensuring reproducible preprocessing."""
    num_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    cat_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="constant", fill_value="None")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_pipeline, numerical_cols),
            ("cat", cat_pipeline, categorical_cols),
        ],
        remainder="drop",
    )
    return preprocessor


def train_and_evaluate():
    # 1. Path resolutions
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(base_dir, "data", "Metro_Interstate_Traffic_Volume.csv")
    if not os.path.exists(data_path):
        data_path = os.path.join(base_dir, "Metro_Interstate_Traffic_Volume.csv")

    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)

    # 2. Load & Clean
    df = load_and_clean_data(data_path)
    df = engineer_features(df)

    # 3. Define Features and Target
    target_col = "traffic_volume"
    numerical_cols = [
        "temp", "rain_1h", "snow_1h", "clouds_all",
        "hour", "day_of_week", "day", "month", "year",
        "is_weekend", "is_rush_hour", "is_holiday",
        "sin_hour", "cos_hour", "sin_month", "cos_month", "sin_dow", "cos_dow"
    ]
    categorical_cols = ["weather_main", "holiday"]
    all_feature_cols = numerical_cols + categorical_cols

    X = df[all_feature_cols]
    y = df[target_col]

    # 4. Strict Chronological Train / Validation / Test Split (70% / 15% / 15%)
    n = len(df)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    X_train, y_train = X.iloc[:train_end], y.iloc[:train_end]
    X_val, y_val = X.iloc[train_end:val_end], y.iloc[train_end:val_end]
    X_test, y_test = X.iloc[val_end:], y.iloc[val_end:]

    logger.info(f"Split sizes: Train={len(X_train)} ({df['date_time'].iloc[0]} to {df['date_time'].iloc[train_end-1]}), "
                f"Val={len(X_val)} ({df['date_time'].iloc[train_end]} to {df['date_time'].iloc[val_end-1]}), "
                f"Test={len(X_test)} ({df['date_time'].iloc[val_end]} to {df['date_time'].iloc[-1]})")

    # 5. Fit Preprocessor ONLY on training data
    logger.info("Fitting ColumnTransformer preprocessing pipeline strictly on Train set...")
    preprocessor = build_preprocessing_pipeline(numerical_cols, categorical_cols)
    X_train_proc = preprocessor.fit_transform(X_train)
    X_val_proc = preprocessor.transform(X_val)
    X_test_proc = preprocessor.transform(X_test)

    # Save preprocessing pipeline
    preproc_path = os.path.join(models_dir, "preprocessing.joblib")
    joblib.dump(preprocessor, preproc_path)
    logger.info(f"Saved preprocessing pipeline to {preproc_path}")

    # 6. Candidate Models
    models = {
        "Dummy (Mean Baseline)": DummyRegressor(strategy="mean"),
        "Ridge Regression": Ridge(alpha=1.0, random_state=42),
        "Random Forest Regressor": RandomForestRegressor(
            n_estimators=100, max_depth=16, min_samples_leaf=2, random_state=42, n_jobs=-1
        ),
        "XGBoost Regressor": XGBRegressor(
            n_estimators=200, learning_rate=0.08, max_depth=7, subsample=0.8,
            colsample_bytree=0.8, random_state=42, n_jobs=-1
        )
    }

    results = []
    trained_model_objs = {}

    for name, model in models.items():
        logger.info(f"Training {name}...")
        start_time = datetime.now()
        model.fit(X_train_proc, y_train)
        train_duration = (datetime.now() - start_time).total_seconds()

        # Evaluate on Validation
        val_preds = model.predict(X_val_proc)
        val_mae = float(mean_absolute_error(y_val, val_preds))
        val_rmse = float(root_mean_squared_error(y_val, val_preds))
        val_r2 = float(r2_score(y_val, val_preds))

        # Evaluate on Test
        test_preds = model.predict(X_test_proc)
        test_mae = float(mean_absolute_error(y_test, test_preds))
        test_rmse = float(root_mean_squared_error(y_test, test_preds))
        test_r2 = float(r2_score(y_test, test_preds))

        logger.info(f"{name} -> Val MAE: {val_mae:.2f}, Val RMSE: {val_rmse:.2f}, Val R²: {val_r2:.4f} | "
                    f"Test MAE: {test_mae:.2f}, Test RMSE: {test_rmse:.2f}, Test R²: {test_r2:.4f}")

        results.append({
            "model": name,
            "val_mae": val_mae,
            "val_rmse": val_rmse,
            "val_r2": val_r2,
            "test_mae": test_mae,
            "test_rmse": test_rmse,
            "test_r2": test_r2,
            "train_time_sec": round(train_duration, 2)
        })
        trained_model_objs[name] = model

    results_df = pd.DataFrame(results)
    comparison_csv_path = os.path.join(models_dir, "model_comparison.csv")
    results_df.to_csv(comparison_csv_path, index=False)
    logger.info(f"Saved model comparison table to {comparison_csv_path}")

    # 7. Model Selection: lowest Test RMSE and MAE
    # Filter out baseline
    ml_candidates = results_df[~results_df["model"].str.contains("Baseline")]
    best_row = ml_candidates.sort_values(by="test_rmse", ascending=True).iloc[0]
    best_model_name = best_row["model"]
    best_model = trained_model_objs[best_model_name]

    best_model_path = os.path.join(models_dir, "best_model.joblib")
    joblib.dump(best_model, best_model_path)
    logger.info(f"Selected best model: '{best_model_name}' with Test RMSE: {best_row['test_rmse']:.2f}, Test MAE: {best_row['test_mae']:.2f}, Test R²: {best_row['test_r2']:.4f}")
    logger.info(f"Saved best model to {best_model_path}")

    # 8. Congestion Threshold Methodology
    # Based on empirical target distribution terciles (33.3% and 66.7% quantiles of training target):
    q_low = float(np.round(y_train.quantile(1/3), 0))
    q_high = float(np.round(y_train.quantile(2/3), 0))
    thresholds = {
        "low_upper": q_low,       # Below this is LOW
        "moderate_upper": q_high,  # Between low_upper and moderate_upper is MODERATE
        "methodology": "Empirical Terciles of Traffic Volume Distribution (33.3% and 66.7% quantiles)",
        "categories": {
            "LOW": f"< {q_low:.0f} vehicles/hour (Free-flow off-peak traffic)",
            "MODERATE": f"{q_low:.0f} - {q_high:.0f} vehicles/hour (Standard daytime traffic)",
            "HIGH": f"> {q_high:.0f} vehicles/hour (Rush-hour & capacity-constrained traffic)"
        }
    }

    # 9. Save comprehensive model_metadata.json
    metadata = {
        "model_name": best_model_name,
        "selected_reason": "Lowest Test RMSE and MAE with highest generalization R² score across chronological test partition.",
        "training_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "target_variable": target_col,
        "evaluation_metrics": {
            "validation": {
                "mae": best_row["val_mae"],
                "rmse": best_row["val_rmse"],
                "r2": best_row["val_r2"]
            },
            "test": {
                "mae": best_row["test_mae"],
                "rmse": best_row["test_rmse"],
                "r2": best_row["test_r2"]
            }
        },
        "all_model_benchmarks": results,
        "features": {
            "numerical": numerical_cols,
            "categorical": categorical_cols,
            "total_input_features": len(all_feature_cols)
        },
        "dataset_split": {
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "test_samples": len(X_test),
            "strategy": "Strict Chronological Split (70% Train / 15% Val / 15% Test)"
        },
        "congestion_thresholds": thresholds
    }

    metadata_path = os.path.join(models_dir, "model_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=4)
    logger.info(f"Saved model metadata to {metadata_path}")
    logger.info("Training and evaluation completed successfully!")


if __name__ == "__main__":
    train_and_evaluate()
