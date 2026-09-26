/**
 * Traffic Intelligence Model Adapter
 * Unified interface for executing the trained XGBoost model and managing prediction history.
 * Operates 100% standalone within the client.
 */

import { predictVolume, getModelMetadata } from './prediction';

const HISTORY_STORAGE_KEY = 'traffic_prediction_history';

/**
 * Executes traffic volume prediction via the client-side XGBoost engine
 */
export async function predictTraffic(input) {
  // Simulate a minimal realistic computation tick (120ms) for UI responsiveness & tactile feedback
  await new Promise((resolve) => setTimeout(resolve, 120));

  const result = predictVolume(input);

  // Automatically record to persistent localStorage history
  try {
    const rawDt = input.date_time || '';
    const datePart = rawDt.includes('T') ? rawDt.split('T')[0] : (rawDt.split(' ')[0] || '');
    const timePart = rawDt.includes('T') ? rawDt.split('T')[1]?.slice(0, 5) : (rawDt.split(' ')[1]?.slice(0, 5) || '');

    savePredictionToHistory({
      id: `pred_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      date: datePart,
      time: timePart,
      temperature: input.temp !== undefined ? `${input.temp}°${input.temp_unit || 'C'}` : 'N/A',
      temp_val: input.temp,
      temp_unit: input.temp_unit || 'C',
      rain: input.rain_1h !== undefined ? `${input.rain_1h} mm` : '0 mm',
      snow: input.snow_1h !== undefined ? `${input.snow_1h} mm` : '0 mm',
      clouds: input.clouds_all !== undefined ? `${input.clouds_all}%` : '0%',
      weather: input.weather_main || 'Clear',
      weather_description: input.weather_description || 'sky is clear',
      holiday: input.holiday || 'None',
      predicted_traffic: Math.round(result.predicted_traffic_volume),
      predicted_traffic_volume: result.predicted_traffic_volume,
      congestion_level: result.congestion_level,
      mode: input._mode || 'live',
      formData: { ...input },
      input,
      result,
    });
  } catch (err) {
    console.warn('Could not persist prediction to localStorage:', err);
  }

  return result;
}

/**
 * Retrieves the full XGBoost metadata, evaluation metrics, and feature importances
 */
export function getModelPerformance() {
  const meta = getModelMetadata();
  return {
    model_name: meta.model_name,
    evaluation_metrics: meta.evaluation_metrics,
    feature_importances: meta.feature_importances,
    congestion_thresholds: meta.congestion_thresholds,
    n_trees: meta.n_trees,
  };
}

/**
 * Prediction History Management via localStorage
 */
export function getPredictionHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading prediction history:', e);
    return [];
  }
}

export function savePredictionToHistory(entry) {
  try {
    const history = getPredictionHistory();
    // Keep max 50 entries, newest first
    const updated = [entry, ...history.filter(h => h.id !== entry.id)].slice(0, 50);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving prediction history:', e);
    return [];
  }
}

export function deletePredictionFromHistory(id) {
  try {
    const history = getPredictionHistory();
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error deleting prediction history entry:', e);
    return [];
  }
}

export function clearPredictionHistory() {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    return [];
  } catch (e) {
    console.error('Error clearing prediction history:', e);
    return [];
  }
}
