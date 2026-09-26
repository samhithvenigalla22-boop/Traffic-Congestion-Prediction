import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Zap,
  CloudSnow,
  CloudRain,
  Sun,
  Calendar,
  Thermometer,
} from 'lucide-react';
import { api } from '../config/api';
import { predictTraffic } from '../ml/modelAdapter';

const DEFAULT_SIM_FORM = {
  date_time: '2024-10-15T08:00',
  temp: 15,
  temp_unit: 'C',
  rain_1h: 0.0,
  snow_1h: 0.0,
  clouds_all: 20,
  weather_main: 'Clear',
  weather_description: 'sky is clear',
  holiday: 'None',
  corridor: 'Main Arterial Corridor',
  direction: 'Inbound',
  prediction_point: 'Point A (North Gateway)',
};

const WEATHER_MAINS = [
  'Clear',
  'Clouds',
  'Rain',
  'Snow',
  'Mist',
  'Drizzle',
  'Haze',
  'Thunderstorm',
  'Fog',
  'Smoke',
  'Squall',
];

const HOLIDAYS = [
  'None',
  'Columbus Day',
  'Veterans Day',
  'Thanksgiving Day',
  'Christmas Day',
  'New Years Day',
  'Washingtons Birthday',
  'Memorial Day',
  'Independence Day',
  'State Fair',
  'Labor Day',
  'Martin Luther King Jr Day',
];

export default function ScenarioSimulator({ basePrediction, baseFormData, onApplyToMainForm }) {
  const [activeBaselinePred, setActiveBaselinePred] = useState(basePrediction || null);
  const [simForm, setSimForm] = useState(baseFormData ? { ...baseFormData } : DEFAULT_SIM_FORM);
  const [simPrediction, setSimPrediction] = useState(null);
  const [_isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState(null);

  useEffect(() => {
    if (basePrediction) {
      setActiveBaselinePred(basePrediction);
    }
    if (baseFormData) {
      setSimForm({ ...baseFormData });
    }
  }, [basePrediction, baseFormData]);

  const runSimulation = async (modifiedForm) => {
    setIsSimulating(true);
    setSimError(null);

    const formToUse = modifiedForm || simForm || DEFAULT_SIM_FORM;
    const rawDt = formToUse.date_time || '';
    const datePart = rawDt.includes('T') ? rawDt.split('T')[0] : (rawDt.split(' ')[0] || '2024-10-15');
    const timePart = rawDt.includes('T') ? rawDt.split('T')[1].slice(0, 5) : '08:00';

    const payload = {
      date: datePart,
      time: timePart,
      temperature: Number(formToUse.temp),
      rain: Number(formToUse.rain_1h || 0),
      snow: Number(formToUse.snow_1h || 0),
      clouds: Number(formToUse.clouds_all || 0),
      weather: formToUse.weather_main || 'Clear',
      holiday: formToUse.holiday || 'None',
      corridor: formToUse.corridor || 'Main Arterial Corridor',
      direction: formToUse.direction || 'Inbound',
      prediction_point: formToUse.prediction_point || 'Point A (North Gateway)',
    };

    try {
      let res;
      try {
        res = await api.predict(payload);
      } catch (backendErr) {
        console.warn('Backend simulation predict failed, falling back to client model:', backendErr);
        const fallbackRes = await predictTraffic({
          date_time: `${datePart} ${timePart}`,
          temp: payload.temperature,
          temp_unit: formToUse.temp_unit || 'C',
          rain_1h: payload.rain,
          snow_1h: payload.snow,
          clouds_all: payload.clouds,
          weather_main: payload.weather,
          weather_description: formToUse.weather_description || 'sky is clear',
          holiday: payload.holiday,
        });
        res = {
          predicted_traffic: fallbackRes.predicted_traffic_volume,
          predicted_traffic_volume: fallbackRes.predicted_traffic_volume,
          congestion_level: fallbackRes.congestion_level,
          model: 'XGBoost Regressor (Client Engine)',
          r2: 0.95,
          mae: 282.44,
          rmse: 458.60,
        };
      }
      setSimPrediction(res);
    } catch (err) {
      setSimError(err.message || 'Simulation execution failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSliderChange = (field, value) => {
    const updated = { ...simForm, [field]: value };
    setSimForm(updated);
    runSimulation(updated);
  };

  const applyStressPreset = (modifications) => {
    const updated = { ...simForm, ...modifications };
    setSimForm(updated);
    runSimulation(updated);
  };

  const baseVolume = activeBaselinePred?.predicted_traffic ?? activeBaselinePred?.predicted_traffic_volume ?? 5466;
  const simVolume = simPrediction?.predicted_traffic ?? simPrediction?.predicted_traffic_volume ?? baseVolume;
  const volumeDelta = simVolume - baseVolume;
  const percentDelta = baseVolume > 0 ? (volumeDelta / baseVolume) * 100 : 0;

  const baseCongestion = activeBaselinePred?.congestion_level || 'HIGH';
  const simCongestion = simPrediction?.congestion_level || baseCongestion;

  return (
    <div className="what-if-container">
      <div className="what-if-header">
        <div>
          <h2 className="section-title">What-If Scenario Simulator</h2>
          <p className="section-subtitle">
            Dynamically adjust atmospheric and temporal parameters to observe real-time XGBoost regression shifts.
          </p>
        </div>
      </div>

      {simError && (
        <div className="auth-error-banner" role="alert">
          <span>{simError}</span>
        </div>
      )}

      {/* Delta Comparison Banner */}
      <div className="delta-comparison-card">
        <div className="comparison-side baseline-side">
          <span className="comp-eyebrow">CURRENT BASELINE</span>
          <div className="comp-vol-readout">
            <span className="comp-num">{Math.round(baseVolume).toLocaleString()}</span>
            <span className="comp-unit">veh/hr</span>
          </div>
          <span className={`comp-badge badge-${baseCongestion.toLowerCase()}`}>
            {baseCongestion} CONGESTION
          </span>
        </div>

        <div className="comparison-arrow-divider">
          <ArrowRight size={22} className="text-slate-400" />
          <div className={`delta-chip ${volumeDelta >= 0 ? 'delta-pos' : 'delta-neg'}`}>
            {volumeDelta >= 0 ? '+' : ''}{Math.round(volumeDelta).toLocaleString()} veh/hr ({percentDelta >= 0 ? '+' : ''}{percentDelta.toFixed(1)}%)
          </div>
        </div>

        <div className="comparison-side simulated-side">
          <span className="comp-eyebrow">SIMULATED SCENARIO</span>
          <div className="comp-vol-readout">
            <span className="comp-num text-blue-600">{Math.round(simVolume).toLocaleString()}</span>
            <span className="comp-unit">veh/hr</span>
          </div>
          <span className={`comp-badge badge-${simCongestion.toLowerCase()}`}>
            {simCongestion} CONGESTION
          </span>
        </div>
      </div>

      {/* Simulator Sliders */}
      {simForm && (
        <div className="simulator-controls-grid">
          <div className="card sim-card">
            <h3 className="sim-group-title">Atmospheric & Weather Sliders</h3>

            <div className="sim-control-group">
              <div className="sim-control-label">
                <Thermometer size={15} />
                <span>Temperature (°{simForm.temp_unit || 'C'})</span>
                <span className="sim-val-tag">{simForm.temp}°{simForm.temp_unit || 'C'}</span>
              </div>
              <input
                type="range"
                min="-20"
                max="45"
                step="1"
                className="form-slider"
                value={simForm.temp}
                onChange={(e) => handleSliderChange('temp', parseFloat(e.target.value))}
              />
            </div>

            <div className="sim-control-group">
              <div className="sim-control-label">
                <CloudRain size={15} />
                <span>Rainfall Intensity (1 Hour)</span>
                <span className="sim-val-tag">{simForm.rain_1h} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                className="form-slider"
                value={simForm.rain_1h}
                onChange={(e) => handleSliderChange('rain_1h', parseFloat(e.target.value))}
              />
            </div>

            <div className="sim-control-group">
              <div className="sim-control-label">
                <CloudSnow size={15} />
                <span>Snowfall Intensity (1 Hour)</span>
                <span className="sim-val-tag">{simForm.snow_1h} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                className="form-slider"
                value={simForm.snow_1h}
                onChange={(e) => handleSliderChange('snow_1h', parseFloat(e.target.value))}
              />
            </div>

            <div className="sim-control-group">
              <label className="sim-control-label" htmlFor="sim-weather">
                <Sun size={15} />
                <span>Primary Weather Category</span>
              </label>
              <select
                id="sim-weather"
                className="form-select"
                value={simForm.weather_main}
                onChange={(e) => handleSliderChange('weather_main', e.target.value)}
              >
                {WEATHER_MAINS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card sim-card">
            <h3 className="sim-group-title">Calendar & Time Modifications</h3>

            <div className="sim-control-group">
              <label className="sim-control-label" htmlFor="sim-holiday">
                <Calendar size={15} />
                <span>Holiday Status</span>
              </label>
              <select
                id="sim-holiday"
                className="form-select"
                value={simForm.holiday}
                onChange={(e) => handleSliderChange('holiday', e.target.value)}
              >
                {HOLIDAYS.map((h) => (
                  <option key={h} value={h}>
                    {h === 'None' ? 'None (Standard Working Day)' : h}
                  </option>
                ))}
              </select>
            </div>

            <div className="stress-presets-section">
              <span className="stress-presets-label">
                <Zap size={14} className="text-amber-500" />
                <span>Instant Stress Tests:</span>
              </span>
              <div className="stress-presets-btns">
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => applyStressPreset({ weather_main: 'Thunderstorm', rain_1h: 25.0 })}
                >
                  Severe Downpour (+25mm)
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => applyStressPreset({ weather_main: 'Snow', snow_1h: 12.0, temp: -8 })}
                >
                  Heavy Blizzard (-8°C, Snow)
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => applyStressPreset({ holiday: 'Labor Day' })}
                >
                  Holiday Traffic Suppression
                </button>
              </div>
            </div>

            {onApplyToMainForm && (
              <button
                type="button"
                className="apply-scenario-btn"
                onClick={() => onApplyToMainForm(simForm)}
              >
                Apply Scenario to Main Prediction Form
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
