import { useState, useEffect } from 'react';
import {
  Compass,
  Clock,
  BarChart3,
  Sliders,
  History,
  Activity,
  Layers,
  MapPin,
  CheckCircle2,
  User,
  LogOut,
} from 'lucide-react';
import ThemeSelector from './ThemeSelector';

export default function Header({
  onOpenModelInfo,
  activeView,
  setActiveView,
  historyCount = 0,
  currentTheme = 'light',
  onSelectTheme = () => {},
  currentLocation = null,
  onOpenLocationPicker = () => {},
  user = null,
  onLogout = () => {},
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const formatDate = (d) => {
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleNavClick = (viewId) => {
    if (setActiveView) {
      setActiveView(viewId);
      window.location.hash = viewId;
    }
  };

  const locationName = currentLocation?.name || 'Guntur';

  return (
    <header className="header-container">
      <div className="header-content">
        {/* Brand & Context Title */}
        <div className="brand-section">
          <div className="brand-emblem">
            <Activity className="brand-emblem-icon" size={20} />
          </div>
          <div className="brand-text-block">
            <div className="brand-title-row">
              <h1 className="brand-title">TRAFFIC INTELLIGENCE PLATFORM</h1>
              <button
                type="button"
                className="brand-location-btn"
                onClick={onOpenLocationPicker}
                title="Change active location or scenario"
              >
                <MapPin size={12} className="text-blue-600" />
                <span>📍 {locationName}</span>
              </button>
            </div>
            <p className="brand-subtitle">
              FastAPI & SQLite Backend &bull; XGBoost Regression &bull; React Analytics
            </p>
          </div>
        </div>

        {/* Live Device Clock HUD */}
        <div className="header-clock-hud">
          <div className="hud-clock-row">
            <Clock size={13} className="clock-icon" />
            <span className="clock-time">{formatTime(currentTime)}</span>
            <span className="clock-tz">LOCAL</span>
          </div>
          <span className="clock-date">{formatDate(currentTime)}</span>
        </div>

        {/* Primary Enterprise Navigation Tabs */}
        <div className="header-actions">
          <nav className="header-nav-pills" aria-label="Main Navigation">
            <button
              type="button"
              className={`nav-pill-btn ${activeView === 'predict' ? 'active-nav' : ''}`}
              onClick={() => handleNavClick('predict')}
            >
              <Compass size={14} />
              <span>Prediction</span>
            </button>

            <button
              type="button"
              className={`nav-pill-btn ${activeView === 'what-if' ? 'active-nav' : ''}`}
              onClick={() => handleNavClick('what-if')}
            >
              <Sliders size={14} />
              <span>What-If</span>
            </button>

            <button
              type="button"
              className={`nav-pill-btn ${activeView === 'analytics' ? 'active-nav' : ''}`}
              onClick={() => handleNavClick('analytics')}
            >
              <BarChart3 size={14} />
              <span>Analytics</span>
            </button>

            <button
              type="button"
              className={`nav-pill-btn ${activeView === 'model' ? 'active-nav' : ''}`}
              onClick={() => handleNavClick('model')}
            >
              <Layers size={14} />
              <span>Model</span>
            </button>

            <button
              type="button"
              className={`nav-pill-btn ${activeView === 'history' ? 'active-nav' : ''}`}
              onClick={() => handleNavClick('history')}
            >
              <History size={14} />
              <span>History {historyCount > 0 ? `(${historyCount})` : ''}</span>
            </button>
          </nav>

          {/* Theme Switcher */}
          <ThemeSelector currentTheme={currentTheme} onSelectTheme={onSelectTheme} />

          {/* Model Metrics Quick Trigger */}
          <button
            type="button"
            className="model-info-btn"
            onClick={onOpenModelInfo}
            title="Inspect XGBoost Model Architecture & Metrics"
          >
            <span className="font-semibold text-blue-600">XGBoost</span>
            <span className="model-info-divider">•</span>
            <span>R² 0.95</span>
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="user-profile-badge">
              <User size={13} className="text-blue-600" />
              <span>{user?.name ? user.name.split(' ')[0] : (user?.email?.split('@')[0] || 'User')}</span>
              <button
                type="button"
                className="btn-logout"
                onClick={onLogout}
                title="Sign Out of Traffic Platform"
              >
                <LogOut size={12} />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Engine Status Indicator */}
          <div
            className="status-pill status-healthy"
            title="FastAPI Backend connected with trained XGBoost model"
          >
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>FastAPI & SQLite Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
}
