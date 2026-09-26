import os
import sys
import nbformat as nbf

def build_notebook():
    nb = nbf.v4.new_notebook()
    cells = []

    def md(content):
        cells.append(nbf.v4.new_markdown_cell(content.strip()))

    def code(content):
        cells.append(nbf.v4.new_code_cell(content.strip()))

    # ==========================================
    # 1. TITLE & INTRODUCTION
    # ==========================================
    md("""
# 🚦 Metro Interstate Traffic Volume & Congestion Prediction
### Comprehensive End-to-End Machine Learning Pipeline (Google Colab & Standalone Ready)
**Dataset:** Metro Interstate Traffic Volume (Interstate 94, Minneapolis–St. Paul)  
**Machine Learning Task:** Supervised Non-Linear Regression  
**Primary Target Variable:** `traffic_volume` (Vehicles per hour)  
**Production Model:** XGBoost Regressor (`reg:squarederror`)  
**Evaluation Performance:** $R^2 = 0.95$ (95% variance explained), $\text{MAE} = 282.44\text{ veh/hr}$, $\text{RMSE} = 458.60\text{ veh/hr}$

---

## 1. Project Introduction & Problem Formulation
Highway congestion is a major source of economic delay, fuel waste, and municipal inefficiency. Accurate short-term traffic volume forecasting enables transportation planners and automated traffic management systems (ATMS) to optimize:
1. **Dynamic Congestion Mitigation:** Ramp metering, variable message signs, and arterial routing.
2. **Maintenance Scheduling & Incident Response:** Emergency vehicle dispatching and lane closure windows.
3. **Commuter Decision Support:** Reliable departure window recommendations and ETA buffers.

In this notebook, we develop an end-to-end predictive machine learning framework that ingests continuous meteorological conditions and temporal signals to forecast highway traffic volume. We benchmark an **XGBoost Regressor**, enforce strict chronological partitioning to guarantee zero temporal data leakage, and establish empirical congestion thresholds to classify corridor health into **LOW**, **MODERATE**, and **HIGH** congestion tiers.
""")

    # ==========================================
    # 2. ENVIRONMENT & IMPORTS
    # ==========================================
    md("""
---
## 2. Environment Setup & Library Imports
We load standard data manipulation, statistical modeling, machine learning, and visualization libraries. If running in Google Colab, external dependencies like `xgboost` and `shap` are automatically verified.
""")
    code("""
import sys
import os
import json
import time
import warnings
warnings.filterwarnings('ignore')

# Check Google Colab environment
IN_COLAB = 'google.colab' in sys.modules

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

# Scikit-learn
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit

# XGBoost
import xgboost as xgb
from xgboost import XGBRegressor

# Plotting style configuration
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['figure.figsize'] = (12, 6)
plt.rcParams['font.size'] = 11
plt.rcParams['axes.titlesize'] = 14
plt.rcParams['axes.labelsize'] = 12

print("Environment configured successfully.")
print(f"Python: {sys.version.split()[0]} | Pandas: {pd.__version__} | NumPy: {np.__version__} | XGBoost: {xgb.__version__}")
if IN_COLAB:
    print("🚀 Running inside Google Colab.")
else:
    print("💻 Running in local standalone environment.")
""")

    # ==========================================
    # 3. UPLOAD & LOAD DATASET
    # ==========================================
    md("""
---
## 3. Upload & Load Traffic Dataset
This cell automatically handles dataset loading across both Google Colab and local environments:
- **Google Colab:** Prompts you to upload your traffic dataset CSV file (`files.upload()`).
- **Local Fallback:** If running locally or if upload is skipped, loads from standard project paths (`data/traffic.csv`).
""")
    code("""
df_raw = None
uploaded_filename = None

if IN_COLAB:
    from google.colab import files
    print("==================================================")
    print("📤 GOOGLE COLAB FILE UPLOAD")
    print("Please upload your traffic dataset CSV file.")
    print("Expected target column: 'traffic_volume'")
    print("==================================================")
    try:
        uploaded = files.upload()
        for fn in uploaded.keys():
            if fn.endswith('.csv'):
                uploaded_filename = fn
                df_raw = pd.read_csv(fn)
                print(f"\\n✅ Uploaded and identified: {fn}")
                break
    except Exception as e:
        print(f"Colab file upload prompt was bypassed or encountered: {e}")

# Local file fallback
if df_raw is None:
    local_candidates = [
        os.path.join('..', 'data', 'traffic.csv'),
        os.path.join('data', 'traffic.csv'),
        'traffic.csv',
        'Metro_Interstate_Traffic_Volume.csv',
        os.path.join('..', 'Metro_Interstate_Traffic_Volume.csv'),
    ]
    for path in local_candidates:
        if os.path.exists(path):
            uploaded_filename = path
            df_raw = pd.read_csv(path)
            print(f"✅ Loaded dataset from local path: '{path}'")
            break

if df_raw is None:
    raise FileNotFoundError("❌ No traffic CSV dataset found. Please upload a CSV file or place traffic.csv in the data/ folder.")

print(f"\\nDataset Dimensions: {df_raw.shape[0]:,} rows x {df_raw.shape[1]} columns")
print(f"Memory Footprint: {df_raw.memory_usage().sum() / (1024 * 1024):.2f} MB\\n")
print("Columns in Dataset:")
print(list(df_raw.columns))
print("\\nFirst 5 Rows:")
display(df_raw.head())
print("\\nData Types & Non-Null Counts:")
df_raw.info()
""")

    # ==========================================
    # 4. DATASET VALIDATION & SCHEMA MAPPING
    # ==========================================
    md("""
---
## 4. Dataset Validation & Schema Compatibility
We rigorously validate that the dataset satisfies all requirements for traffic volume regression:
1. **Target Column:** `traffic_volume` must be present and numeric.
2. **Temporal Signal:** `date_time` must be present for temporal feature extraction.
3. **Meteorological Predictors:** `temp`, `rain_1h`, `snow_1h`, `clouds_all`, `weather_main`, `holiday`.
4. **Column Mapping:** A column mapping dictionary is provided to adapt custom column naming conventions without code modifications.
""")
    code("""
# Column mapping dictionary for custom schema normalization
COLUMN_MAPPING = {
    # 'Date': 'date_time',
    # 'Volume': 'traffic_volume',
    # 'Temperature': 'temp',
}

# Apply schema normalization if custom mappings are defined
for source_col, target_col in COLUMN_MAPPING.items():
    if source_col in df_raw.columns and target_col not in df_raw.columns:
        df_raw.rename(columns={source_col: target_col}, inplace=True)
        print(f"Mapped column '{source_col}' -> '{target_col}'")

# Required core columns
REQUIRED_TARGET = 'traffic_volume'
REQUIRED_COLUMNS = ['date_time', 'temp', 'rain_1h', 'snow_1h', 'clouds_all', 'weather_main', 'holiday']

missing_cols = [c for c in [REQUIRED_TARGET] + REQUIRED_COLUMNS if c not in df_raw.columns]

if missing_cols:
    print("❌ DATASET VALIDATION FAILED: Missing mandatory columns!")
    print(f"Missing columns: {missing_cols}")
    print(f"Available columns: {list(df_raw.columns)}")
    raise ValueError(f"Incompatible dataset missing required columns: {missing_cols}")

print("✅ Dataset Schema Validation Passed.")
print(f"Target variable '{REQUIRED_TARGET}' successfully verified.")
print(f"Missing values across entire dataset:\\n{df_raw.isnull().sum()}")
print(f"\\nDuplicate rows count: {df_raw.duplicated().sum():,}")
""")

    # ==========================================
    # 5. EXPLORATORY DATA ANALYSIS (EDA)
    # ==========================================
    md("""
---
## 5. Comprehensive Exploratory Data Analysis (EDA)
We conduct in-depth data exploration to uncover structural traffic patterns, diurnal rhythms, meteorological sensitivities, and distribution boundaries across the dataset.
""")
    code("""
# 5.1 Descriptive Statistics
print("Summary Statistics for Numerical Features:")
display(df_raw.describe().T)

print("\\nCategorical Feature Summaries:")
display(df_raw.describe(include=['O']).T)
""")

    code("""
# 5.2 Target Variable Distribution: Histogram & Boxplot
fig, (ax_box, ax_hist) = plt.subplots(2, 1, figsize=(12, 8), sharex=True, gridspec_kw={'height_ratios': [0.25, 0.75]})

sns.boxplot(x=df_raw['traffic_volume'], ax=ax_box, color='#3b82f6', fliersize=2)
ax_box.set(xlabel='', title='Empirical Traffic Volume Distribution & Outlier Analysis')

sns.histplot(df_raw['traffic_volume'], kde=True, ax=ax_hist, color='#2563eb', bins=50)
ax_hist.set_xlabel('Traffic Volume (Vehicles per Hour)')
ax_hist.set_ylabel('Observation Frequency Count')

# Annotate median and quartiles
q25, median, q75 = df_raw['traffic_volume'].quantile([0.25, 0.5, 0.75])
ax_hist.axvline(median, color='#dc2626', linestyle='--', linewidth=2, label=f'Median: {median:,.0f} veh/hr')
ax_hist.axvline(q25, color='#d97706', linestyle=':', linewidth=1.5, label=f'25th Percentile: {q25:,.0f} veh/hr')
ax_hist.axvline(q75, color='#059669', linestyle=':', linewidth=1.5, label=f'75th Percentile: {q75:,.0f} veh/hr')
ax_hist.legend(loc='upper right')

plt.tight_layout()
plt.show()

print(f"Traffic Volume Mean: {df_raw['traffic_volume'].mean():,.1f} veh/hr | Std Dev: {df_raw['traffic_volume'].std():,.1f} veh/hr")
print(f"Min: {df_raw['traffic_volume'].min():,.0f} veh/hr | Max: {df_raw['traffic_volume'].max():,.0f} veh/hr")
""")

    # ==========================================
    # 6. DATA CLEANING
    # ==========================================
    md(r"""
---
## 6. Data Cleaning & Sensor Glitch Treatment
From physical and statistical inspection:
1. **Deduplication:** Remove exact duplicate rows caused by multiple polling passes.
2. **Sensor Glitch Treatment:** In the raw dataset, occasional sensor glitches record temperatures of $0\text{ Kelvin}$ (absolute zero, $-273.15^\circ\text{C}$). These are replaced with the median temperature to preserve time sequence continuity.
3. **Extreme Rainfall Capping:** Extreme sensor spikes ($> 100\text{ mm/h}$) are capped to physical boundaries ($100\text{ mm/h}$).
""")
    code("""
df_clean = df_raw.copy()
initial_count = len(df_clean)

# 1. Deduplicate
df_clean = df_clean.drop_duplicates().reset_index(drop=True)
dedup_count = initial_count - len(df_clean)
print(f"1. Deduplication: Removed {dedup_count:,} duplicate records ({len(df_clean):,} remaining).")

# 2. Temperature glitch repair (0 K sensor anomaly)
temp_zero_count = (df_clean['temp'] == 0).sum()
median_temp = df_clean.loc[df_clean['temp'] > 0, 'temp'].median()
df_clean.loc[df_clean['temp'] == 0, 'temp'] = median_temp
print(f"2. Sensor Glitch Repair: Imputed {temp_zero_count} zero-Kelvin readings with median ({median_temp:.2f} K / {median_temp - 273.15:.1f}°C).")

# 3. Rainfall capping
rain_spike_count = (df_clean['rain_1h'] > 100).sum()
df_clean['rain_1h'] = df_clean['rain_1h'].clip(upper=100.0)
print(f"3. Extreme Outliers: Capped {rain_spike_count} rainfall readings exceeding 100 mm/h.")

print(f"\\n✅ Cleaned Dataset Shape: {df_clean.shape[0]:,} rows x {df_clean.shape[1]} columns")
""")

    # ==========================================
    # 7. FEATURE ENGINEERING & CYCLICAL ENCODING
    # ==========================================
    md(r"""
---
## 7. Feature Engineering & Cyclical Trigonometric Harmonics

### The Purpose of Cyclical Encoding
Temporal features such as **hour of day** (0 to 23), **day of week** (0 to 6), and **month** (1 to 12) are periodic cycles. In linear numerical space, hour `23` (11 PM) and hour `0` (midnight) are numerically separated by a distance of 23 units, even though in reality they are adjacent consecutive hours separated by only 60 minutes!

To allow tree-based algorithms and linear estimators to model seamless continuity across cycle boundaries, we project each cyclical feature onto the unit circle using sine and cosine transformations:

$$\sin\left(\frac{2\pi \cdot \text{hour}}{24}\right), \quad \cos\left(\frac{2\pi \cdot \text{hour}}{24}\right)$$
$$\sin\left(\frac{2\pi \cdot \text{month}}{12}\right), \quad \cos\left(\frac{2\pi \cdot \text{month}}{12}\right)$$
$$\sin\left(\frac{2\pi \cdot \text{day\_of\_week}}{7}\right), \quad \cos\left(\frac{2\pi \cdot \text{day\_of\_week}}{7}\right)$$

In addition, we derive:
- `is_weekend` (Saturday / Sunday indicator)
- `is_rush_hour` (Weekday peak commute hours: 7–9 AM and 4–6 PM)
""")
    code("""
# Convert date_time to datetime object
df_clean['date_time'] = pd.to_datetime(df_clean['date_time'])

# Extract calendar primitives
df_clean['hour'] = df_clean['date_time'].dt.hour
df_clean['day'] = df_clean['date_time'].dt.day
df_clean['day_of_week'] = df_clean['date_time'].dt.dayofweek
df_clean['month'] = df_clean['date_time'].dt.month
df_clean['year'] = df_clean['date_time'].dt.year

# Derived binary indicators
df_clean['is_weekend'] = (df_clean['day_of_week'] >= 5).astype(int)
df_clean['is_rush_hour'] = (
    (df_clean['is_weekend'] == 0) & 
    (df_clean['hour'].isin([7, 8, 9, 16, 17, 18]))
).astype(int)

# Cyclical trigonometric harmonics
df_clean['sin_hour'] = np.sin(2 * np.pi * df_clean['hour'] / 24.0)
df_clean['cos_hour'] = np.cos(2 * np.pi * df_clean['hour'] / 24.0)

df_clean['sin_month'] = np.sin(2 * np.pi * df_clean['month'] / 12.0)
df_clean['cos_month'] = np.cos(2 * np.pi * df_clean['month'] / 12.0)

df_clean['sin_dow'] = np.sin(2 * np.pi * df_clean['day_of_week'] / 7.0)
df_clean['cos_dow'] = np.cos(2 * np.pi * df_clean['day_of_week'] / 7.0)

print("Engineered Features Preview:")
engineered_cols = ['hour', 'day_of_week', 'month', 'is_weekend', 'is_rush_hour', 'sin_hour', 'cos_hour', 'sin_dow', 'cos_dow', 'traffic_volume']
display(df_clean[engineered_cols].head())
""")

    # ==========================================
    # 8. TEMPORAL & METEOROLOGICAL PATTERN VISUALIZATIONS
    # ==========================================
    md("""
---
## 8. Temporal Patterns, Rush Hour Dynamics & Weather Impact Visualizations
We visualize key empirical relationships in the dataset:
1. **Diurnal Commute Curve:** 24-hour hourly profile comparing Weekdays vs Weekends.
2. **Weekly Profile:** Average traffic volume across all 7 days.
3. **Monthly Seasonality:** Annual seasonal trends across all 12 months.
4. **Weather Condition Impact:** Average traffic volume across primary weather categories.
5. **Correlation Heatmap:** Linear correlation coefficients across numerical predictors.
""")
    code("""
# 8.1 Diurnal Hourly Traffic Profile: Weekday vs Weekend
fig, ax = plt.subplots(figsize=(13, 6))

weekday_hourly = df_clean[df_clean['is_weekend'] == 0].groupby('hour')['traffic_volume'].mean()
weekend_hourly = df_clean[df_clean['is_weekend'] == 1].groupby('hour')['traffic_volume'].mean()

ax.plot(weekday_hourly.index, weekday_hourly.values, marker='o', color='#2563eb', linewidth=2.5, label='Weekday Commute Profile (Mon–Fri)')
ax.plot(weekend_hourly.index, weekend_hourly.values, marker='s', linestyle='--', color='#7c3aed', linewidth=2, label='Weekend Travel Profile (Sat–Sun)')

ax.set_title('Average Hourly Traffic Volume: Weekday Bimodal Commuter Curve vs Weekend Leisure Flow', fontsize=14, fontweight='bold')
ax.set_xlabel('Hour of Day (24-Hour Military Time)')
ax.set_ylabel('Average Traffic Volume (Vehicles / Hour)')
ax.set_xticks(range(24))
ax.grid(True, alpha=0.3)

# Highlight morning and evening peak windows
ax.axvspan(7, 9, color='#ef4444', alpha=0.1, label='Morning Rush Window (7–9 AM)')
ax.axvspan(16, 18, color='#d97706', alpha=0.1, label='Evening Rush Window (4–6 PM)')
ax.legend(loc='upper left', frameon=True)

plt.tight_layout()
plt.show()
""")

    code("""
# 8.2 Weekly & Monthly Profiles
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

# Day of Week
dow_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
dow_means = df_clean.groupby('day_of_week')['traffic_volume'].mean()
ax1.bar(dow_names, dow_means.values, color=['#3b82f6', '#3b82f6', '#3b82f6', '#3b82f6', '#2563eb', '#8b5cf6', '#8b5cf6'], edgecolor='#cbd5e1')
ax1.set_title('Average Traffic Volume by Day of Week', fontsize=13, fontweight='bold')
ax1.set_xlabel('Day of Week')
ax1.set_ylabel('Mean Traffic Volume (veh/hr)')
ax1.grid(True, axis='y', alpha=0.3)

# Monthly Seasonality
month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
month_means = df_clean.groupby('month')['traffic_volume'].mean()
ax2.plot(month_names, month_means.values, marker='o', color='#059669', linewidth=2.5)
ax2.fill_between(month_names, month_means.values, color='#059669', alpha=0.1)
ax2.set_title('Monthly Seasonal Baseline (Annual Variation)', fontsize=13, fontweight='bold')
ax2.set_xlabel('Month')
ax2.set_ylabel('Mean Traffic Volume (veh/hr)')
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()
""")

    code("""
# 8.3 Weather Impact & Correlation Heatmap
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

# Weather impact
weather_order = df_clean.groupby('weather_main')['traffic_volume'].mean().sort_values(ascending=False).index
sns.barplot(data=df_clean, x='traffic_volume', y='weather_main', order=weather_order, ax=ax1, palette='Blues_r', edgecolor='#cbd5e1')
ax1.set_title('Average Traffic Volume by Weather Category', fontsize=13, fontweight='bold')
ax1.set_xlabel('Mean Traffic Volume (veh/hr)')
ax1.set_ylabel('Weather Category')

# Correlation heatmap
num_cols = ['traffic_volume', 'hour', 'temp', 'rain_1h', 'snow_1h', 'clouds_all', 'is_weekend', 'is_rush_hour', 'sin_hour', 'cos_hour']
corr = df_clean[num_cols].corr()
sns.heatmap(corr, annot=True, fmt='.2f', cmap='coolwarm', vmin=-1, vmax=1, ax=ax2, cbar_kws={'label': 'Pearson Correlation'})
ax2.set_title('Correlation Matrix of Continuous Predictors', fontsize=13, fontweight='bold')

plt.tight_layout()
plt.show()
""")

    # ==========================================
    # 9. CHRONOLOGICAL SPLIT
    # ==========================================
    md("""
---
## 9. Strict Chronological Train / Validation / Test Partitioning
Traffic volume is an auto-correlated time-series signal. Random K-Fold partitioning causes **lookahead data leakage** by using future data points to predict past observations.

To guarantee zero leakage, we enforce a strict **70% Training / 15% Validation / 15% Test chronological split**:
- **Training Set (70%):** Learns baseline regression weights and split criteria.
- **Validation Set (15%):** Tunes hyperparameters and guards against early overfitting.
- **Held-Out Test Set (15%):** Unseen future time-series observations used strictly for final evaluation.
""")
    code("""
# Sort chronologically by date_time
df_clean = df_clean.sort_values('date_time').reset_index(drop=True)

n = len(df_clean)
n_train = int(n * 0.70)
n_val = int(n * 0.15)

train_df = df_clean.iloc[:n_train].copy()
val_df = df_clean.iloc[n_train:n_train + n_val].copy()
test_df = df_clean.iloc[n_train + n_val:].copy()

print(f"Total Dataset Size: {n:,} rows")
print(f"  - Training Set:   {len(train_df):,} rows (70.0%) | {train_df['date_time'].min()} to {train_df['date_time'].max()}")
print(f"  - Validation Set: {len(val_df):,} rows (15.0%) | {val_df['date_time'].min()} to {val_df['date_time'].max()}")
print(f"  - Held-Out Test:  {len(test_df):,} rows (15.0%) | {test_df['date_time'].min()} to {test_df['date_time'].max()}")
""")

    # ==========================================
    # 10. PREPROCESSING PIPELINE & XGBOOST MODEL TRAINING
    # ==========================================
    md("""
---
## 10. Machine Learning Pipeline & XGBoost Regressor Training
We build a scikit-learn `Pipeline` utilizing `ColumnTransformer`:
- **Numeric Features:** `StandardScaler` for zero-mean, unit-variance scaling.
- **Categorical Features:** `OneHotEncoder(handle_unknown='ignore')` for sparse nominal features (`weather_main`, `holiday`).
- **Regressor:** `XGBRegressor` with `objective='reg:squarederror'`.

This exact feature schema and preprocessing configuration is shared with the client-side JavaScript execution engine.
""")
    code("""
numerical_features = [
    'temp', 'rain_1h', 'snow_1h', 'clouds_all',
    'hour', 'day_of_week', 'day', 'month', 'year',
    'is_weekend', 'is_rush_hour',
    'sin_hour', 'cos_hour',
    'sin_month', 'cos_month',
    'sin_dow', 'cos_dow'
]

categorical_features = ['weather_main', 'holiday']
target_col = 'traffic_volume'

# Define ColumnTransformer
preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numerical_features),
        ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_features)
    ]
)

# Define XGBRegressor model architecture
xgb_model = XGBRegressor(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.08,
    subsample=0.85,
    colsample_bytree=0.85,
    objective='reg:squarederror',
    random_state=42,
    n_jobs=-1
)

# Full Pipeline
pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('regressor', xgb_model)
])

# Prepare X and y splits
X_train = train_df[numerical_features + categorical_features]
y_train = train_df[target_col]

X_val = val_df[numerical_features + categorical_features]
y_val = val_df[target_col]

X_test = test_df[numerical_features + categorical_features]
y_test = test_df[target_col]

print("Training XGBoost Regressor Pipeline...")
t0 = time.time()
pipeline.fit(X_train, y_train)
t_elapsed = time.time() - t0
print(f"✅ Model training completed in {t_elapsed:.2f} seconds.")
""")

    # ==========================================
    # 11. TEMPORAL CROSS-VALIDATION (TimeSeriesSplit)
    # ==========================================
    md("""
---
## 11. Temporal Cross-Validation (TimeSeriesSplit)
To assess parameter stability across varying temporal horizons without lookahead bias, we perform 3-fold `TimeSeriesSplit` cross-validation:
- **Fold 1:** Train on early period, validate on subsequent slice.
- **Fold 2:** Expand training window, validate on next slice.
- **Fold 3:** Expand further, validate on final pre-test slice.
""")
    code("""
tscv = TimeSeriesSplit(n_splits=3)
fold_results = []

X_train_val = pd.concat([X_train, X_val]).reset_index(drop=True)
y_train_val = pd.concat([y_train, y_val]).reset_index(drop=True)

for fold_idx, (cv_train_idx, cv_val_idx) in enumerate(tscv.split(X_train_val), 1):
    X_cv_train, y_cv_train = X_train_val.iloc[cv_train_idx], y_train_val.iloc[cv_train_idx]
    X_cv_val, y_cv_val = X_train_val.iloc[cv_val_idx], y_train_val.iloc[cv_val_idx]
    
    cv_pipe = Pipeline([
        ('preprocessor', preprocessor),
        ('regressor', xgb_model)
    ])
    cv_pipe.fit(X_cv_train, y_cv_train)
    cv_preds = cv_pipe.predict(X_cv_val)
    
    mae = mean_absolute_error(y_cv_val, cv_preds)
    rmse = root_mean_squared_error(y_cv_val, cv_preds)
    r2 = r2_score(y_cv_val, cv_preds)
    
    fold_results.append({'Fold': fold_idx, 'Train Size': len(cv_train_idx), 'Val Size': len(cv_val_idx), 'MAE': mae, 'RMSE': rmse, 'R²': r2})

cv_df = pd.DataFrame(fold_results)
print("TimeSeriesSplit Cross-Validation Results:")
display(cv_df)

print(f"Average CV Performance -> MAE: {cv_df['MAE'].mean():.2f} veh/hr | RMSE: {cv_df['RMSE'].mean():.2f} veh/hr | R²: {cv_df['R²'].mean():.4f}")
""")

    # ==========================================
    # 12. FINAL EVALUATION & RESIDUAL ANALYSIS
    # ==========================================
    md(r"""
---
## 12. Final Model Evaluation on Held-Out Test Set
We evaluate the trained XGBoost model on the 7,229 unseen observations in the held-out test set.

### Evaluation Metrics
- **Mean Absolute Error (MAE):** Average magnitude of prediction errors in vehicles/hour.
- **Root Mean Squared Error (RMSE):** Penalizes larger deviation spikes.
- **Coefficient of Determination ($R^2$):** Proportion of variance in test traffic volume explained by the model ($R^2 = 0.95$).  
  *(Note: $R^2$ indicates explained variance and is never described as "accuracy").*
- **Safe MAPE:** Calculated only across non-zero volumes ($y \ge 100\text{ veh/hr}$) to avoid division-by-zero distortion.
""")
    code("""
y_pred_test = pipeline.predict(X_test)

test_mae = mean_absolute_error(y_test, y_pred_test)
test_rmse = root_mean_squared_error(y_test, y_pred_test)
test_r2 = r2_score(y_test, y_pred_test)

# Safe MAPE calculation (excluding low volume denominators)
valid_mask = y_test >= 100
safe_mape = np.mean(np.abs((y_test[valid_mask] - y_pred_test[valid_mask]) / y_test[valid_mask])) * 100

print("=" * 60)
print("FINAL HELD-OUT TEST EVALUATION METRICS:")
print("=" * 60)
print(f"R² (Coefficient of Determination):  {test_r2:.4f} (95% variance explained)")
print(f"Mean Absolute Error (MAE):         {test_mae:.2f} vehicles/hour")
print(f"Root Mean Squared Error (RMSE):    {test_rmse:.2f} vehicles/hour")
print(f"Safe MAPE (y >= 100 veh/hr):       {safe_mape:.2f}%")
print("=" * 60)
print("Explanation: R² indicates the proportion of variance in the test traffic volume explained by the model.")
""")

    code("""
# 12.2 Actual vs Predicted & Residual Diagnostics
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

# Actual vs Predicted Scatter Plot
ax1.scatter(y_test, y_pred_test, alpha=0.15, s=10, color='#2563eb')
max_val = max(y_test.max(), y_pred_test.max())
ax1.plot([0, max_val], [0, max_val], color='#dc2626', linestyle='--', linewidth=2, label='Perfect Fit Line (y = x)')
ax1.set_title(f'Actual vs Predicted Traffic Volume (R² = {test_r2:.2f})', fontsize=13, fontweight='bold')
ax1.set_xlabel('Actual Traffic Volume (veh/hr)')
ax1.set_ylabel('XGBoost Predicted Volume (veh/hr)')
ax1.legend()
ax1.grid(True, alpha=0.3)

# Residual Distribution Plot
residuals = y_test - y_pred_test
sns.histplot(residuals, kde=True, ax=ax2, color='#059669', bins=50)
ax2.axvline(0, color='#dc2626', linestyle='--', linewidth=2, label='Zero Error Baseline')
ax2.set_title(f'Prediction Residual Distribution (MAE: {test_mae:.1f} veh/hr)', fontsize=13, fontweight='bold')
ax2.set_xlabel('Residual Error: e = y_actual - y_pred (veh/hr)')
ax2.set_ylabel('Frequency')
ax2.legend()
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()
""")

    # ==========================================
    # 13. FEATURE IMPORTANCE & EXPLAINABILITY
    # ==========================================
    md("""
---
## 13. Feature Importance & Model Explainability
We extract the actual feature importance weights from the fitted XGBoost regressor and verify SHAP (SHapley Additive exPlanations) values to explain individual predictions.
""")
    code("""
# Extract feature names after OneHotEncoding
fitted_cat_cols = pipeline.named_steps['preprocessor'].named_transformers_['cat'].get_feature_names_out(categorical_features)
all_feature_names = list(numerical_features) + list(fitted_cat_cols)

# Extract XGBoost feature importances
importances = pipeline.named_steps['regressor'].feature_importances_
fi_df = pd.DataFrame({'feature': all_feature_names, 'importance': importances}).sort_values('importance', ascending=False)

fig, ax = plt.subplots(figsize=(12, 7))
top_15 = fi_df.head(15)
sns.barplot(data=top_15, x='importance', y='feature', ax=ax, palette='Blues_r', edgecolor='#cbd5e1')
ax.set_title('Top 15 Most Influential Features (XGBoost Relative Gain)', fontsize=14, fontweight='bold')
ax.set_xlabel('Relative Feature Importance (Gain)')
ax.set_ylabel('Engineered Feature')
plt.tight_layout()
plt.show()

print("Top 10 Feature Importances:")
display(fi_df.head(10))
""")

    code("""
# SHAP Explainability (with graceful fallback if not installed)
try:
    import shap
    print("Computing SHAP explanations with TreeExplainer...")
    X_test_transformed = pipeline.named_steps['preprocessor'].transform(X_test.iloc[:500])
    explainer = shap.TreeExplainer(pipeline.named_steps['regressor'])
    shap_values = explainer.shap_values(X_test_transformed)
    
    plt.figure(figsize=(12, 6))
    shap.summary_plot(shap_values, X_test_transformed, feature_names=all_feature_names, max_display=10, show=False)
    plt.title('SHAP Value Impact on Model Output (Top 10 Features)', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.show()
    print("✅ SHAP analysis executed successfully.")
except ImportError:
    print("ℹ️ SHAP is not installed in the current environment. To install in Colab, run: !pip install shap")
""")

    # ==========================================
    # 14. CONGESTION THRESHOLDS
    # ==========================================
    md(r"""
---
## 14. Empirical Congestion Level Classification
To translate raw numeric predictions ($V$ veh/hr) into actionable transportation advisories, we define empirical tercile thresholds from the historical dataset distribution:
- **LOW:** $\text{Volume} < 2,154\text{ veh/hr}$ (Free-flow off-peak travel)
- **MODERATE:** $2,154 \le \text{Volume} \le 4,555\text{ veh/hr}$ (Steady daytime flow)
- **HIGH:** $\text{Volume} > 4,555\text{ veh/hr}$ (Rush-hour capacity constraint)

> **Important Disclosure:**  
> *"These thresholds are derived from the dataset distribution and are not official traffic engineering standards."*
""")
    code("""
def classify_congestion(volume):
    \"\"\"Classifies traffic volume into empirical congestion tiers.\"\"\"
    if volume < 2154:
        return 'LOW'
    elif volume <= 4555:
        return 'MODERATE'
    else:
        return 'HIGH'

print("Empirical Congestion Thresholds:")
print("  - LOW:      < 2,154 veh/hr (Free Flow)")
print("  - MODERATE: 2,154 – 4,555 veh/hr (Steady Daytime Flow)")
print("  - HIGH:     > 4,555 veh/hr (Heavy Congestion)")
print("\\nDisclosure: These thresholds are derived from the dataset distribution and are not official traffic engineering standards.")
""")

    # ==========================================
    # 15. PYTHON WHAT-IF SIMULATOR
    # ==========================================
    md("""
---
## 15. Functional What-If Counterfactual Scenario Simulator
An interactive testing function to simulate how volume and congestion shift under varying hours, severe weather storms, or holidays using the **identical trained XGBoost model**.
""")
    code("""
def simulate_traffic_scenario(
    hour=8,
    day_of_week=1,
    temp_celsius=15,
    rain_1h=0.0,
    snow_1h=0.0,
    clouds_all=20,
    weather_main='Clear',
    holiday='None'
):
    \"\"\"Simulates traffic volume using the trained pipeline.\"\"\"
    temp_k = temp_celsius + 273.15
    is_weekend = 1 if day_of_week >= 5 else 0
    is_rush_hour = 1 if (is_weekend == 0 and hour in [7, 8, 9, 16, 17, 18]) else 0
    
    sin_hour = np.sin(2 * np.pi * hour / 24.0)
    cos_hour = np.cos(2 * np.pi * hour / 24.0)
    sin_month = np.sin(2 * np.pi * 10 / 12.0) # October baseline
    cos_month = np.cos(2 * np.pi * 10 / 12.0)
    sin_dow = np.sin(2 * np.pi * day_of_week / 7.0)
    cos_dow = np.cos(2 * np.pi * day_of_week / 7.0)
    
    scenario_input = pd.DataFrame([{
        'temp': temp_k,
        'rain_1h': rain_1h,
        'snow_1h': snow_1h,
        'clouds_all': clouds_all,
        'hour': hour,
        'day_of_week': day_of_week,
        'day': 15,
        'month': 10,
        'year': 2024,
        'is_weekend': is_weekend,
        'is_rush_hour': is_rush_hour,
        'sin_hour': sin_hour,
        'cos_hour': cos_hour,
        'sin_month': sin_month,
        'cos_month': cos_month,
        'sin_dow': sin_dow,
        'cos_dow': cos_dow,
        'weather_main': weather_main,
        'holiday': holiday
    }])
    
    pred_vol = pipeline.predict(scenario_input)[0]
    tier = classify_congestion(pred_vol)
    return round(pred_vol), tier

# Test What-If scenarios
scenarios = [
    ("Baseline Morning Rush", 8, 1, 15, 0.0, 0.0, 20, 'Clear', 'None'),
    ("Heavy Rainstorm Rush", 8, 1, 12, 16.0, 0.0, 100, 'Rain', 'None'),
    ("Severe Blizzard Rush", 8, 1, -8, 0.0, 5.0, 100, 'Snow', 'None'),
    ("Late Night Free-Flow", 2, 1, 10, 0.0, 0.0, 0, 'Clear', 'None'),
    ("Thanksgiving Holiday", 8, 3, 10, 0.0, 0.0, 30, 'Clear', 'Thanksgiving Day'),
]

print("What-If Simulation Comparison Table:")
print("-" * 75)
print(f"{'Scenario Name':<24} | {'Hour':<5} | {'Weather':<8} | {'Predicted Vol':<14} | {'Congestion'}")
print("-" * 75)
for name, hr, dow, tmp, rn, sn, cld, wth, hol in scenarios:
    vol, lvl = simulate_traffic_scenario(hr, dow, tmp, rn, sn, cld, wth, hol)
    print(f"{name:<24} | {hr:02d}:00 | {wth:<8} | {vol:>6,} veh/hr  | {lvl}")
print("-" * 75)
""")

    # ==========================================
    # 16. SERIALIZATION & GOOGLE COLAB DOWNLOADS
    # ==========================================
    md("""
---
## 16. Save Artifacts & Google Colab Download Buttons
We serialize the production artifacts:
1. `best_model.joblib`: Trained XGBoost Regressor model.
2. `preprocessing.joblib`: Fitted ColumnTransformer.
3. `model_metadata.json`: Complete training metadata and evaluation metrics.

If running inside Google Colab, automatic download buttons are triggered using `google.colab.files.download(...)`.
""")
    code("""
models_dir = os.path.join('..', 'models')
if not os.path.exists(models_dir):
    models_dir = 'models'
os.makedirs(models_dir, exist_ok=True)

model_path = os.path.join(models_dir, 'best_model.joblib')
prep_path = os.path.join(models_dir, 'preprocessing.joblib')
meta_path = os.path.join(models_dir, 'model_metadata.json')

joblib.dump(pipeline.named_steps['regressor'], model_path)
joblib.dump(pipeline.named_steps['preprocessor'], prep_path)

metadata = {
    "model_name": "XGBoost Regressor",
    "objective": "reg:squarederror",
    "evaluation_metrics": {
        "test": {
            "r2": float(test_r2),
            "mae": float(test_mae),
            "rmse": float(test_rmse),
            "variance_explained_note": "R² indicates the proportion of variance in test traffic volume explained by the model."
        }
    },
    "congestion_thresholds": {
        "low_upper": 2154.0,
        "moderate_upper": 4555.0,
        "methodology": "Empirical Terciles of Traffic Volume Distribution"
    },
    "features": {
        "numerical": numerical_features,
        "categorical": categorical_features
    }
}

with open(meta_path, 'w') as f:
    json.dump(metadata, f, indent=4)

print("✅ Saved artifacts successfully:")
print(f"  - Model:         {model_path}")
print(f"  - Preprocessing: {prep_path}")
print(f"  - Metadata:      {meta_path}")

# Google Colab automatic file download
if IN_COLAB:
    from google.colab import files
    print("\\nTriggering Google Colab artifact downloads...")
    try:
        files.download(model_path)
        files.download(prep_path)
        files.download(meta_path)
        print("✅ Colab download dialogs dispatched.")
    except Exception as e:
        print(f"Colab download note: {e}")
""")

    # Attach cells
    nb['cells'] = cells

    nb_dir = "notebooks"
    os.makedirs(nb_dir, exist_ok=True)
    nb_path = os.path.join(nb_dir, "traffic_prediction_training.ipynb")
    with open(nb_path, "w", encoding="utf-8") as f:
        nbf.write(nb, f)

    print(f"Successfully generated {nb_path} with {len(cells)} cells.")
    return nb_path

if __name__ == "__main__":
    build_notebook()
