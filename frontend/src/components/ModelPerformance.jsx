import {
  Layers,
  ShieldCheck,
  Calendar,
  Info,
  BarChart2,
} from 'lucide-react';
import { getModelPerformance } from '../ml/modelAdapter';

export default function ModelPerformance() {
  const modelInfo = getModelPerformance();
  const { feature_importances, n_trees } = modelInfo;

  const topFeatures = (feature_importances || []).slice(0, 12);
  const maxImportance = topFeatures[0]?.importance || 0.1;

  const featureLabelMap = {
    cos_hour: 'Hour of Day (Cos Cyclical Harmonic)',
    sin_hour: 'Hour of Day (Sin Cyclical Harmonic)',
    hour: 'Hour of Day (Linear 0–23)',
    is_rush_hour: 'Peak Rush-Hour Indicator (7–9 AM, 4–6 PM)',
    temp: 'Surface Temperature (°C / K)',
    cos_dow: 'Day of Week (Cos Cyclical Harmonic)',
    sin_dow: 'Day of Week (Sin Cyclical Harmonic)',
    day_of_week: 'Day of Week (0=Monday to 6=Sunday)',
    is_weekend: 'Weekend Travel Indicator (Sat / Sun)',
    clouds_all: 'Cloud Cover Percentage (0–100%)',
    rain_1h: 'Precipitation Intensity (Rain past hour in mm)',
    snow_1h: 'Snowfall Accumulation (Snow past hour in mm)',
    is_holiday: 'Federal / State Holiday Indicator',
    weather_main_Clear: 'Weather Category: Clear',
    weather_main_Rain: 'Weather Category: Rain',
    weather_main_Snow: 'Weather Category: Snow',
    weather_main_Clouds: 'Weather Category: Clouds',
    weather_main_Thunderstorm: 'Weather Category: Thunderstorm',
    holiday_None: 'Non-Holiday Working Day',
  };

  return (
    <div className="card performance-card">
      {/* Header */}
      <div className="performance-header">
        <div className="performance-title-group">
          <div className="perf-icon-wrapper">
            <Layers size={22} className="text-blue-600" />
          </div>
          <div>
            <div className="perf-badge-row">
              <h3 className="performance-title">MODEL SPECIFICATION &amp; EVALUATION</h3>
              <span className="badge-model-tag">Production Model</span>
            </div>
            <p className="performance-subtitle">
              Comprehensive evaluation of the trained <strong>XGBoost Regressor</strong> on 7,229 unseen chronological test records.
            </p>
          </div>
        </div>

        <div className="perf-chip-engine">
          <ShieldCheck size={16} className="text-emerald-600" />
          <span>Zero Temporal Data Leakage</span>
        </div>
      </div>

      {/* Model Algorithm Explanation Quote */}
      <div className="algorithm-explanation-banner">
        <Info size={18} className="text-blue-600 flex-shrink-0" />
        <div className="explanation-body">
          <p className="algo-quote">
            <strong>"XGBoost is a gradient boosting algorithm that builds decision trees sequentially to reduce prediction errors."</strong>
          </p>
          <span className="algo-sub">
            Objective: <code className="font-mono bg-slate-100 text-blue-700 px-1 py-0.5 rounded">reg:squarederror</code> &bull; Architecture: {n_trees || 200} Estimator Trees &bull; Max Depth: 6 &bull; Learning Rate (&eta;): 0.08
          </span>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="perf-stats-grid">
        <div className="perf-stat-box">
          <span className="perf-stat-label">COEFFICIENT OF DETERMINATION (R²)</span>
          <span className="perf-stat-number text-blue-600">0.95</span>
          <span className="perf-stat-caption">
            R² indicates the proportion of variance in the test traffic volume explained by the model.
          </span>
        </div>

        <div className="perf-stat-box">
          <span className="perf-stat-label">MEAN ABSOLUTE ERROR (MAE)</span>
          <span className="perf-stat-number text-slate-800">282.44</span>
          <span className="perf-stat-caption">
            Average prediction deviation across all test hours (vehicles/hour).
          </span>
        </div>

        <div className="perf-stat-box">
          <span className="perf-stat-label">ROOT MEAN SQUARED ERROR (RMSE)</span>
          <span className="perf-stat-number text-slate-800">458.60</span>
          <span className="perf-stat-caption">
            Quadratic penalty metric reflecting error standard deviation (vehicles/hour).
          </span>
        </div>

        <div className="perf-stat-box">
          <span className="perf-stat-label">TRAINING CORPUS SIZE</span>
          <span className="perf-stat-number text-slate-800">48,187</span>
          <span className="perf-stat-caption">
            Hourly Interstate 94 metropolitan traffic observations (2012–2018).
          </span>
        </div>
      </div>

      {/* Two Column Layout: Feature Importance & Chronological Validation Strategy */}
      <div className="perf-details-grid">
        {/* Left Column: Real Exported Feature Importances */}
        <div className="perf-sub-card">
          <div className="perf-sub-header">
            <BarChart2 size={18} className="text-blue-600" />
            <h4 className="perf-sub-title">XGBoost Feature Importance (Trained Weights)</h4>
          </div>
          <p className="perf-sub-desc">
            Actual relative gain contribution of engineered features in reducing regression split impurity across all decision trees:
          </p>

          <div className="feature-importance-list">
            {topFeatures.map((item, index) => {
              const pctOfMax = Math.round((item.importance / maxImportance) * 100);
              const label = featureLabelMap[item.feature] || item.feature;

              return (
                <div key={item.feature} className="fi-row">
                  <div className="fi-labels">
                    <span className="fi-name">
                      <span className="fi-rank">#{index + 1}</span> {label}
                    </span>
                    <span className="fi-value">{(item.importance * 100).toFixed(1)}%</span>
                  </div>
                  <div className="fi-bar-track">
                    <div
                      className="fi-bar-fill"
                      style={{ width: `${pctOfMax}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Strict Chronological Split & Hyperparameters */}
        <div className="perf-sub-card">
          <div className="perf-sub-header">
            <Calendar size={18} className="text-blue-600" />
            <h4 className="perf-sub-title">Strict Chronological Validation Architecture</h4>
          </div>
          <p className="perf-sub-desc">
            To prevent temporal lookahead leakage on time-series traffic data, chronological partitioning was enforced:
          </p>

          {/* Timeline Visual */}
          <div className="split-timeline-container">
            <div className="timeline-segment segment-train">
              <span className="segment-label">TRAIN (70%)</span>
              <span className="segment-count">33,730 rows</span>
              <span className="segment-desc">Historical baseline fitting</span>
            </div>
            <div className="timeline-segment segment-val">
              <span className="segment-label">VAL (15%)</span>
              <span className="segment-count">7,228 rows</span>
              <span className="segment-desc">Hyperparameter tuning</span>
            </div>
            <div className="timeline-segment segment-test">
              <span className="segment-label">TEST (15%)</span>
              <span className="segment-count">7,229 rows</span>
              <span className="segment-desc">Held-out benchmark</span>
            </div>
          </div>

          <div className="hyperparams-summary-card">
            <h5 className="hp-title">Hyperparameter Configuration:</h5>
            <div className="hp-grid">
              <div className="hp-item">
                <span className="hp-key">Estimator Trees:</span>
                <span className="hp-val">200</span>
              </div>
              <div className="hp-item">
                <span className="hp-key">Max Tree Depth:</span>
                <span className="hp-val">6</span>
              </div>
              <div className="hp-item">
                <span className="hp-key">Learning Rate (eta):</span>
                <span className="hp-val">0.08</span>
              </div>
              <div className="hp-item">
                <span className="hp-key">Subsample Ratio:</span>
                <span className="hp-val">0.85</span>
              </div>
              <div className="hp-item">
                <span className="hp-key">Colsample By Tree:</span>
                <span className="hp-val">0.85</span>
              </div>
              <div className="hp-item">
                <span className="hp-key">Loss Function:</span>
                <span className="hp-val">Squared Error</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
