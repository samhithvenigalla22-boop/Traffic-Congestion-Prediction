/**
 * Preprocessing Pipeline for Traffic Congestion Prediction
 * Implements StandardScaler and OneHotEncoder matching scikit-learn preprocessing.joblib
 */

import modelData from './modelData.json' with { type: 'json' };

const { numerical: numCols, scaler_mean, scaler_scale, categories } = modelData.features;

export function preprocessFeatures(derived) {
  // 1. Standard Scaler for Numerical Features
  const numVector = new Float32Array(numCols.length);
  for (let i = 0; i < numCols.length; i++) {
    const colName = numCols[i];
    const rawVal = derived.numerical[colName];
    const mean = scaler_mean[i];
    const scale = scaler_scale[i];
    // Cast to single precision float32 matching XGBoost input
    numVector[i] = Math.fround((rawVal - mean) / scale);
  }

  // 2. One-Hot Encoding for Categorical Features
  // weather_main categories
  const weatherCats = categories.weather_main || [];
  const weatherVec = new Float32Array(weatherCats.length);
  const inputWeather = derived.categorical.weather_main;
  for (let i = 0; i < weatherCats.length; i++) {
    if (weatherCats[i] === inputWeather) {
      weatherVec[i] = Math.fround(1.0);
    } else {
      weatherVec[i] = Math.fround(0.0);
    }
  }

  // holiday categories
  const holidayCats = categories.holiday || [];
  const holidayVec = new Float32Array(holidayCats.length);
  const inputHoliday = derived.categorical.holiday;
  for (let i = 0; i < holidayCats.length; i++) {
    if (holidayCats[i] === inputHoliday) {
      holidayVec[i] = Math.fround(1.0);
    } else {
      holidayVec[i] = Math.fround(0.0);
    }
  }

  // 3. Concatenate into single 41-element Float32Array
  const totalLength = numVector.length + weatherVec.length + holidayVec.length;
  const fullFeatureVector = new Float32Array(totalLength);
  
  fullFeatureVector.set(numVector, 0);
  fullFeatureVector.set(weatherVec, numVector.length);
  fullFeatureVector.set(holidayVec, numVector.length + weatherVec.length);

  return fullFeatureVector;
}
