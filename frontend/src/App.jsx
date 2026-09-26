import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import Header from './components/Header';
import HeroNetworkVisual from './components/HeroNetworkVisual';
import TrafficForm from './components/TrafficForm';
import PredictionResult from './components/PredictionResult';
import ScenarioSimulator from './components/ScenarioSimulator';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ModelPerformance from './components/ModelPerformance';
import PredictionHistory from './components/PredictionHistory';
import ModelInfoModal from './components/ModelInfoModal';
import LocationSelector from './components/LocationSelector';
import Toast from './components/Toast';
import Login from './components/Login';
import Signup from './components/Signup';
import { api } from './config/api';
import { predictTraffic } from './ml/modelAdapter';
import { getBrowserLocation, fetchLiveWeatherClient } from './services/weather';
import { DEFAULT_LOCATION } from './config/locations';

function getDeviceLocalDateTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const DEFAULT_FORM_STATE = {
  date_time: getDeviceLocalDateTime(),
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

export default function App() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'

  // Navigation tab state
  const [activeView, setActiveView] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (['predict', 'what-if', 'analytics', 'model', 'history'].includes(hash)) {
      return hash;
    }
    return 'predict';
  });

  useEffect(() => {
    window.location.hash = activeView;
  }, [activeView]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['predict', 'what-if', 'analytics', 'model', 'history'].includes(hash)) {
        setActiveView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [mode, setMode] = useState('live');
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('traffic_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('traffic_theme', currentTheme);
  }, [currentTheme]);

  const [selectedLocation, setSelectedLocation] = useState(() => {
    const saved = localStorage.getItem('traffic_location');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return DEFAULT_LOCATION;
  });

  const [recentLocations, setRecentLocations] = useState(() => {
    const saved = localStorage.getItem('traffic_recent_locations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return [];
  });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    ...DEFAULT_FORM_STATE,
    date_time: getDeviceLocalDateTime(),
  });

  const [liveWeatherInfo, setLiveWeatherInfo] = useState(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [isTimeCustom, setIsTimeCustom] = useState(false);
  const [isWeatherOverridden, setIsWeatherOverridden] = useState(false);

  const [prediction, setPrediction] = useState(null);
  const [predictionMode, setPredictionMode] = useState('live');
  const [isLoading, setIsLoading] = useState(false);
  const [isModelInfoOpen, setIsModelInfoOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Backend Prediction History
  const [history, setHistory] = useState([]);

  const showToast = (message, type = 'info', title = '') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, title }]);
  };

  const hideToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Fetch prediction history from backend
  const fetchHistory = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const histData = await api.getHistory();
        setHistory(Array.isArray(histData) ? histData : []);
      } catch (err) {
        console.warn('Could not load history from backend:', err);
        setHistory([]);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const fetchWeather = useCallback(async (lat, lon, locName) => {
    setIsWeatherLoading(true);
    try {
      const data = await fetchLiveWeatherClient(lat, lon);
      setLiveWeatherInfo({ ...data, location_name: locName });

      setFormData((prev) => ({
        ...prev,
        temp: data.temp_celsius,
        temp_unit: 'C',
        clouds_all: data.clouds_all,
        weather_main: data.weather_main,
        weather_description: data.weather_description,
        rain_1h: data.rain_1h,
        snow_1h: data.snow_1h,
      }));
      setIsWeatherOverridden(false);
      showToast(`Atmospheric weather synchronized for ${locName}`, 'success');
    } catch {
      showToast('Could not fetch live weather; standard conditions preserved.', 'warning');
    } finally {
      setIsWeatherLoading(false);
    }
  }, []);

  const handleSelectLocation = (loc) => {
    setSelectedLocation(loc);
    localStorage.setItem('traffic_location', JSON.stringify(loc));

    setRecentLocations((prev) => {
      const updated = [loc, ...prev.filter((item) => item.id !== loc.id)].slice(0, 5);
      localStorage.setItem('traffic_recent_locations', JSON.stringify(updated));
      return updated;
    });

    fetchWeather(loc.latitude, loc.longitude, loc.name);
    setIsLocationModalOpen(false);
  };

  const handleResetLocationToDefault = () => {
    handleSelectLocation(DEFAULT_LOCATION);
  };

  const handleFetchLocationWeather = async () => {
    setIsWeatherLoading(true);
    try {
      const coords = await getBrowserLocation();
      const customLoc = {
        id: 'browser_geo',
        name: 'My GPS Location',
        displayName: 'Browser Geolocation',
        latitude: coords.latitude,
        longitude: coords.longitude,
        corridorName: 'Local Regional Corridor',
        routePoints: ['Inbound Gateway', 'Core Traffic Zone', 'Outbound Junction'],
      };
      handleSelectLocation(customLoc);
    } catch (err) {
      showToast(err.message, 'warning');
      setIsWeatherLoading(false);
    }
  };

  const handleResetToCurrentTime = () => {
    setFormData((prev) => ({
      ...prev,
      date_time: getDeviceLocalDateTime(),
    }));
    setIsTimeCustom(false);
    showToast('Reset observation time to current local device clock', 'info');
  };

  const handleResetToLiveWeather = () => {
    if (liveWeatherInfo) {
      setFormData((prev) => ({
        ...prev,
        temp: liveWeatherInfo.temp_celsius,
        temp_unit: 'C',
        clouds_all: liveWeatherInfo.clouds_all,
        weather_main: liveWeatherInfo.weather_main,
        weather_description: liveWeatherInfo.weather_description,
        rain_1h: liveWeatherInfo.rain_1h,
        snow_1h: liveWeatherInfo.snow_1h,
      }));
      setIsWeatherOverridden(false);
      showToast('Restored live atmospheric weather observations', 'info');
    }
  };

  const handleFormReset = () => {
    setFormData({
      ...DEFAULT_FORM_STATE,
      date_time: getDeviceLocalDateTime(),
    });
    setPrediction(null);
    setIsTimeCustom(false);
    setIsWeatherOverridden(false);
    showToast('Form reset to default baseline values', 'info');
  };

  // Prediction Submit: Calls FastAPI Backend
  const handleFormSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    setIsLoading(true);
    setPredictionMode(mode);

    const rawDt = formData.date_time || '';
    const datePart = rawDt.includes('T') ? rawDt.split('T')[0] : (rawDt.split(' ')[0] || '2024-10-15');
    const timePart = rawDt.includes('T') ? rawDt.split('T')[1].slice(0, 5) : '08:00';

    const payload = {
      date: datePart,
      time: timePart,
      temperature: Number(formData.temp),
      rain: Number(formData.rain_1h || 0),
      snow: Number(formData.snow_1h || 0),
      clouds: Number(formData.clouds_all || 0),
      weather: formData.weather_main || 'Clear',
      holiday: formData.holiday || 'None',
      corridor: formData.corridor || 'Main Arterial Corridor',
      direction: formData.direction || 'Inbound',
      prediction_point: formData.prediction_point || 'Point A (North Gateway)',
    };

    try {
      let res;
      try {
        // Try FastAPI backend
        res = await api.predict(payload);
      } catch (backendErr) {
        console.warn('Backend predict failed, using browser model fallback:', backendErr);
        // Fallback to client-side XGBoost engine
        const fallbackRes = await predictTraffic({
          date_time: `${datePart} ${timePart}`,
          temp: payload.temperature,
          temp_unit: formData.temp_unit,
          rain_1h: payload.rain,
          snow_1h: payload.snow,
          clouds_all: payload.clouds,
          weather_main: payload.weather,
          weather_description: formData.weather_description || 'sky is clear',
          holiday: payload.holiday,
        });
        res = {
          predicted_traffic: fallbackRes.predicted_traffic_volume,
          congestion_level: fallbackRes.congestion_level,
          model: 'XGBoost Regressor (Client Engine)',
          r2: 0.95,
          mae: 282.44,
          rmse: 458.60,
          corridor: payload.corridor,
          direction: payload.direction,
          prediction_point: payload.prediction_point,
          date: payload.date,
          time: payload.time,
        };
      }

      setPrediction({
        ...res,
        predicted_traffic_volume: res.predicted_traffic,
        congestion_description:
          res.congestion_level === 'LOW'
            ? 'Free-flow highway conditions, steady off-peak travel, minimal delay.'
            : res.congestion_level === 'MODERATE'
            ? 'Normal daytime traffic density, minor congestion pockets, steady speeds.'
            : 'Rush-hour capacity constraint, heavy volume queues, significant delays.',
        estimated_speed_mph: res.congestion_level === 'LOW' ? 55 : res.congestion_level === 'MODERATE' ? 42 : 22,
        delay_minutes: res.congestion_level === 'LOW' ? 0 : res.congestion_level === 'MODERATE' ? 6 : 18,
      });

      showToast(`Prediction: ${Math.round(res.predicted_traffic).toLocaleString()} veh/hr (${res.congestion_level})`, 'success');
      fetchHistory();
    } catch (err) {
      showToast(`Prediction failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.clearHistory();
      setHistory([]);
      showToast('Prediction history cleared from database', 'info');
    } catch (err) {
      showToast(`Failed to clear history: ${err.message}`, 'error');
    }
  };

  const handleLoadScenarioFromHistory = (item) => {
    const rawDt = `${item.date || '2024-10-15'}T${item.time || '08:00'}`;
    setFormData((prev) => ({
      ...prev,
      date_time: rawDt,
      temp: item.temperature ?? prev.temp,
      temp_unit: 'C',
      rain_1h: item.rain ?? 0,
      snow_1h: item.snow ?? 0,
      clouds_all: item.clouds ?? 20,
      weather_main: item.weather ?? 'Clear',
      holiday: item.holiday ?? 'None',
      corridor: item.corridor || 'Main Arterial Corridor',
      direction: item.direction || 'Inbound',
      prediction_point: item.prediction_point || 'Point A (North Gateway)',
    }));

    setActiveView('predict');
    window.location.hash = 'predict';
    showToast(`Loaded scenario from ${item.date} ${item.time}`, 'info');
  };

  const handleApplyScenarioFromSimulator = (scenarioData) => {
    setFormData((prev) => ({
      ...prev,
      ...scenarioData,
    }));
    setActiveView('predict');
    window.location.hash = 'predict';
    showToast('Applied simulated parameters to prediction form', 'success');
  };

  // Auth gate
  if (authLoading) {
    return (
      <div className="auth-page-container">
        <div className="placeholder-content">
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#64748B' }}>Loading Traffic Intelligence Platform...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === 'login' ? (
      <Login onSwitchToSignup={() => setAuthView('signup')} />
    ) : (
      <Signup onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  return (
    <div className="app-container">
      <Header
        onOpenModelInfo={() => setIsModelInfoOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
        historyCount={history.length}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
        currentLocation={selectedLocation}
        onOpenLocationPicker={() => setIsLocationModalOpen(true)}
        user={user}
        onLogout={logout}
      />

      <HeroNetworkVisual
        currentLocation={selectedLocation}
        onOpenLocationPicker={() => setIsLocationModalOpen(true)}
      />

      <main className="main-content">
        {activeView === 'predict' && (
          <div className="dashboard-grid">
            <div className="form-column">
              <TrafficForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleFormSubmit}
                onReset={handleFormReset}
                isLoading={isLoading}
                mode={mode}
                setMode={setMode}
                liveWeatherInfo={liveWeatherInfo}
                isWeatherLoading={isWeatherLoading}
                onFetchLocationWeather={handleFetchLocationWeather}
                onResetToCurrentTime={handleResetToCurrentTime}
                isTimeCustom={isTimeCustom}
                isWeatherOverridden={isWeatherOverridden}
                onResetToLiveWeather={handleResetToLiveWeather}
                onOpenLocationPicker={() => setIsLocationModalOpen(true)}
                currentLocation={selectedLocation}
              />
            </div>
            <div className="result-column">
              <PredictionResult
                prediction={prediction}
                predictionMode={predictionMode}
              />
            </div>
          </div>
        )}

        {activeView === 'what-if' && (
          <ScenarioSimulator
            basePrediction={prediction}
            baseFormData={formData}
            onApplyToMainForm={handleApplyScenarioFromSimulator}
          />
        )}

        {activeView === 'analytics' && (
          <AnalyticsDashboard
            history={history}
            onSelectHistoryItem={handleLoadScenarioFromHistory}
          />
        )}

        {activeView === 'model' && (
          <ModelPerformance />
        )}

        {activeView === 'history' && (
          <PredictionHistory
            history={history}
            onLoadScenario={handleLoadScenarioFromHistory}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>

      <footer className="footer-container">
        <div className="footer-content">
          <p className="footer-text">
            Traffic Congestion Intelligence Platform &bull; FastAPI + SQLite Backend &bull; XGBoost Regressor ($R^2=0.95$)
          </p>
          <div className="footer-links">
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => setIsModelInfoOpen(true)}
            >
              Model Architecture & Specifications
            </button>
            <span className="footer-divider">&bull;</span>
            <span className="footer-badge">Chronological Train/Val/Test Split</span>
          </div>
        </div>
      </footer>

      {isModelInfoOpen && (
        <ModelInfoModal onClose={() => setIsModelInfoOpen(false)} />
      )}

      {isLocationModalOpen && (
        <LocationSelector
          currentLocation={selectedLocation}
          recentLocations={recentLocations}
          onSelectLocation={handleSelectLocation}
          onResetToDefault={handleResetLocationToDefault}
          onUseMyLocation={handleFetchLocationWeather}
          onClose={() => setIsLocationModalOpen(false)}
        />
      )}

      {toasts.length > 0 && (
        <Toast
          toasts={toasts}
          onDismiss={hideToast}
        />
      )}
    </div>
  );
}
