import { useState } from 'react';
import {
  Calendar,
  Thermometer,
  CloudRain,
  Snowflake,
  Cloud,
  Sun,
  Award,
  Zap,
  MapPin,
  RefreshCw,
  Clock,
  RotateCcw,
  Compass,
  AlertTriangle,
} from 'lucide-react';

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

const WEATHER_DESCRIPTIONS = {
  Clear: ['sky is clear'],
  Clouds: ['scattered clouds', 'broken clouds', 'overcast clouds', 'few clouds'],
  Rain: [
    'light rain',
    'moderate rain',
    'heavy intensity rain',
    'very heavy rain',
    'light intensity shower rain',
    'proximity shower rain',
  ],
  Snow: ['light snow', 'heavy snow', 'snow', 'light shower snow', 'sleet', 'shower snow'],
  Mist: ['mist'],
  Drizzle: ['light intensity drizzle', 'drizzle', 'heavy intensity drizzle', 'shower drizzle'],
  Haze: ['haze'],
  Thunderstorm: [
    'proximity thunderstorm',
    'thunderstorm',
    'thunderstorm with heavy rain',
    'thunderstorm with light rain',
    'thunderstorm with rain',
    'proximity thunderstorm with rain',
  ],
  Fog: ['fog'],
  Smoke: ['smoke'],
  Squall: ['SQUALLS'],
};

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

const SCENARIO_PRESETS = [
  {
    name: 'Weekday Morning Rush',
    desc: 'Tuesday 08:00 AM, Clear, 15°C',
    data: {
      date_time: '2024-10-15T08:00',
      temp: 15,
      temp_unit: 'C',
      rain_1h: 0.0,
      snow_1h: 0.0,
      clouds_all: 20,
      weather_main: 'Clear',
      weather_description: 'sky is clear',
      holiday: 'None',
    },
  },
  {
    name: 'Rainy Evening Commute',
    desc: 'Friday 05:00 PM, Moderate Rain, 11°C',
    data: {
      date_time: '2024-10-18T17:00',
      temp: 11,
      temp_unit: 'C',
      rain_1h: 6.5,
      snow_1h: 0.0,
      clouds_all: 90,
      weather_main: 'Rain',
      weather_description: 'moderate rain',
      holiday: 'None',
    },
  },
  {
    name: 'Winter Blizzard Rush',
    desc: 'Wednesday 05:30 PM, Heavy Snow, -8°C',
    data: {
      date_time: '2024-12-11T17:30',
      temp: -8,
      temp_unit: 'C',
      rain_1h: 0.0,
      snow_1h: 4.5,
      clouds_all: 100,
      weather_main: 'Snow',
      weather_description: 'heavy snow',
      holiday: 'None',
    },
  },
  {
    name: 'Weekend Midday',
    desc: 'Saturday 02:00 PM, Clear, 22°C',
    data: {
      date_time: '2024-10-19T14:00',
      temp: 22,
      temp_unit: 'C',
      rain_1h: 0.0,
      snow_1h: 0.0,
      clouds_all: 10,
      weather_main: 'Clear',
      weather_description: 'sky is clear',
      holiday: 'None',
    },
  },
  {
    name: 'Late Night Free-Flow',
    desc: 'Monday 02:00 AM, Clear, 10°C',
    data: {
      date_time: '2024-10-14T02:00',
      temp: 10,
      temp_unit: 'C',
      rain_1h: 0.0,
      snow_1h: 0.0,
      clouds_all: 0,
      weather_main: 'Clear',
      weather_description: 'sky is clear',
      holiday: 'None',
    },
  },
];

export default function TrafficForm({
  formData,
  setFormData,
  onSubmit,
  onReset,
  isLoading,
  mode = 'live',
  setMode = () => {},
  liveWeatherInfo,
  isWeatherLoading,
  onFetchLocationWeather,
  onResetToCurrentTime,
  isTimeCustom,
  isWeatherOverridden,
  onResetToLiveWeather,
  onOpenLocationPicker,
  currentLocation,
}) {
  const [validationErrors, setValidationErrors] = useState({});

  // Helper to extract date and time components
  const dateValue = formData.date_time ? formData.date_time.split('T')[0] : '';
  const timeValue = formData.date_time && formData.date_time.includes('T') ? formData.date_time.split('T')[1].slice(0, 5) : '08:00';

  const handleDateChange = (newDate) => {
    const combined = `${newDate}T${timeValue}`;
    setFormData((prev) => ({ ...prev, date_time: combined }));
    validateField('date', newDate);
  };

  const handleTimeChange = (newTime) => {
    const combined = `${dateValue}T${newTime}`;
    setFormData((prev) => ({ ...prev, date_time: combined }));
    validateField('time', newTime);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'weather_main') {
        const available = WEATHER_DESCRIPTIONS[value] || ['sky is clear'];
        next.weather_description = available[0];
      }
      return next;
    });
    validateField(field, value);
  };

  const validateField = (field, value) => {
    const errors = { ...validationErrors };

    if (field === 'temp') {
      const num = Number(value);
      if (isNaN(num)) {
        errors.temp = 'Temperature must be a valid number.';
      } else if (formData.temp_unit === 'C' && (num < -60 || num > 60)) {
        errors.temp = 'Temperature must be between -60°C and 60°C.';
      } else if (formData.temp_unit === 'K' && (num < 213 || num > 333)) {
        errors.temp = 'Temperature must be between 213 K and 333 K.';
      } else {
        delete errors.temp;
      }
    }

    if (field === 'rain_1h') {
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        errors.rain_1h = 'Rainfall cannot be negative.';
      } else if (num > 150) {
        errors.rain_1h = 'Rainfall exceeding 150 mm/hr is unrealistic.';
      } else {
        delete errors.rain_1h;
      }
    }

    if (field === 'snow_1h') {
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        errors.snow_1h = 'Snowfall cannot be negative.';
      } else if (num > 100) {
        errors.snow_1h = 'Snowfall exceeding 100 mm/hr is unrealistic.';
      } else {
        delete errors.snow_1h;
      }
    }

    if (field === 'clouds_all') {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 100) {
        errors.clouds_all = 'Cloud coverage must be between 0% and 100%.';
      } else {
        delete errors.clouds_all;
      }
    }

    if (field === 'date' && !value) {
      errors.date = 'Observation date is required.';
    } else if (field === 'date') {
      delete errors.date;
    }

    if (field === 'time' && !value) {
      errors.time = 'Observation time is required.';
    } else if (field === 'time') {
      delete errors.time;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAll = () => {
    const errors = {};
    if (!dateValue) errors.date = 'Observation date is required.';
    if (!timeValue) errors.time = 'Observation time is required.';

    const tempNum = Number(formData.temp);
    if (isNaN(tempNum)) {
      errors.temp = 'Temperature must be numeric.';
    } else if (formData.temp_unit === 'C' && (tempNum < -60 || tempNum > 60)) {
      errors.temp = 'Temperature must be between -60°C and 60°C.';
    }

    const rainNum = Number(formData.rain_1h);
    if (isNaN(rainNum) || rainNum < 0) {
      errors.rain_1h = 'Rainfall cannot be negative.';
    }

    const snowNum = Number(formData.snow_1h);
    if (isNaN(snowNum) || snowNum < 0) {
      errors.snow_1h = 'Snowfall cannot be negative.';
    }

    const cloudNum = Number(formData.clouds_all);
    if (isNaN(cloudNum) || cloudNum < 0 || cloudNum > 100) {
      errors.clouds_all = 'Cloud coverage must be between 0% and 100%.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateAll()) {
      return;
    }
    onSubmit(e);
  };

  const applyPreset = (presetData) => {
    setFormData(presetData);
    setValidationErrors({});
    if (mode === 'live') {
      setMode('scenario');
    }
  };

  const descriptionsForMain = WEATHER_DESCRIPTIONS[formData.weather_main] || ['sky is clear'];

  const hasErrors = Object.keys(validationErrors).length > 0;

  return (
    <div className="card form-card">
      {/* 1. SELECTED LOCATION CARD */}
      <div className="location-control-card">
        <div className="location-card-top">
          <div className="loc-info-block">
            <span className="loc-caption-label">SELECTED SCENARIO LOCATION</span>
            <div className="loc-title-group">
              <span className="loc-pin-icon">📍</span>
              <h3 className="loc-current-name">{currentLocation?.name || 'Guntur'}</h3>
              <span className="loc-coordinates-badge">
                {currentLocation?.latitude?.toFixed(4)}°, {currentLocation?.longitude?.toFixed(4)}°
              </span>
            </div>
            <p className="loc-subtext">
              {currentLocation?.displayName || `${currentLocation?.name || 'Selected'} Scenario Corridor`}
            </p>
          </div>

          <div className="loc-action-buttons">
            <button
              type="button"
              className="btn-select-location-main"
              onClick={onOpenLocationPicker}
              title="Open Location Selector"
            >
              <Compass size={14} />
              <span>SELECT LOCATION ▼</span>
            </button>

            <button
              type="button"
              className="btn-gps-main"
              onClick={onFetchLocationWeather}
              disabled={isWeatherLoading}
              title="Detect device coordinates using browser GPS"
            >
              {isWeatherLoading ? (
                <RefreshCw size={13} className="spin" />
              ) : (
                <MapPin size={13} />
              )}
              <span>Use My Location</span>
            </button>
          </div>
        </div>

        {/* Live Weather Atmospheric Sync */}
        {liveWeatherInfo && (
          <div className="weather-sync-banner">
            <div className="sync-banner-left">
              {isWeatherOverridden ? (
                <span className="badge-override">
                  <AlertTriangle size={13} />
                  <span>Custom Conditions Active</span>
                </span>
              ) : (
                <span className="badge-synced">
                  <span className="dot-live"></span>
                  <span>Atmospheric Conditions Synced ({liveWeatherInfo.location_name})</span>
                </span>
              )}
              <span className="sync-temp-readout">
                {liveWeatherInfo.temp_celsius}°C, {liveWeatherInfo.weather_main}
              </span>
            </div>

            {isWeatherOverridden && (
              <button
                type="button"
                className="revert-live-btn"
                onClick={onResetToLiveWeather}
                title="Restore values from live weather query"
              >
                Re-sync Weather
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. PREDICTION CONDITIONS SECTION HEADER */}
      <div className="card-header conditions-header">
        <div className="header-title-flex">
          <div>
            <h2 className="card-title">Prediction Conditions</h2>
            <p className="card-description">
              Temporal and meteorological features evaluated by the trained XGBoost regression model.
            </p>
          </div>
          {/* Mode Switcher Tabs */}
          <div className="mode-toggle-group">
            <button
              type="button"
              className={`mode-pill-btn ${mode === 'live' ? 'active' : ''}`}
              onClick={() => setMode('live')}
            >
              Standard Mode
            </button>
            <button
              type="button"
              className={`mode-pill-btn ${mode === 'scenario' ? 'active' : ''}`}
              onClick={() => setMode('scenario')}
            >
              Scenario Presets
            </button>
          </div>
        </div>
      </div>

      {/* Scenario Presets if active */}
      {mode === 'scenario' && (
        <div className="presets-container">
          <div className="presets-label">
            <Zap size={13} />
            <span>Quick Stress Presets:</span>
          </div>
          <div className="presets-grid">
            {SCENARIO_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="preset-btn"
                onClick={() => applyPreset(p.data)}
                title={p.desc}
              >
                <span className="preset-name">{p.name}</span>
                <span className="preset-desc">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Validation Alert Banner */}
      {hasErrors && (
        <div className="validation-alert-box" role="alert">
          <AlertTriangle size={16} className="alert-icon text-red-600" />
          <div className="alert-content">
            <span className="alert-title">Please correct the following errors:</span>
            <ul className="alert-list">
              {Object.values(validationErrors).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 3. FORM FIELDS */}
      <form onSubmit={handleSubmit} className="prediction-form" noValidate>
        <div className="form-grid">
          {/* Date Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="date">
              <Calendar size={15} />
              <span>Date</span>
            </label>
            <input
              id="date"
              type="date"
              className={`form-input ${validationErrors.date ? 'input-error' : ''}`}
              value={dateValue}
              onChange={(e) => handleDateChange(e.target.value)}
              required
            />
            {validationErrors.date && (
              <span className="inline-error-msg">{validationErrors.date}</span>
            )}
          </div>

          {/* Time Field */}
          <div className="form-group">
            <div className="label-with-toggle">
              <label className="form-label" htmlFor="time">
                <Clock size={15} />
                <span>Time of Day</span>
              </label>
              <div className="time-badge-group">
                {isTimeCustom ? (
                  <button
                    type="button"
                    className="time-reset-link"
                    onClick={onResetToCurrentTime}
                    title="Reset to device current local time"
                  >
                    Reset to Now
                  </button>
                ) : (
                  <span className="time-tag-auto">Current</span>
                )}
              </div>
            </div>
            <input
              id="time"
              type="time"
              className={`form-input ${validationErrors.time ? 'input-error' : ''}`}
              value={timeValue}
              onChange={(e) => handleTimeChange(e.target.value)}
              required
            />
            {validationErrors.time && (
              <span className="inline-error-msg">{validationErrors.time}</span>
            )}
          </div>

          {/* Temperature */}
          <div className="form-group">
            <div className="label-with-toggle">
              <label className="form-label" htmlFor="temp">
                <Thermometer size={15} />
                <span>Temperature</span>
              </label>
              <div className="unit-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${formData.temp_unit === 'C' ? 'active' : ''}`}
                  onClick={() => handleChange('temp_unit', 'C')}
                >
                  °C
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${formData.temp_unit === 'K' ? 'active' : ''}`}
                  onClick={() => handleChange('temp_unit', 'K')}
                >
                  K
                </button>
              </div>
            </div>
            <input
              id="temp"
              type="number"
              step="0.1"
              className={`form-input ${validationErrors.temp ? 'input-error' : ''}`}
              value={formData.temp}
              onChange={(e) => handleChange('temp', e.target.value)}
              required
            />
            {validationErrors.temp ? (
              <span className="inline-error-msg">{validationErrors.temp}</span>
            ) : (
              <span className="input-hint">
                {formData.temp_unit === 'C'
                  ? `Standard range: -25°C to 35°C (${(Number(formData.temp || 0) + 273.15).toFixed(1)} K)`
                  : 'Standard range: 248 K to 308 K'}
              </span>
            )}
          </div>

          {/* Cloud Cover */}
          <div className="form-group">
            <label className="form-label" htmlFor="clouds_all">
              <Cloud size={15} />
              <span>Cloud Coverage: {formData.clouds_all}%</span>
            </label>
            <input
              id="clouds_all"
              type="range"
              min="0"
              max="100"
              className="form-range"
              value={formData.clouds_all}
              onChange={(e) => handleChange('clouds_all', e.target.value)}
            />
            <div className="range-markers">
              <span>0% (Clear)</span>
              <span>50%</span>
              <span>100% (Overcast)</span>
            </div>
            {validationErrors.clouds_all && (
              <span className="inline-error-msg">{validationErrors.clouds_all}</span>
            )}
          </div>

          {/* Rain (1h) */}
          <div className="form-group">
            <label className="form-label" htmlFor="rain_1h">
              <CloudRain size={15} />
              <span>Rainfall Past Hour (mm)</span>
            </label>
            <input
              id="rain_1h"
              type="number"
              min="0"
              max="150"
              step="0.1"
              className={`form-input ${validationErrors.rain_1h ? 'input-error' : ''}`}
              value={formData.rain_1h}
              onChange={(e) => handleChange('rain_1h', e.target.value)}
            />
            {validationErrors.rain_1h ? (
              <span className="inline-error-msg">{validationErrors.rain_1h}</span>
            ) : (
              <span className="input-hint">0 = dry, 1–5 = light, 5–15 = moderate, &gt;15 = heavy</span>
            )}
          </div>

          {/* Snow (1h) */}
          <div className="form-group">
            <label className="form-label" htmlFor="snow_1h">
              <Snowflake size={15} />
              <span>Snowfall Past Hour (mm)</span>
            </label>
            <input
              id="snow_1h"
              type="number"
              min="0"
              max="100"
              step="0.05"
              className={`form-input ${validationErrors.snow_1h ? 'input-error' : ''}`}
              value={formData.snow_1h}
              onChange={(e) => handleChange('snow_1h', e.target.value)}
            />
            {validationErrors.snow_1h ? (
              <span className="inline-error-msg">{validationErrors.snow_1h}</span>
            ) : (
              <span className="input-hint">0 = none, 0.1–1.0 = light snow, &gt;2.0 = heavy snow</span>
            )}
          </div>

          {/* Primary Weather Condition */}
          <div className="form-group">
            <label className="form-label" htmlFor="weather_main">
              <Sun size={15} />
              <span>Weather Category</span>
            </label>
            <select
              id="weather_main"
              className="form-select"
              value={formData.weather_main}
              onChange={(e) => handleChange('weather_main', e.target.value)}
            >
              {WEATHER_MAINS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* Weather Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="weather_description">
              <span>Weather Description</span>
            </label>
            <select
              id="weather_description"
              className="form-select"
              value={formData.weather_description}
              onChange={(e) => handleChange('weather_description', e.target.value)}
            >
              {descriptionsForMain.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Holiday */}
          <div className="form-group full-width">
            <label className="form-label" htmlFor="holiday">
              <Award size={15} />
              <span>Holiday Status</span>
            </label>
            <select
              id="holiday"
              className="form-select"
              value={formData.holiday}
              onChange={(e) => handleChange('holiday', e.target.value)}
            >
              {HOLIDAYS.map((h) => (
                <option key={h} value={h}>
                  {h === 'None' ? 'None (Standard Working / Weekend Day)' : h}
                </option>
              ))}
            </select>
            <span className="input-hint">
              Derived calendar signal: federal holidays suppress standard peak commuter volume.
            </span>
          </div>
        </div>

        {/* Action Buttons: PREDICT TRAFFIC & Reset */}
        <div className="form-action-row">
          <button
            type="submit"
            disabled={isLoading || hasErrors}
            className={`btn-predict-main ${isLoading ? 'btn-loading' : ''}`}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                <span>Evaluating XGBoost Decision Trees...</span>
              </>
            ) : (
              <span>PREDICT TRAFFIC</span>
            )}
          </button>

          <button
            type="button"
            className="btn-reset-form"
            onClick={onReset}
            title="Reset form to default values"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </form>
    </div>
  );
}
