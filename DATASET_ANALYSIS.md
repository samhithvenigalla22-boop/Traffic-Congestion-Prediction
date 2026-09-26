# DATASET ANALYSIS REPORT
## Metro Interstate Traffic Volume Dataset (Phase 0)

### 1. Dataset Dimensions
- **File Name**: `Metro_Interstate_Traffic_Volume.csv`
- **Total Records**: 48,204 rows
- **Total Columns**: 9 columns
- **File Size**: ~3.24 MB
- **Time Range**: `2012-10-02 09:00:00` to `2018-09-30 23:00:00` (monotonically increasing hourly observations).

---

### 2. Column Descriptions & Data Types

| Column Name | Type | Description | Sample Values / Range |
| :--- | :--- | :--- | :--- |
| `holiday` | `object` | US National & State Holidays | `"None"`, `"Labor Day"`, `"Thanksgiving Day"` |
| `temp` | `float64` | Average temperature in Kelvin | 0.0 K – 310.07 K (Mean: 281.21 K) |
| `rain_1h` | `float64` | Rainfall amount in mm in the past hour | 0.0 mm – 9831.3 mm (Mean: 0.33 mm) |
| `snow_1h` | `float64` | Snowfall amount in mm in the past hour | 0.0 mm – 0.51 mm (Mean: 0.00022 mm) |
| `clouds_all` | `int64` | Percentage cloud cover | 0% – 100% (Mean: 49.36%) |
| `weather_main` | `object` | Primary weather category (11 classes) | `Clouds`, `Clear`, `Mist`, `Rain`, `Snow`, etc. |
| `weather_description` | `object` | Detailed weather description (38 classes) | `sky is clear`, `light rain`, `broken clouds` |
| `date_time` | `object` | Hourly timestamp (YYYY-MM-DD HH:MM:SS) | `2012-10-02 09:00:00` to `2018-09-30 23:00:00` |
| `traffic_volume` | `int64` | **Target Variable**: Hourly I-94 westbound volume | 0 – 7,280 vehicles/hour (Mean: 3,259.8) |

---

### 3. Target Variable Analysis: `traffic_volume`
- **Variable Nature**: Continuous integer (Regression task).
- **Minimum**: 0 vehicles/hour.
- **Maximum**: 7,280 vehicles/hour.
- **Mean**: 3,259.82 vehicles/hour.
- **Median (50%)**: 3,380.00 vehicles/hour.
- **Standard Deviation**: 1,986.86 vehicles/hour.
- **Key Percentiles**:
  - 10th percentile: 425.0
  - 25th percentile: 1,193.0
  - 33.3rd percentile: 2,195.0
  - 50.0th percentile: 3,380.0
  - 66.7th percentile: 4,571.0
  - 75th percentile: 4,933.0
  - 90th percentile: 5,820.0
- **Distribution Pattern**: Strong bimodal distribution reflecting daily commuter cycles (morning rush hour around 07:00–08:00 and evening rush hour around 16:00–17:00).

---

### 4. Missing Values & Duplicate Analysis
- **Missing Values**:
  - Raw `holiday` column contains the string `"None"` in 48,143 rows (99.87%), and specific holiday names in 61 rows (0.13%). When parsed by standard tools, `"None"` can be interpreted as NaN or empty string. No true missingness exists; `"None"` denotes a regular working or weekend day.
  - All other 8 columns (`temp`, `rain_1h`, `snow_1h`, `clouds_all`, `weather_main`, `weather_description`, `date_time`, `traffic_volume`) have **0 missing values**.
- **Duplicates**:
  - Exactly **17 duplicate rows** exist where all 9 columns are identical. These are removed during data cleaning.
  - Multiple records can exist for the same timestamp (40,575 unique timestamps across 48,204 rows) due to multiple co-occurring weather conditions (e.g., mist + light rain).

---

### 5. Categorical Columns Analysis
- `weather_main` (11 unique categories):
  - `Clouds`: 15,164
  - `Clear`: 13,391
  - `Mist`: 5,950
  - `Rain`: 5,672
  - `Snow`: 2,876
  - `Drizzle`: 1,821
  - `Haze`: 1,360
  - `Thunderstorm`: 1,034
  - `Fog`: 912
  - `Smoke`: 20
  - `Squall`: 4
- `holiday` (12 unique values including "None"):
  - `"None"` (48,143), followed by Columbus Day (5), Veterans Day (5), Thanksgiving Day (6), Christmas Day (6), New Years Day (6), Washingtons Birthday (5), Memorial Day (5), Independence Day (5), State Fair (5), Labor Day (7), Martin Luther King Jr Day (6).
- `weather_description` (38 unique entries):
  - Inconsistent capitalization exists (e.g., `sky is clear` [11,665] vs `Sky is Clear` [1,726]). Standardizing via `.str.lower()` consolidates these duplicates.

---

### 6. Numerical Columns & Outlier Detection
- `temp`:
  - Exactly 10 rows have `temp == 0.0 K` (-273.15 °C). This represents physical absolute zero and is an obvious sensor failure.
  - Realistic range for Minneapolis/St. Paul is 240 K (-33 °C) to 310 K (+37 °C). The 10 erroneous values will be replaced by the training median temperature (~282.4 K).
- `rain_1h`:
  - Exactly 1 row on `2016-07-11 17:00:00` has `rain_1h = 9831.3 mm` (~9.8 meters of rain in 1 hour).
  - This is an extreme hardware anomaly. It will be clipped to a realistic upper bound (100.0 mm).
- `snow_1h`:
  - Maximum recorded is 0.51 mm, values are well-behaved.
- `clouds_all`:
  - Bounded strictly between 0% and 100%.

---

### 7. Feature Engineering & Preprocessing Decisions
1. **Datetime Feature Extraction**:
   - `hour` (0–23): Primary driver of diurnal commute cycles.
   - `day_of_week` (0–6): Primary driver of weekday vs. weekend patterns.
   - `day` (1–31) and `month` (1–12): Captures seasonal travel patterns.
   - `year` (2012–2018): Accounts for multi-year baseline trends.
   - `is_weekend`: Binary flag (`day_of_week >= 5`).
   - `is_rush_hour`: Binary flag (`is_weekend == 0` and `hour in [7, 8, 9, 16, 17, 18]`).
2. **Cyclical Temporal Encoding**:
   - $\sin(2\pi \cdot \text{hour} / 24)$, $\cos(2\pi \cdot \text{hour} / 24)$
   - $\sin(2\pi \cdot \text{month} / 12)$, $\cos(2\pi \cdot \text{month} / 12)$
   - $\sin(2\pi \cdot \text{dow} / 7)$, $\cos(2\pi \cdot \text{dow} / 7)$
   - Enables tree and linear algorithms to understand that hour 23 and hour 0 are consecutive.
3. **Holiday Flag**:
   - `is_holiday`: Binary flag (`1` if holiday $\ne$ 'None', else `0`).
4. **Encoding & Scaling**:
   - Numerical columns processed with `SimpleImputer(strategy='median')` and `StandardScaler()`.
   - Categorical columns (`weather_main`, `holiday`) processed via `OneHotEncoder(handle_unknown='ignore', sparse_output=False)`.
   - All transformations are packaged into an `sklearn.compose.ColumnTransformer` fitted strictly on training data.

---

### 8. Potential Leakage Risks & Mitigation
1. **Temporal Leakage**: Random $k$-fold cross-validation or `train_test_split(shuffle=True)` would leak future patterns into past evaluations. **Mitigation**: Chronological splitting:
   - **Train**: First 70% of chronological observations (2012-10-02 to 2017-05-17).
   - **Validation**: Subsequent 15% (2017-05-17 to 2018-01-25).
   - **Test**: Final 15% (2018-01-25 to 2018-09-30).
2. **Preprocessing Leakage**: Fitting scalers or imputers across the entire dataset exposes test distributions. **Mitigation**: `fit()` is executed solely on the chronological training partition; `transform()` is applied to validation, test, and inference.
3. **Autoregressive Feature Leakage**: Using lagged traffic volumes ($y_{t-1}$) is unreliable due to historical multi-month sensor outages (e.g. 307-day gap in 2014-2015) and cannot be provided by user queries at inference time. **Mitigation**: All features are strictly derived from user-controllable calendar, temporal, and weather attributes.
