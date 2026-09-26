import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Search,
  Crosshair,
  X,
  Check,
  Loader2,
  Edit3,
  RotateCcw,
  Info,
  Clock,
} from 'lucide-react';
import { PRECONFIGURED_LOCATIONS, DEFAULT_LOCATION } from '../config/locations';
import { getBrowserLocation, searchLocations } from '../services/weather';

export default function LocationSelector({
  isOpen = true,
  onClose,
  selectedLocation,
  currentLocation,
  onSelectLocation,
  recentLocations = [],
  _onResetToDefault,
  _onUseMyLocation,
}) {
  const activeLocation = selectedLocation || currentLocation || DEFAULT_LOCATION;
  const [searchQuery, setSearchQuery] = useState('');
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Manual entry toggle & state
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');

  // Geocoding live search results
  const [externalResults, setExternalResults] = useState([]);
  const [isSearchingExternal, setIsSearchingExternal] = useState(false);

  // Filter predefined locations
  const filteredPreconfigured = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return PRECONFIGURED_LOCATIONS;
    return PRECONFIGURED_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.displayName.toLowerCase().includes(q) ||
        loc.state.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (isOpen === false) return null;

  // Handle GPS "Use My Location"
  const handleUseMyLocation = async () => {
    setIsGpsLoading(true);
    setGpsError(null);
    try {
      const coords = await getBrowserLocation();
      const customGpsLoc = {
        id: `gps-${Date.now()}`,
        name: 'My Current Location',
        displayName: `My Location (${coords.latitude.toFixed(4)}°, ${coords.longitude.toFixed(4)}°)`,
        state: 'Local Region',
        country: 'Detected via GPS',
        latitude: Number(coords.latitude.toFixed(4)),
        longitude: Number(coords.longitude.toFixed(4)),
        corridorName: 'Local Regional Corridor',
        routePoints: ['Selected Area', 'Traffic Zone', 'Prediction Point'],
        isCustom: true,
      };
      onSelectLocation(customGpsLoc);
      onClose();
    } catch (err) {
      setGpsError(err.message || 'Could not access browser location.');
    } finally {
      setIsGpsLoading(false);
    }
  };

  // Handle Manual Location Submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const lat = parseFloat(manualLat) || 16.3067;
    const lon = parseFloat(manualLon) || 80.4365;

    const customLoc = {
      id: `manual-${Date.now()}`,
      name: manualName.trim(),
      displayName: `${manualName.trim()} (Custom Location)`,
      state: 'Custom Scenario',
      country: '',
      latitude: lat,
      longitude: lon,
      corridorName: `${manualName.trim()} Corridor`,
      routePoints: ['Selected Area', 'Traffic Zone', 'Prediction Point'],
      isCustom: true,
    };

    onSelectLocation(customLoc);
    setIsManualMode(false);
    setManualName('');
    setManualLat('');
    setManualLon('');
    onClose();
  };

  // Search external global cities if query doesn't match predefined
  const handleExternalSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setIsSearchingExternal(true);
    try {
      const results = await searchLocations(searchQuery);
      setExternalResults(results);
    } catch (err) {
      console.warn('Geocoding search warning:', err);
    } finally {
      setIsSearchingExternal(false);
    }
  };

  return (
    <div className="location-modal-backdrop location-modal-overlay" onClick={onClose}>
      <div
        className="location-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="loc-modal-title"
      >
        {/* Header */}
        <div className="location-modal-header">
          <div className="loc-header-left">
            <div className="loc-icon-bubble">
              <MapPin size={20} className="text-cyan-400" />
            </div>
            <div>
              <h2 id="loc-modal-title" className="loc-modal-title">
                SELECT LOCATION
              </h2>
              <p className="loc-modal-subtitle">
                Choose a metropolitan corridor, use your device GPS, or enter custom coordinates
              </p>
            </div>
          </div>
          <button
            type="button"
            className="loc-close-btn"
            onClick={onClose}
            aria-label="Close location selector"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="location-modal-body">
          {/* Selected Location Pill */}
          <div className="loc-active-pill-banner">
            <span className="loc-active-label">CURRENTLY SELECTED:</span>
            <span className="loc-active-val">
              📍 <strong>{activeLocation?.name || DEFAULT_LOCATION.name}</strong>
            </span>
            <span className="loc-active-coords">
              ({activeLocation?.latitude?.toFixed(4)}°, {activeLocation?.longitude?.toFixed(4)}°)
            </span>
          </div>

        {/* ML Transparency Notice */}
        <div className="loc-ml-notice-banner">
          <Info size={15} className="notice-icon flex-shrink-0 text-blue-600" />
          <p>
            <strong>Note:</strong> Location is contextual. The current model is trained on historical I-94 traffic data.
            Selecting a location provides geographic scenario naming and coordinates for atmospheric telemetry. The model does not use coordinates as direct training weights.
          </p>
        </div>

        {/* Search & Actions Bar */}
        <div className="loc-search-row">
          <div className="loc-search-input-wrapper">
            <Search size={16} className="loc-search-lens" />
            <input
              type="text"
              className="loc-search-input"
              placeholder="Search location (e.g., Guntur, Vijayawada, Hyderabad)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleExternalSearch();
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="loc-clear-search"
                onClick={() => {
                  setSearchQuery('');
                  setExternalResults([]);
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn-loc-gps"
            onClick={handleUseMyLocation}
            disabled={isGpsLoading}
            title="Detect your device coordinates via browser geolocation"
          >
            {isGpsLoading ? (
              <Loader2 size={15} className="spin-icon" />
            ) : (
              <Crosshair size={15} />
            )}
            <span>Use My Location</span>
          </button>
        </div>

        {gpsError && (
          <div className="loc-gps-error">
            <span>{gpsError}</span>
          </div>
        )}

        {/* Manual Location Form Toggle */}
        <div className="loc-manual-toggle-row">
          <button
            type="button"
            className="btn-toggle-manual"
            onClick={() => setIsManualMode((prev) => !prev)}
          >
            <Edit3 size={14} />
            <span>
              {isManualMode ? 'Hide Manual Input' : 'Enter Location Manually (Custom Scenario)'}
            </span>
          </button>
        </div>

        {/* Manual Input Expandable Form */}
        {isManualMode && (
          <form className="loc-manual-form" onSubmit={handleManualSubmit}>
            <div className="manual-inputs-grid">
              <div className="input-group">
                <label>Location / City Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amaravati, Tirupati, Pune"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Latitude (Optional)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 16.51"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Longitude (Optional)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 80.51"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                />
              </div>
            </div>
            <div className="manual-form-actions">
              <button type="submit" className="btn-save-manual">
                Apply Custom Location
              </button>
              <button
                type="button"
                className="btn-cancel-manual"
                onClick={() => setIsManualMode(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Recent Locations if any */}
        {recentLocations.length > 0 && !searchQuery && (
          <div className="loc-recent-section">
            <span className="loc-section-label">
              <Clock size={12} /> RECENT LOCATIONS
            </span>
            <div className="loc-recent-chips">
              {(recentLocations || []).map((loc) => (
                <button
                  key={`recent-${loc.id}`}
                  type="button"
                  className={`loc-recent-chip ${activeLocation?.id === loc.id ? 'active' : ''}`}
                  onClick={() => {
                    onSelectLocation(loc);
                    onClose();
                  }}
                >
                  <MapPin size={12} />
                  <span>{loc.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preconfigured Locations Grid */}
        <div className="loc-list-container">
          <span className="loc-section-label">SELECT PRECONFIGURED LOCATION</span>
          <div className="loc-grid">
            {(filteredPreconfigured || []).map((loc) => {
              const isSelected = activeLocation?.id === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  className={`loc-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectLocation(loc);
                    onClose();
                  }}
                >
                  <div className="loc-card-radio">
                    <span className={`loc-radio-circle ${isSelected ? 'checked' : ''}`}>
                      {isSelected && <Check size={12} />}
                    </span>
                  </div>
                  <div className="loc-card-info">
                    <div className="loc-card-title-row">
                      <span className="loc-card-name">{loc.name}</span>
                      {loc.isBenchmark && (
                        <span className="loc-benchmark-badge">ML Baseline</span>
                      )}
                    </div>
                    <span className="loc-card-desc">{loc.displayName}</span>
                    <span className="loc-card-coords">
                      {loc.latitude.toFixed(4)}°, {loc.longitude.toFixed(4)}°
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredPreconfigured.length === 0 && (
            <div className="loc-empty-state">
              <p>No preconfigured locations match "{searchQuery}".</p>
              <button
                type="button"
                className="btn-search-external"
                onClick={handleExternalSearch}
                disabled={isSearchingExternal}
              >
                {isSearchingExternal ? (
                  <Loader2 size={14} className="spin-icon" />
                ) : (
                  <Search size={14} />
                )}
                <span>Search Global Geocoding Directory for "{searchQuery}"</span>
              </button>
            </div>
          )}

          {/* External Global City Results if any */}
          {externalResults.length > 0 && (
            <div className="loc-external-results">
              <span className="loc-section-label">GLOBAL SEARCH RESULTS</span>
              <div className="loc-grid">
                {(externalResults || []).map((item, idx) => (
                  <button
                    key={`ext-${idx}`}
                    type="button"
                    className="loc-card"
                    onClick={() => {
                      const newLoc = {
                        id: `ext-${item.name.toLowerCase()}-${Date.now()}`,
                        name: item.name,
                        displayName: item.display_name,
                        state: item.admin1 || '',
                        country: item.country || '',
                        latitude: item.latitude,
                        longitude: item.longitude,
                        corridorName: `${item.name} Regional Corridor`,
                        routePoints: ['Selected Area', 'Traffic Zone', 'Prediction Point'],
                        isCustom: true,
                      };
                      onSelectLocation(newLoc);
                      onClose();
                    }}
                  >
                    <div className="loc-card-info">
                      <span className="loc-card-name">{item.name}</span>
                      <span className="loc-card-desc">{item.display_name}</span>
                      <span className="loc-card-coords">
                        {item.latitude.toFixed(4)}°, {item.longitude.toFixed(4)}°
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Footer */}
      <div className="location-modal-footer">
          <button
            type="button"
            className="btn-reset-default"
            onClick={() => {
              onSelectLocation(DEFAULT_LOCATION);
              onClose();
            }}
          >
            <RotateCcw size={13} />
            <span>Reset to Default (Guntur)</span>
          </button>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
