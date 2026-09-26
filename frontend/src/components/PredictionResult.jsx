import { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  Layers,
  Lightbulb,
  Share2,
  Check,
  Gauge,
  Timer,
  Navigation,
  GitCommit,
  SplitSquareVertical,
} from 'lucide-react';
import TrafficGauge from './TrafficGauge';

function useCountUp(targetNumber, durationMs = 800) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const startVal = 0;
    const numericTarget = Number(targetNumber);
    const endVal = Number.isFinite(numericTarget) ? numericTarget : 0;

    if (endVal === 0) {
      setCurrent(0);
      return;
    }

    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const val = Math.round(startVal + (endVal - startVal) * easeOut);
      setCurrent(Number.isFinite(val) ? val : 0);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [targetNumber, durationMs]);

  return current;
}

export default function PredictionResult({ prediction, predictionMode }) {
  const [copied, setCopied] = useState(false);
  const targetVolume = prediction?.predicted_traffic ?? prediction?.predicted_traffic_volume ?? 0;
  const animatedVolume = useCountUp(targetVolume, 700);

  if (!prediction) {
    return (
      <div className="card result-placeholder-card">
        <div className="placeholder-content">
          <div className="placeholder-icon-circle">
            <Layers size={36} className="text-blue-600" />
          </div>
          <h3 className="placeholder-title">Awaiting Prediction Request</h3>
          <p className="placeholder-text">
            Select a corridor, direction, and observation conditions on the left and click <strong>PREDICT TRAFFIC</strong>.
            The FastAPI backend evaluates the trained XGBoost model and stores the prediction in SQLite.
          </p>
          <div className="placeholder-hints">
            <span className="hint-pill">⚡ FastAPI + SQLite Backend</span>
            <span className="hint-pill">📊 R² = 0.95 (Explained Variance)</span>
            <span className="hint-pill">🎯 MAE = 282.44 veh/hr</span>
          </div>
        </div>
      </div>
    );
  }

  const {
    predicted_traffic,
    predicted_traffic_volume,
    congestion_level,
    model,
    corridor,
    direction,
    prediction_point,
    r2,
    mae,
    rmse,
    congestion_description,
    estimated_speed_mph,
    delay_minutes,
  } = prediction;

  const rawVolume = Number(predicted_traffic ?? predicted_traffic_volume ?? 0);
  const finalVolume = Number.isFinite(rawVolume) ? rawVolume : 0;
  const maxScale = 7500;

  const congestionConfig = {
    LOW: {
      badgeClass: 'badge-low',
      cardClass: 'card-border-low',
      title: 'LOW CONGESTION',
      color: '#059669',
      tagText: 'FREE FLOW',
      desc: 'Free-flow highway conditions, steady off-peak travel, minimal delay.',
      actionTitle: 'Optimal Highway Conditions — Free Flow Speeds',
      actionText: 'Corridor operating below 30% saturation capacity. Maintain posted speeds.',
    },
    MODERATE: {
      badgeClass: 'badge-moderate',
      cardClass: 'card-border-moderate',
      title: 'MODERATE CONGESTION',
      color: '#D97706',
      tagText: 'STEADY FLOW',
      desc: 'Normal daytime traffic density, minor congestion pockets, steady speeds.',
      actionTitle: 'Normal Daytime Traffic Flow — Minor Delays Possible',
      actionText: 'Corridor operating near nominal transit equilibrium. Expect minor intersection delays.',
    },
    HIGH: {
      badgeClass: 'badge-high',
      cardClass: 'card-border-high',
      title: 'HIGH CONGESTION',
      color: '#DC2626',
      tagText: 'PEAK COMMUTE',
      desc: 'Rush-hour capacity constraint, heavy volume queues, significant delays.',
      actionTitle: 'Heavy Rush-Hour Commute Saturation — Significant Delays Expected',
      actionText: 'High vehicle volume exceeding optimal throughput. Consider alternate arterial routes or transit.',
    },
  };

  const safeLevel = (congestion_level || 'MODERATE').toUpperCase();
  const config = congestionConfig[safeLevel] || congestionConfig.MODERATE;

  const handleCopySummary = () => {
    const text = `[Traffic Congestion Prediction]
Predicted Volume: ${Math.round(finalVolume).toLocaleString()} vehicles/hour
Congestion Level: ${congestion_level} (${config.title})
Corridor: ${corridor || 'Main Arterial Corridor'} (${direction || 'Inbound'})
Prediction Point: ${prediction_point || 'Point A'}
Model: ${model || 'XGBoost Regressor'} (R² = 0.95, MAE = 282.44 veh/hr, RMSE = 458.60 veh/hr)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={`card result-card ${config.cardClass}`}>
      {/* Header */}
      <div className="result-header">
        <div className="result-tag-group">
          <div className="result-tag">
            <TrendingUp size={16} className="text-blue-600" />
            <span>MODEL INFERENCE RESULT</span>
          </div>
          <span className={`mode-pill ${predictionMode === 'live' ? 'pill-live' : 'pill-scenario'}`}>
            {predictionMode === 'live' ? 'Standard Mode' : 'Scenario Mode'}
          </span>
        </div>
        <div className="result-actions-top">
          <button
            type="button"
            className="copy-summary-btn"
            onClick={handleCopySummary}
            title="Copy Report to Clipboard"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Gauge + Volume Readout */}
      <div className="result-main-grid">
        <div className="result-gauge-col">
          <TrafficGauge
            volume={finalVolume}
            congestionLevel={congestion_level}
            maxVolume={maxScale}
          />
        </div>

        <div className="result-volume-col">
          <div className="volume-hero-section">
            <span className="volume-eyebrow">PREDICTED TRAFFIC VOLUME</span>
            <div className="volume-display">
              <span className="volume-number">{animatedVolume.toLocaleString()}</span>
              <span className="volume-unit">vehicles/hour</span>
            </div>

            <div className="congestion-status-row">
              <span className="status-label-prefix">Congestion Level:</span>
              <div className={`congestion-badge ${config.badgeClass}`}>
                <span className="badge-dot"></span>
                <span className="badge-text">{congestion_level}</span>
              </div>
            </div>
          </div>

          <p className="congestion-description">{congestion_description || config.desc}</p>

          {/* Infrastructure Context Badges */}
          <div className="routing-telemetry-pills">
            <div className="telemetry-chip">
              <Navigation size={13} className="text-blue-600" />
              <span>Corridor: <strong>{corridor || 'Main Arterial Corridor'}</strong></span>
            </div>
            <div className="telemetry-chip">
              <SplitSquareVertical size={13} className="text-indigo-600" />
              <span>Direction: <strong>{direction || 'Inbound'}</strong></span>
            </div>
            <div className="telemetry-chip">
              <GitCommit size={13} className="text-purple-600" />
              <span>Point: <strong>{prediction_point || 'Point A'}</strong></span>
            </div>
          </div>

          {/* Speed & Delay Estimates */}
          <div className="commute-telemetry-row">
            <div className="telemetry-chip">
              <Gauge size={14} className="text-blue-600" />
              <span>Est. Speed: <strong>~{estimated_speed_mph || (congestion_level === 'LOW' ? 55 : congestion_level === 'MODERATE' ? 42 : 22)} mph</strong></span>
            </div>
            <div className="telemetry-chip">
              <Timer size={14} className="text-amber-600" />
              <span>Buffer: <strong>+{delay_minutes || (congestion_level === 'LOW' ? 0 : congestion_level === 'MODERATE' ? 6 : 18)} min</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Advisory Card */}
      <div className="advisory-card">
        <div className="advisory-icon-circle">
          <Lightbulb size={18} className="text-blue-600" />
        </div>
        <div className="advisory-text-block">
          <h4 className="advisory-title">{config.actionTitle}</h4>
          <p className="advisory-description">{config.actionText}</p>
        </div>
      </div>

      {/* Model Benchmark Card */}
      <div className="model-benchmark-card">
        <div className="benchmark-header">
          <div className="benchmark-title-row">
            <ShieldCheck size={16} className="text-blue-600" />
            <span className="benchmark-title">{model || 'XGBoost Regressor'}</span>
          </div>
          <span className="benchmark-badge">Held-Out Test Metrics</span>
        </div>
        <div className="benchmark-grid">
          <div className="metric-box">
            <span className="metric-lbl">Explained Variance (R²)</span>
            <span className="metric-val text-blue-600">{r2 || 0.95}</span>
            <span className="metric-sub">95% variance explained</span>
          </div>
          <div className="metric-box">
            <span className="metric-lbl">Mean Absolute Error</span>
            <span className="metric-val text-slate-800">{mae || 282.44}</span>
            <span className="metric-sub">vehicles / hour</span>
          </div>
          <div className="metric-box">
            <span className="metric-lbl">Root Mean Sq. Error</span>
            <span className="metric-val text-slate-800">{rmse || 458.60}</span>
            <span className="metric-sub">penalizes outliers</span>
          </div>
        </div>
      </div>
    </div>
  );
}
