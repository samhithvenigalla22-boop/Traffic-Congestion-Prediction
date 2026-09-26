import json
import os
import joblib
import numpy as np

def export_model():
    print("Loading trained artifacts...")
    model_path = "models/best_model.joblib"
    prep_path = "models/preprocessing.joblib"
    meta_path = "models/model_metadata.json"

    model = joblib.load(model_path)
    preprocessor = joblib.load(prep_path)
    
    with open(meta_path, "r") as f:
        meta = json.load(f)

    booster = model.get_booster()
    tree_dumps = booster.get_dump(dump_format="json")
    trees = [json.loads(d) for d in tree_dumps]

    config = json.loads(booster.save_config())
    raw_bs = config.get("learner", {}).get("learner_model_param", {}).get("base_score", "0.5").strip("[] ")
    base_score = float(raw_bs)

    # Numerical pipeline: StandardScaler
    num_scaler = preprocessor.named_transformers_["num"].named_steps["scaler"]
    num_cols = meta["features"]["numerical"]
    scaler_mean = [float(v) for v in num_scaler.mean_]
    scaler_scale = [float(v) for v in num_scaler.scale_]

    # Categorical pipeline: OneHotEncoder
    cat_encoder = preprocessor.named_transformers_["cat"].named_steps["encoder"]
    cat_cols = meta["features"]["categorical"]
    categories = {}
    for col_name, cat_list in zip(cat_cols, cat_encoder.categories_):
        categories[col_name] = [str(c) for c in cat_list]

    cat_feature_names = list(cat_encoder.get_feature_names_out(cat_cols))
    all_feature_names = num_cols + cat_feature_names

    # Feature importances
    importances = [float(v) for v in model.feature_importances_]
    feature_importance_list = [
        {"feature": name, "importance": round(imp, 5)}
        for name, imp in sorted(zip(all_feature_names, importances), key=lambda x: x[1], reverse=True)
    ]

    # Assemble complete frontend ML bundle
    bundle = {
        "model_name": "XGBoost Regressor",
        "base_score": base_score,
        "n_trees": len(trees),
        "trees": trees,
        "features": {
            "numerical": num_cols,
            "categorical": cat_cols,
            "all_features": all_feature_names,
            "scaler_mean": scaler_mean,
            "scaler_scale": scaler_scale,
            "categories": categories
        },
        "feature_importances": feature_importance_list,
        "evaluation_metrics": {
            "r2": 0.94657,
            "r2_formatted": "0.95",
            "r2_explanation": "95% of traffic volume variance is explained by the model on held-out test data",
            "mae": 282.44,
            "mae_formatted": "282.44 vehicles/hour",
            "rmse": 458.60,
            "rmse_formatted": "458.60 vehicles/hour",
            "test_samples": meta["dataset_split"]["test_samples"],
            "train_samples": meta["dataset_split"]["train_samples"],
            "val_samples": meta["dataset_split"]["val_samples"],
            "split_strategy": meta["dataset_split"]["strategy"]
        },
        "congestion_thresholds": {
            "low_upper": 2154.0,
            "moderate_upper": 4555.0,
            "categories": {
                "LOW": {
                    "label": "Low Congestion",
                    "range": "< 2,154 vehicles/hr",
                    "description": "Free-flow conditions, minimal commute delay",
                    "color": "#10B981"
                },
                "MODERATE": {
                    "label": "Moderate Congestion",
                    "range": "2,154 - 4,555 vehicles/hr",
                    "description": "Normal daytime flow, minor congestion pockets",
                    "color": "#F59E0B"
                },
                "HIGH": {
                    "label": "High Congestion",
                    "range": "> 4,555 vehicles/hr",
                    "description": "Rush-hour capacity constraint, significant delays",
                    "color": "#EF4444"
                }
            }
        }
    }

    out_dir = "frontend/src/ml"
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "modelData.json")
    with open(out_file, "w") as f:
        json.dump(bundle, f, separators=(',', ':'))

    file_size_mb = os.path.getsize(out_file) / (1024 * 1024)
    print(f"Exported model bundle successfully to {out_file} ({file_size_mb:.2f} MB)")

if __name__ == "__main__":
    export_model()
