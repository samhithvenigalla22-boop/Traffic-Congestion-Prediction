import os
import json
from datetime import datetime, timezone
from typing import List, Optional
import numpy as np
import pandas as pd
import joblib

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models
import schemas
from auth import hash_password, verify_password, create_access_token, get_current_user, get_optional_current_user

# Create SQLite database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Traffic Congestion Prediction API",
    description="Backend API powered by FastAPI, SQLite, and XGBoost Regressor",
    version="1.0.0"
)

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8001,http://127.0.0.1:8001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained XGBoost model and preprocessing artifacts
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODELS_DIR, "best_model.joblib")
PREPROC_PATH = os.path.join(MODELS_DIR, "preprocessing.joblib")
META_PATH = os.path.join(MODELS_DIR, "model_metadata.json")

# Fallback to root models/ if not in backend/models/
if not os.path.exists(MODEL_PATH):
    MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "best_model.joblib"))
    PREPROC_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "preprocessing.joblib"))
    META_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "model_metadata.json"))

print(f"Loading XGBoost model from: {MODEL_PATH}")
model = joblib.load(MODEL_PATH)
print(f"Loading Preprocessor from: {PREPROC_PATH}")
preprocessor = joblib.load(PREPROC_PATH)

metadata = {}
if os.path.exists(META_PATH):
    with open(META_PATH, "r", encoding="utf-8") as f:
        metadata = json.load(f)

# Extract metrics
test_metrics = metadata.get("evaluation_metrics", {}).get("test", {})
R2_VAL = round(test_metrics.get("r2", 0.9466), 4)
MAE_VAL = round(test_metrics.get("mae", 282.44), 2)
RMSE_VAL = round(test_metrics.get("rmse", 458.60), 2)

def classify_congestion(volume: float) -> str:
    """Empirical tercile classification."""
    if volume < 2154.0:
        return "LOW"
    elif volume <= 4555.0:
        return "MODERATE"
    else:
        return "HIGH"

# ==========================================
# HEALTH & INFO ENDPOINTS
# ==========================================
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "Traffic Congestion Prediction API",
        "model": "XGBoost Regressor",
        "r2": R2_VAL,
        "database": "SQLite"
    }

# ==========================================
# AUTHENTICATION ENDPOINTS
# ==========================================
@app.post("/auth/signup", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED, tags=["Auth"])
def signup(req: schemas.SignupRequest, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )

    # Hash password and create user
    new_user = models.User(
        name=req.name,
        email=req.email,
        phone=req.phone,
        password_hash=hash_password(req.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate JWT token
    token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }

@app.post("/auth/login", response_model=schemas.TokenResponse, tags=["Auth"])
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/auth/me", response_model=schemas.UserResponse, tags=["Auth"])
def get_profile(current_user: models.User = Depends(get_current_user)):
    return current_user

# ==========================================
# PREDICTION ENDPOINT
# ==========================================
@app.post("/predict", response_model=schemas.PredictionResponse, tags=["Prediction"])
def predict_traffic(
    req: schemas.PredictionInput,
    current_user: Optional[models.User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Parse date and time
        time_str = req.time[:5] if len(req.time) >= 5 else req.time
        dt_str = f"{req.date} {time_str}"
        dt = pd.to_datetime(dt_str)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date or time format: {e}"
        )

    hour = dt.hour
    day = dt.day
    day_of_week = dt.weekday()
    month = dt.month
    year = dt.year

    is_weekend = 1 if day_of_week in [5, 6] else 0
    is_rush_hour = 1 if (not is_weekend and hour in [7, 8, 9, 16, 17, 18]) else 0

    # Cyclical harmonics
    sin_hour = np.sin(2 * np.pi * hour / 24.0)
    cos_hour = np.cos(2 * np.pi * hour / 24.0)
    sin_month = np.sin(2 * np.pi * month / 12.0)
    cos_month = np.cos(2 * np.pi * month / 12.0)
    sin_dow = np.sin(2 * np.pi * day_of_week / 7.0)
    cos_dow = np.cos(2 * np.pi * day_of_week / 7.0)

    # Handle temperature unit: if Celsius (e.g. < 100), convert to Kelvin
    temp_k = req.temperature + 273.15 if req.temperature < 150.0 else req.temperature

    # Build input feature DataFrame matching preprocessor
    features_dict = {
        'temp': [temp_k],
        'rain_1h': [req.rain],
        'snow_1h': [req.snow],
        'clouds_all': [req.clouds],
        'hour': [hour],
        'day_of_week': [day_of_week],
        'day': [day],
        'month': [month],
        'year': [year],
        'is_weekend': [is_weekend],
        'is_rush_hour': [is_rush_hour],
        'sin_hour': [sin_hour],
        'cos_hour': [cos_hour],
        'sin_month': [sin_month],
        'cos_month': [cos_month],
        'sin_dow': [sin_dow],
        'cos_dow': [cos_dow],
        'weather_main': [req.weather],
        'holiday': [req.holiday]
    }
    df_features = pd.DataFrame(features_dict)

    # Transform through fitted ColumnTransformer
    try:
        X_proc = preprocessor.transform(df_features)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Preprocessing error: {e}"
        )

    # Run XGBoost inference
    raw_pred = model.predict(X_proc)[0]
    predicted_volume = max(0.0, float(raw_pred))
    congestion_lvl = classify_congestion(predicted_volume)

    # Save prediction to SQLite database if authenticated
    now_utc = datetime.now(timezone.utc)
    pred_id = None
    if current_user:
        pred_record = models.Prediction(
            user_id=current_user.id,
            date=req.date,
            time=time_str,
            temperature=req.temperature,
            rain=req.rain,
            snow=req.snow,
            clouds=req.clouds,
            weather=req.weather,
            holiday=req.holiday,
            corridor=req.corridor,
            direction=req.direction,
            prediction_point=req.prediction_point,
            predicted_traffic=round(predicted_volume, 2),
            congestion_level=congestion_lvl,
            created_at=now_utc
        )
        db.add(pred_record)
        db.commit()
        db.refresh(pred_record)
        pred_id = pred_record.id

    return {
        "id": pred_id,
        "predicted_traffic": round(predicted_volume, 2),
        "congestion_level": congestion_lvl,
        "model": "XGBoost Regressor",
        "r2": 0.95,
        "mae": MAE_VAL,
        "rmse": RMSE_VAL,
        "corridor": req.corridor,
        "direction": req.direction,
        "prediction_point": req.prediction_point,
        "date": req.date,
        "time": time_str,
        "temperature": req.temperature,
        "rain": req.rain,
        "snow": req.snow,
        "clouds": req.clouds,
        "weather": req.weather,
        "holiday": req.holiday,
        "created_at": now_utc.isoformat()
    }

# ==========================================
# HISTORY ENDPOINTS
# ==========================================
@app.get("/history", response_model=List[schemas.HistoryItem], tags=["History"])
def get_prediction_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = (
        db.query(models.Prediction)
        .filter(models.Prediction.user_id == current_user.id)
        .order_by(models.Prediction.created_at.desc())
        .limit(100)
        .all()
    )
    return history

@app.delete("/history", tags=["History"])
def clear_prediction_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deleted_count = (
        db.query(models.Prediction)
        .filter(models.Prediction.user_id == current_user.id)
        .delete()
    )
    db.commit()
    return {
        "message": "Prediction history successfully cleared",
        "deleted_count": deleted_count
    }
