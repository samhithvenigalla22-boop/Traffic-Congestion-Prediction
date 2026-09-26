# Traffic Congestion Prediction — Standalone Web Application

An autonomous, smart-city transportation intelligence dashboard powered directly by a trained **XGBoost Regressor** running in the browser with zero backend dependency.

## Key Features

1. **In-Browser XGBoost ML Engine**:
   - Evaluates the genuine 200-tree XGBoost ensemble using IEEE 754 float32 (`Math.fround`) decision tree traversal.
   - Exact mathematical match with Python `model.predict()` ($\Delta < 0.004$ veh/hr), executing in $<0.5\text{ms}$ with zero network requests.
   - Complete pipeline preprocessing (StandardScaler + OneHotEncoder) bundled client-side.

2. **Single Champion Architecture & Honest Evaluation**:
   - Focuses exclusively on **XGBoost Regressor**.
   - Held-Out Test $R^2 = 0.95$ ("95% of traffic volume variance is explained by the model on held-out test data").
   - Test $\text{MAE} = 282.44$ vehicles/hour, Test $\text{RMSE} = 458.60$ vehicles/hour.
   - Evaluated on a 70/15/15 chronological split across 48,187 real highway observations.

3. **Smart-City Transit UI & Ergonomics**:
   - Modern deep-navy slate theme with high-contrast readable typography and subtle borders.
   - Dynamic 270° Circular Traffic Gauge with explicit empirical tercile threshold ticks (2,154 and 4,555 veh/hr) and Level of Service (LOS A–F) ratings.
   - Commute advice, estimated cruising speed, delay index, and factor impact breakdown.

4. **What-If Scenario Studio**:
   - Side-by-side perturbation analysis with instantaneous delta metrics ($\Delta$ volume, $\%$, congestion shift).
   - Presets for Blizzard Surge, Heavy Downpour, Evening Rush Peak, Off-Peak Midnight, and Saturday Midday.

5. **Corridor Traffic Analytics**:
   - 24-hour Diurnal Commute curves with live prediction pin overlay.
   - Weekly volume breakdown (Monday through Sunday).
   - Monthly seasonal variations (Summer highs vs Winter lows).
   - Actual vs Predicted regression validation ($R^2 = 0.95$).

6. **Prediction History**:
   - Stored in browser `localStorage`.
   - Filter by congestion level, reload scenarios into the form, and export as CSV.

## Development & Build

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Lint
npm run lint

# Production build
npm run build
```
