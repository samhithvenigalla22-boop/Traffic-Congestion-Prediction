# 🚦 AI Road Traffic Congestion Prediction & Volume Forecasting
### Full-Stack Machine Learning Architecture: FastAPI, SQLite, React & XGBoost Regressor Pipeline

An advanced end-to-end Machine Learning web application forecasting highway traffic volume and classifying congestion conditions along Interstate 94 (Minneapolis–St. Paul). The system features a **production-grade FastAPI backend**, an **XGBoost Regressor ($R^2 = 0.95$)** trained through a rigorous chronological time-series pipeline, a **SQLite relational database** with **JWT authentication**, and a **high-performance React dashboard** equipped with **dual-mode inference** (FastAPI REST API + in-browser edge fallback).

---

## 1. System Architecture: Full-Stack Hybrid ML Architecture

The application implements a resilient, production-ready hybrid architecture:
1. **FastAPI Python Backend (Primary):** Serves real-time inference via the trained XGBoost model (`joblib`), handles user authentication (JWT + bcrypt), and persists prediction history in a SQLite database via SQLAlchemy ORM.
2. **Interactive React Frontend:** Smart city transit command center UI featuring interactive feature inputs, real-time capacity gauges, What-If scenario simulations, and visual analytics.
3. **Edge Resilience & Client Fallback:** If the backend is temporarily offline or in disconnected environments, the frontend automatically falls back to an embedded native JavaScript XGBoost decision-tree engine (`frontend/src/ml/prediction.js`), guaranteeing 100% uptime with sub-millisecond latency.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     CLIENT / REACT FRONTEND                                      │
│                                                                                                  │
│  ┌─────────────────────────┐          ┌──────────────────────────┐          ┌─────────────────┐  │
│  │   Interactive Inputs    │          │  Live Meteorological     │          │  JWT User Auth  │  │
│  │  - Date & Time Picker   │          │  - Geolocation API       │          │  - Login/Signup │  │
│  │  - Weather Overrides    │          │  - Open-Meteo REST API   │          │  - Auth Context │  │
│  │  - Corridor & Direction │          └────────────┬─────────────┘          └────────┬────────┘  │
│  └────────────┬────────────┘                       │                                 │           │
│               │                                    │                                 │           │
│               └──────────────────┬─────────────────┘                                 │           │
│                                  │                                                   │           │
│                                  ▼                                                   │           │
│                    ┌───────────────────────────┐                                     │           │
│                    │     api.predict(payload)  │ ◄───────────────────────────────────┘           │
│                    └─────────────┬─────────────┘                                                 │
└──────────────────────────────────┼───────────────────────────────────────────────────────────────┘
                                   │
              HTTP POST /predict   │  (Bearer JWT Token + JSON Payload)
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BACKEND / FASTAPI (PORT 8001)                                  │
│                                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                               FastAPI Application Layer (main.py)                          │  │
│  │  - CORS Middleware: Localhost (5173, 3000) & Vercel Production Domains                     │  │
│  │  - Interactive API Documentation: Swagger UI (/docs) & ReDoc (/redoc)                     │  │
│  │  - Endpoints: /health, /auth/signup, /auth/login, /auth/me, /predict, /history            │  │
│  └───────────────────────────────┬────────────────────────────────────────────────────────────┘  │
│                                  │                                                               │
│         ┌────────────────────────┴────────────────────────┬────────────────────────┐             │
│         ▼                                                 ▼                        ▼             │
│  ┌──────────────────────────────┐              ┌─────────────────────┐   ┌────────────────────┐  │
│  │   Authentication & Security  │              │ Feature Engineering │   │   Database Layer   │  │
│  │  - bcrypt password hashing   │              │  - Cyclical Sin/Cos │   │  - SQLite Engine   │  │
│  │  - PyJWT access tokens       │              │  - Rush Hour Flags  │   │  - SQLAlchemy ORM  │  │
│  │  - OAuth2 Bearer security    │              │  - Temp K Converter │   │  - Users Table     │  │
│  └──────────────────────────────┘              └──────────┬──────────┘   │  - Predictions Log │  │
│                                                           │              └────────────────────┘  │
│                                                           ▼                                      │
│                                                ┌─────────────────────┐                           │
│                                                │ ColumnTransformer   │                           │
│                                                │ preprocessing.joblib│                           │
│                                                └──────────┬──────────┘                           │
│                                                           │                                      │
│                                                           ▼                                      │
│                                                ┌─────────────────────┐                           │
│                                                │  XGBoost Regressor  │                           │
│                                                │  best_model.joblib  │                           │
│                                                │  (R² = 0.95, C++)   │                           │
│                                                └──────────┬──────────┘                           │
│                                                           │                                      │
│                                                           ▼                                      │
│                                                ┌─────────────────────┐                           │
│                                                │ Empirical Tercile   │                           │
│                                                │ Congestion Level    │                           │
│                                                │ LOW | MOD | HIGH    │                           │
│                                                └──────────┬──────────┘                           │
│                                                           │                                      │
│         ┌─────────────────────────────────────────────────┴──────────────────────────────────────┘
│         │ JSON Response: { predicted_traffic, congestion_level, r2, mae, rmse, id, ... }
▼         ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 EDGE RESILIENCE & OFFLINE FALLBACK                               │
│                                                                                                  │
│  If backend is unreachable or offline, frontend automatically activates:                         │
│  ┌────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │            Embedded In-Browser XGBoost Traversal Engine (prediction.js)                    │  │
│  │  - 200 Gradient-Boosted Trees compiled to JSON (modelData.json)                            │  │
│  │  - IEEE 754 float32 precision matching (Math.fround)                                       │  │
│  │  - Zero network round-trip, < 0.5 ms inference latency, LocalStorage history fallback     │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Machine Learning Model Specifications

Traffic prediction is formulated fundamentally as a **supervised regression task** to predict continuous vehicle throughput per hour (`traffic_volume`).

### Production Model: XGBoost Regressor (Extreme Gradient Boosting)
- **Architecture:** Tree-based Gradient Boosting Regressor (`objective='reg:squarederror'`)
- **Ensemble Structure:** 200 trees, maximum tree depth = 7, learning rate ($\eta$) = 0.08
- **Regularization:** Subsample ratio = 0.8, Column subsample by tree = 0.8
- **Chronological Split:** 70% Train (33,730 samples) / 15% Validation (7,228 samples) / 15% Test (7,229 samples)

### Held-Out Test Evaluation Performance
| Metric | Value | Rigorous Interpretation |
| :--- | :--- | :--- |
| **Coefficient of Determination ($R^2$)** | **0.95** (0.9484) | **95% of traffic volume variance is explained by the model** on unseen future test data. *(Strict scientific note: $R^2$ represents proportion of explained variance, not percentage accuracy).* |
| **Mean Absolute Error (MAE)** | **282.44** veh/hr | The model's forecasts deviate by an average of only ~282 vehicles per hour against actual sensor counts. |
| **Root Mean Squared Error (RMSE)** | **458.60** veh/hr | Heavily penalizes large deviations, proving minimal extreme prediction errors across peak surges. |

---

## 3. Dataset Summary

- **Primary Dataset Path:** [`data/traffic.csv`](data/traffic.csv)
- **Source:** Metro Interstate 94 Traffic Volume Dataset (UCI Machine Learning Repository / Kaggle)
- **Observations:** 48,204 hourly records spanning 2012 to 2018
- **Target Variable:** `traffic_volume` (continuous integer, range: 0 to 7,280 vehicles/hour)
- **Raw Features:**
  - `date_time`: Hourly timestamp (2012-10-02 09:00:00 to 2018-09-30 23:00:00)
  - `temp`: Ambient temperature in Kelvin (imputing 10 hardware sensor faults at 0.0 K to median 282.4 K)
  - `rain_1h`: Past-hour liquid precipitation in mm (extreme sensor glitch at 9,831 mm capped at 100 mm)
  - `snow_1h`: Past-hour snowfall accumulation in mm
  - `clouds_all`: Cloud coverage percentage (0% to 100%)
  - `weather_main`: Primary meteorological category (Clear, Clouds, Rain, Snow, Drizzle, Mist, Fog, Thunderstorm, Haze, Smoke, Squall)
  - `holiday`: US National and State holidays (61 records across 11 statutory holidays)

---

## 4. Congestion Threshold Methodology

Continuous traffic volume forecasts are mapped into standardized congestion tiers based on **empirical terciles** (33.3% and 66.7% quantiles) of the actual traffic distribution, aligning with Highway Capacity Manual (HCM) Level of Service (LOS) standards:

```
0 veh/hr                          2,154 veh/hr                     4,555 veh/hr                  7,500 veh/hr
├──────────────────────────────────────┼────────────────────────────────┼──────────────────────────────┤
│           LOW CONGESTION             │      MODERATE CONGESTION       │       HIGH CONGESTION        │
│         Free-flow traffic            │      Steady daytime flow       │    Physical road capacity    │
│      (Night & Off-peak hours)        │     (Midday & Weekends)        │     (Peak commuter hours)    │
└──────────────────────────────────────┴────────────────────────────────┴──────────────────────────────┘
```

- **LOW (< 2,154 vehicles/hour):** Free-flow speed, no commuter friction or queueing.
- **MODERATE (2,154 – 4,555 vehicles/hour):** Standard daytime arterial flow; vehicles maneuver freely.
- **HIGH (> 4,555 vehicles/hour):** Operating near/at physical lane capacity; high risk of shockwave delays.

---

## 5. Comprehensive 29-Section Jupyter Notebook

The complete research and engineering pipeline is preserved in:
👉 [`notebooks/traffic_prediction_training.ipynb`](notebooks/traffic_prediction_training.ipynb) (57 cells, 35 visual & numerical outputs).

### Notebook Outline
1. **Project Introduction & Problem Formulation:** ITS motivation and mathematical formulation.
2. **Import Libraries & Environment Setup:** Deterministic random seeds and plotting styling.
3. **Load Dataset:** Raw data ingestion from `data/traffic.csv`.
4. **Data Quality Analysis:** Missing values, duplicates, and non-physical sensor faults.
5. **Data Cleaning:** Hardware zero-Kelvin imputation and rain clipping.
6. **Date/Time Processing:** Temporal decomposition into hour, day, month, year, weekday.
7. **Cyclical Harmonic Encoding:** Orthogonal sine/cosine projections ($\sin(2\pi t/T), \cos(2\pi t/T)$).
8. **Weather & Holiday Features:** Holiday indicator and meteorological standardization.
9. **Feature Engineering Summary:** 18 numerical features and 2 categorical features.
10. **Temporal Leakage Check & Strict Chronological Split:** 70% Train / 15% Val / 15% Test.
11. **Exploratory Data Analysis (EDA):** Bimodal commuter curves, weekday vs. weekend profiles, seasonality.
12. **Correlation Analysis:** Pearson correlation matrix of continuous predictors.
13. **Outlier Analysis:** 1.5 × IQR distribution bounds.
14. **Feature Selection:** Documented inclusion and exclusion criteria.
15. **Preprocessing Pipeline:** scikit-learn `ColumnTransformer` fitted strictly on train partition.
16. **XGBoost Regressor Architecture:** Hyperparameters, tree depth, and subsample settings.
17. **TimeSeriesSplit Cross-Validation:** Sequential fold validation without lookahead bias.
18. **Early Stopping & Validation Monitoring:** Overfitting prevention via validation checkpoints.
19. **Final Model Training:** Production fitting on historical training matrix.
20. **Final Test Set Evaluation:** Benchmark evaluation against unseen future test partition ($R^2 = 0.95$, MAE = 282.44, RMSE = 458.60).
21. **Prediction Error & Residual Diagnostics:** Actual vs. Predicted, Residual distribution, Homoscedasticity.
22. **Congestion Classification via Empirical Terciles:** Discrete categorization.
23. **XGBoost Feature Importance:** Gain and split contributions across all 41 encoded dimensions.
24. **SHAP Explainability & Attribution:** Local and global game-theoretic feature attribution.
25. **What-If Scenario Sensitivity Simulator:** Counterfactual stress-testing under extreme weather/schedules.
26. **Sample Predictions vs Ground Truth:** Tabular verification across diverse test timestamps.
27. **Model Performance Summary:** Executive benchmarking scorecard.
28. **Artifact Serialization:** Exporting `best_model.joblib`, `preprocessing.joblib`, and `model_metadata.json`.
29. **Frontend Integration & Client-Side Export:** In-browser JSON tree matrix compilation.

---

## 6. How to Run the Project

### Prerequisites
- **Python 3.10+** (for FastAPI backend and ML pipeline)
- **Node.js 18+** & **npm** (for the React frontend)

---

### Step 1: Start the FastAPI Backend Server
The backend handles authentication, SQLite persistence, and server-side XGBoost predictions.

```bash
# Navigate to the backend directory
cd backend

# Create and activate a Python virtual environment (if not already created)
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Run the FastAPI server with Uvicorn on port 8001
uvicorn main:app --reload --port 8001
```

- **API Base URL:** `http://localhost:8001`
- **Interactive Swagger Docs (OpenAPI):** `http://localhost:8001/docs`
- **ReDoc Documentation:** `http://localhost:8001/redoc`
- **Health Check Endpoint:** `http://localhost:8001/health`

#### Available Backend Endpoints:
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Server health, model status, and database type | No |
| `POST` | `/auth/signup` | Register new user account (name, email, password, phone) | No |
| `POST` | `/auth/login` | Authenticate and obtain JWT access token | No |
| `GET` | `/auth/me` | Fetch authenticated user profile details | Yes (Bearer JWT) |
| `POST` | `/predict` | Run XGBoost inference on input features and record history | Optional |
| `GET` | `/history` | Retrieve user's past 100 predictions | Yes (Bearer JWT) |
| `DELETE` | `/history` | Clear prediction history for current user | Yes (Bearer JWT) |

---

### Step 2: Start the Interactive React Frontend
In a new terminal window, start the React application:

```bash
# Navigate to the frontend directory
cd frontend

# Install frontend dependencies
npm install

# Run the Vite development server
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

#### Features Available in the Dashboard:
- 🔐 **User Authentication:** Complete Sign Up, Sign In, and persistent session management powered by JWT and SQLite.
- 🕒 **Automatic Date & Time:** Browser local time defaults with manual override controls.
- 📍 **Live Location & Weather:** Browser Geolocation + Open-Meteo REST API integration for real-time weather parameters.
- ⚡ **Dual-Mode ML Inference:** Communicates with the FastAPI backend for authenticated, server-side inference, with automatic seamless in-browser fallback.
- 🎯 **What-If Scenario Studio:** Counterfactual analysis to simulate blizzards, downpours, peak rush hour surges, and late-night conditions.
- 📊 **Dynamic Visual Analytics:** SVG capacity gauge (0 - 7,500 veh/hr), diurnal commuter curve charts, and feature importance breakdowns.
- 📜 **Prediction History & Export:** Real-time synchronized history with CSV download capability.
- 🔍 **Architecture & Model Specs Modal:** Live inspection of XGBoost parameters, $R^2$ variance explanation, and mathematical formulations.

---

### Step 3: Open and Run the Jupyter ML Notebook (Optional)
To retrain the model or reproduce all 29 research sections:

```bash
# Launch interactive Jupyter environment
jupyter notebook notebooks/traffic_prediction_training.ipynb
```
Or execute headlessly with embedded output generation:
```bash
python scripts/run_notebook.py
```

---

### Step 4: Run Model Verification
Verify model artifacts, test set performance, and prediction parity:
```bash
python scripts/verify_ml.py
```

---

## 7. Project Directory Layout

```
Traffic-Congestion-Prediction/
│
├── backend/                                  # FastAPI Backend Application
│   ├── auth.py                               # JWT token creation, verification & bcrypt hashing
│   ├── database.py                           # SQLAlchemy engine, session maker & SQLite connection
│   ├── main.py                               # FastAPI app, CORS, routes & XGBoost inference handler
│   ├── models.py                             # SQLAlchemy ORM models (User, Prediction)
│   ├── schemas.py                            # Pydantic v2 validation models & request/response schemas
│   ├── requirements.txt                      # Backend Python dependencies (FastAPI, PyJWT, XGBoost, etc.)
│   ├── traffic_app.db                        # SQLite database file storing users & prediction logs
│   ├── .env                                  # Environment variables (SECRET_KEY, CORS_ORIGINS, DB_URL)
│   └── models/                               # Backend model artifacts directory (symlinked/mirrored)
│       ├── best_model.joblib
│       ├── preprocessing.joblib
│       └── model_metadata.json
│
├── data/
│   ├── traffic.csv                           # Standardized primary dataset (48,204 rows)
│   └── Metro_Interstate_Traffic_Volume.csv   # Original source reference
│
├── models/
│   ├── best_model.joblib                     # Serialized XGBoost Regressor (C++ engine)
│   ├── preprocessing.joblib                  # Serialized ColumnTransformer pipeline
│   └── model_metadata.json                   # Model specifications, metrics & terciles
│
├── notebooks/
│   └── traffic_prediction_training.ipynb     # Executed 29-section Jupyter notebook (806 KB)
│
├── scripts/
│   ├── generate_complete_notebook.py         # Builds the comprehensive 29-section notebook
│   ├── run_notebook.py                       # Executes notebook with cell-by-cell validation
│   ├── export_model_to_frontend.py           # Exports trees & preprocessing to client JSON
│   ├── train.py                              # Python CLI model training script
│   └── verify_ml.py                          # Full-pipeline model verification script
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx                    # Navigation, system status, auth state & modal triggers
│   │   │   ├── Login.jsx                     # JWT Login modal/card component
│   │   │   ├── Signup.jsx                    # User registration modal/card component
│   │   │   ├── TrafficForm.jsx               # Feature inputs, live weather & presets
│   │   │   ├── PredictionResult.jsx          # Volume display, badge, metrics breakdown
│   │   │   ├── TrafficGauge.jsx              # SVG semi-circular capacity gauge (0-7,500)
│   │   │   ├── ScenarioSimulator.jsx         # What-If studio with real-time delta
│   │   │   ├── AnalyticsDashboard.jsx        # Chart.js diurnal curves & feature importance
│   │   │   ├── ModelPerformance.jsx          # Model scorecard with R² explanation
│   │   │   ├── PredictionHistory.jsx         # Synchronized history table with CSV export
│   │   │   ├── ModelInfoModal.jsx            # Deep-dive architecture & metrics dialog
│   │   │   ├── HeroNetworkVisual.jsx         # Futuristic transit grid visualization
│   │   │   ├── LocationSelector.jsx          # Corridor & prediction point selection
│   │   │   └── ThemeSelector.jsx             # Visual theme switcher
│   │   ├── context/
│   │   │   └── AuthContext.jsx               # React Auth Context for JWT session state
│   │   ├── config/
│   │   │   └── api.js                        # Unified Axios/Fetch API client with auth headers
│   │   ├── ml/
│   │   │   ├── modelData.json                # Exported 200 XGBoost trees & scaler parameters
│   │   │   ├── prediction.js                 # In-browser float32 tree traversal engine (fallback)
│   │   │   └── modelAdapter.js               # Unified async client ML prediction adapter
│   │   ├── services/
│   │   │   └── weather.js                    # Browser geolocation + Open-Meteo REST API
│   │   ├── App.jsx                           # Main dashboard coordinator
│   │   ├── index.css                         # Smart city transit control center theme
│   │   └── main.jsx
│   ├── package.json                          # React, Vite, Tailwind, Chart.js, Lucide
│   └── vite.config.js
│
├── requirements.txt                          # Python dependencies for ML pipeline & notebook
├── DATASET_ANALYSIS.md                       # Comprehensive dataset audit
└── README.md                                 # Full system documentation
```
