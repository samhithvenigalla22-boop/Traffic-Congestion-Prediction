import { useState } from 'react';
import {
  History,
  Trash2,
  ArrowUpRight,
  Download,
  Filter,
} from 'lucide-react';

export default function PredictionHistory({ history = [], onLoadScenario, onClearHistory }) {
  const [filterLevel, setFilterLevel] = useState('ALL');
  const safeHistory = Array.isArray(history) ? history : [];

  const handleClearWithConfirm = () => {
    if (window.confirm('Are you sure you want to clear your prediction history from the database? This action cannot be undone.')) {
      onClearHistory();
    }
  };

  const filteredHistory = safeHistory.filter((item) => {
    if (filterLevel === 'ALL') return true;
    return item.congestion_level === filterLevel;
  });

  const handleExportCSV = () => {
    if (safeHistory.length === 0) return;

    const headers = [
      'Timestamp',
      'Date',
      'Time',
      'Corridor',
      'Direction',
      'PredictionPoint',
      'PredictedVolume',
      'CongestionLevel',
      'Weather',
      'Temperature',
      'Rain',
      'Snow',
      'Clouds',
      'Holiday',
    ];

    const rows = safeHistory.map((item) => [
      item.created_at,
      item.date || '',
      item.time || '',
      item.corridor || 'Main Arterial Corridor',
      item.direction || 'Inbound',
      item.prediction_point || 'Point A',
      Math.round(item.predicted_traffic ?? item.predicted_traffic_volume ?? 0),
      item.congestion_level,
      item.weather || '',
      item.temperature ?? '',
      item.rain ?? '',
      item.snow ?? '',
      item.clouds ?? '',
      item.holiday ?? 'None',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `traffic_prediction_history_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card history-card">
      <div className="history-header">
        <div className="history-title-group">
          <History size={18} className="text-blue-600" />
          <h2 className="history-title">Prediction History</h2>
          <span className="history-count-badge">{safeHistory.length} Saved Records</span>
        </div>

        <div className="history-actions">
          {/* Filter Pills */}
          <div className="history-filters" role="group" aria-label="Filter by congestion">
            <span className="filter-label">
              <Filter size={12} />
              <span>Filter:</span>
            </span>
            {['ALL', 'LOW', 'MODERATE', 'HIGH'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`history-filter-pill ${filterLevel === lvl ? 'active-filter' : ''}`}
                onClick={() => setFilterLevel(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <button
            type="button"
            className="btn-history-export"
            onClick={handleExportCSV}
            disabled={safeHistory.length === 0}
            title="Export history records as CSV"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>

          {/* Clear History */}
          <button
            type="button"
            className="btn-history-clear"
            onClick={handleClearWithConfirm}
            disabled={safeHistory.length === 0}
            title="Delete all records from SQLite database"
          >
            <Trash2 size={13} />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="history-empty-state">
          <History size={40} className="empty-icon text-slate-300" />
          <h3 className="empty-title">
            {safeHistory.length === 0 ? 'No Prediction History Found' : `No ${filterLevel} Records Found`}
          </h3>
          <p className="empty-desc">
            {safeHistory.length === 0
              ? 'Predictions evaluated on the Prediction tab will be recorded in the SQLite database.'
              : `Switch your filter back to "ALL" to inspect other records.`}
          </p>
        </div>
      ) : (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Corridor & Direction</th>
                <th>Prediction Point</th>
                <th>Conditions</th>
                <th>Predicted Volume</th>
                <th>Congestion Level</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item, idx) => {
                const vol = Math.round(item.predicted_traffic ?? item.predicted_traffic_volume ?? 0);
                const badgeClass =
                  item.congestion_level === 'HIGH'
                    ? 'badge-high'
                    : item.congestion_level === 'LOW'
                    ? 'badge-low'
                    : 'badge-moderate';

                return (
                  <tr key={item.id || idx}>
                    <td className="font-mono text-sm">
                      <div className="history-dt-block">
                        <span className="font-medium text-slate-900">{item.date}</span>
                        <span className="text-xs text-slate-500">{item.time}</span>
                      </div>
                    </td>
                    <td>
                      <div className="history-corridor-cell">
                        <span className="font-semibold text-slate-800">{item.corridor || 'Main Arterial Corridor'}</span>
                        <span className="text-xs text-blue-600 font-medium">{item.direction || 'Inbound'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-slate-700">{item.prediction_point || 'Point A'}</span>
                    </td>
                    <td className="text-sm">
                      <div className="history-conds-cell">
                        <span>{item.temperature}°C, {item.weather}</span>
                        {item.holiday && item.holiday !== 'None' && (
                          <span className="text-xs text-amber-600 font-medium">Holiday: {item.holiday}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="history-vol-num font-mono font-bold text-slate-900">
                        {vol.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">veh/hr</span>
                    </td>
                    <td>
                      <span className={`congestion-badge ${badgeClass}`}>
                        <span className="badge-dot"></span>
                        <span className="badge-text">{item.congestion_level}</span>
                      </span>
                    </td>
                    <td className="text-right">
                      {onLoadScenario && (
                        <button
                          type="button"
                          className="btn-load-scenario"
                          onClick={() => onLoadScenario(item)}
                          title="Populate prediction form with these conditions"
                        >
                          <ArrowUpRight size={13} />
                          <span>Load Scenario</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
