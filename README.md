# 🚦 AI Road Traffic Congestion Prediction & Volume Forecasting
### High-Performance In-Browser ML Architecture & XGBoost Regressor Pipeline

An advanced end-to-end Machine Learning web application forecasting highway traffic volume and classifying congestion conditions along Interstate 94 (Minneapolis–St. Paul). The system features an **XGBoost Regressor ($R^2 = 0.95$)** trained through a rigorous chronological time-series pipeline, coupled with a **standalone, zero-backend React dashboard** that evaluates tree ensembles directly in the browser with sub-millisecond latency.

---

## 1. System Architecture: Zero-Backend Client ML

```
                                    USER BROWSER / CLIENT
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                             │
│  ┌─────────────────────────┐          ┌──────────────────────────┐                          │
│  │   Interactive Inputs    │          │  Live Meteorological     │                          │
│  │  - Auto Date/Time       │          │  - Geolocation API       │                          │
│  │  - Weather Overrides    │          │  - Open-Meteo REST API   │                          │
│  └────────────┬────────────┘          └────────────┬─────────────┘                          │
│               │                                    │                                        │
│               └──────────────────┬─────────────────┘                                        │
│                                  │                                                          │
│                                  ▼                                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                     In-Browser Feature Engineering Engine                             │  │
│  │  - Cyclical Harmonic Encodings: sin/cos(hour, day_of_week, month)                    │  │
│  │  - Calendar Flags: is_rush_hour, is_weekend, is_holiday                               │  │
│  │  - StandardScaler Z-Score Normalization (Precomputed Means & Variances)               │  │
│  │  - One-Hot Categorical Mapping (Precomputed Categories)                               │  │
│  └───────────────────────────────────────┬───────────────────────────────────────────────┘  │
│                                          │                                                  │
│                                          ▼                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │              Native JavaScript XGBoost Decision Tree Traversal Engine                 │  │
│  │  - 200 Gradient-Boosted Decision Trees executed sequentially                          │  │
│  │  - IEEE 754 float32 single-precision matching (Math.fround)                           │  │
│  │  - Prediction Parity: Delta < 0.003 veh/hr vs Python XGBoost C++                      │  │
│  │  - Inference Latency: < 0.5 ms (Zero HTTP requests, Zero server cold starts)          │  │
│  └───────────────────────────────────────┬───────────────────────────────────────────────┘  │
│                                          │                                                  │
│                                          ▼                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                          Empirical Congestion Classifier                              │  │
│  │  - LOW: < 2,154 veh/hr | MODERATE: 2,154 - 4,555 veh/hr | HIGH: > 4,555 veh/hr        │  │
│  └───────────────────────────────────────┬───────────────────────────────────────────────┘  │
│                                          │                                                  │
│                                          ▼                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                     Modern Smart City Transit Command UI                              │  │
│  │  - Real-time Capacity Gauge (0 - 7,500 veh/hr)                                        │  │
│  │  - Interactive What-If Scenario Simulator with Live Delta Calculations                │  │
│  │  - LocalStorage Prediction History & CSV Export                                       │  │
│  │  - Model Architecture & Feature Importance Insights                                   │  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
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
- **Node.js 18+** & **npm** (for the frontend application)
- **Python 3.10+** (for training notebook and verification scripts)

---

### Step 1: Launch the Interactive Frontend Dashboard
No backend server required. Run Vite directly:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

#### Features Available in the Dashboard:
- 🕒 **Automatic Date & Time:** Browser local time defaults with manual override controls.
- 📍 **Use My Location:** Browser Geolocation + Open-Meteo REST API for live weather.
- ⚡ **Instant Predictions:** Sub-millisecond client-side XGBoost tree traversal.
- 🎯 **What-If Studio:** Test weather and schedule shifts with interactive presets (Blizzard, Downpour, Peak Rush, Night).
- 📜 **Prediction History:** LocalStorage session tracking with one-click CSV export.
- 🔍 **Architecture Modal:** Inspect live model specifications, $R^2$ explanation, and feature importances.

---

### Step 2: Open and Run the Jupyter ML Notebook
```bash
# Launch interactive Jupyter environment
jupyter notebook notebooks/traffic_prediction_training.ipynb
```
Or execute headlessly with embedded output generation:
```bash
python scripts/run_notebook.py
```

---

### Step 3: Run Model Verification
Verify model artifacts and prediction parity:
```bash
python scripts/verify_ml.py
```

---

## 7. Project Directory Layout

```
Traffic-Congestion-Prediction/
│
├── data/
│   ├── traffic.csv                           # Standardized primary dataset (48,204 rows)
│   └── Metro_Interstate_Traffic_Volume.csv   # Original source reference
│
├── models/
│   ├── best_model.joblib                     # Serialized XGBoost Regressor
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
│   └── verify_ml.py                          # Zero-backend pipeline verification script
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx                    # Navigation, system status, and modal trigger
│   │   │   ├── TrafficForm.jsx               # Feature inputs, live weather & presets
│   │   │   ├── PredictionResult.jsx          # Volume display, badge, metrics breakdown
│   │   │   ├── TrafficGauge.jsx              # SVG semi-circular capacity gauge (0-7,500)
│   │   │   ├── ScenarioSimulator.jsx         # What-If studio with real-time delta
│   │   │   ├── AnalyticsDashboard.jsx        # Chart.js diurnal curves & feature importance
│   │   │   ├── ModelPerformance.jsx          # Single model card with R² explanation
│   │   │   ├── PredictionHistory.jsx         # LocalStorage history table with CSV export
│   │   │   ├── ModelInfoModal.jsx            # Deep-dive architecture & metrics dialog
│   │   │   └── HeroNetworkVisual.jsx         # Futuristic transit grid visualization
│   │   ├── ml/
│   │   │   ├── modelData.json                # Exported 200 XGBoost trees & scaler parameters
│   │   │   ├── prediction.js                 # In-browser float32 tree traversal engine
│   │   │   └── modelAdapter.js               # Unified async client ML prediction adapter
│   │   ├── services/
│   │   │   └── weather.js                    # Browser geolocation + Open-Meteo REST API
│   │   ├── App.jsx                           # Main dashboard coordinator
│   │   ├── index.css                         # Smart city transit control center theme
│   │   └── main.jsx
│   ├── package.json                          # React, Vite, Tailwind, Chart.js, Lucide
│   └── vite.config.js
│
├── requirements.txt                          # Python dependencies for ML & notebook
├── DATASET_ANALYSIS.md                       # Comprehensive dataset audit
└── README.md                                 # Full system documentation
```
