/**
 * Feature Engineering for Metro Interstate Traffic Volume Prediction
 * Exact alignment with trained pipeline in Python.
 */

export function deriveFeatures(input) {
  // 1. Date/Time Parsing
  const dateObj = input.date_time ? new Date(input.date_time) : new Date();
  
  // Safely extract local components or UTC depending on string format
  const hour = dateObj.getHours();
  // In JavaScript: getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday.
  // In Python pandas: dt.dayofweek returns 0 for Monday, ..., 6 for Sunday.
  const jsDay = dateObj.getDay();
  const day_of_week = jsDay === 0 ? 6 : jsDay - 1; // Map Sunday -> 6, Mon -> 0, Tue -> 1...
  
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1; // 1-12
  const year = dateObj.getFullYear();

  const is_weekend = day_of_week >= 5 ? 1 : 0;
  const is_rush_hour = (is_weekend === 0 && [7, 8, 9, 16, 17, 18].includes(hour)) ? 1 : 0;

  // Cyclical Sine and Cosine Transformations
  const sin_hour = Math.sin((2 * Math.PI * hour) / 24.0);
  const cos_hour = Math.cos((2 * Math.PI * hour) / 24.0);
  const sin_month = Math.sin((2 * Math.PI * month) / 12.0);
  const cos_month = Math.cos((2 * Math.PI * month) / 12.0);
  const sin_dow = Math.sin((2 * Math.PI * day_of_week) / 7.0);
  const cos_dow = Math.cos((2 * Math.PI * day_of_week) / 7.0);

  // 2. Temperature Conversion to Kelvin
  let temp_k;
  if (input.temp_unit === 'C' || input.temp_unit === 'Celsius') {
    temp_k = Number(input.temp) + 273.15;
  } else if (input.temp_unit === 'F' || input.temp_unit === 'Fahrenheit') {
    temp_k = ((Number(input.temp) - 32) * 5) / 9 + 273.15;
  } else {
    // Default assumes Kelvin if > 150, or Celsius if <= 100
    const rawVal = Number(input.temp);
    temp_k = rawVal > 150 ? rawVal : rawVal + 273.15;
  }
  // Clamp to realistic bounds
  temp_k = Math.max(180.0, Math.min(temp_k, 340.0));

  // 3. Rain, Snow, Clouds
  const rain_1h = Math.min(Math.max(Number(input.rain_1h) || 0, 0), 100.0);
  const snow_1h = Math.min(Math.max(Number(input.snow_1h) || 0, 0), 50.0);
  const clouds_all = Math.min(Math.max(Math.round(Number(input.clouds_all) || 0), 0), 100);

  // 4. Categoricals
  const holiday = (input.holiday || 'None').trim() || 'None';
  const is_holiday = holiday !== 'None' ? 1 : 0;
  const weather_main = (input.weather_main || 'Clear').trim() || 'Clear';

  return {
    numerical: {
      temp: temp_k,
      rain_1h,
      snow_1h,
      clouds_all,
      hour,
      day_of_week,
      day,
      month,
      year,
      is_weekend,
      is_rush_hour,
      is_holiday,
      sin_hour,
      cos_hour,
      sin_month,
      cos_month,
      sin_dow,
      cos_dow,
    },
    categorical: {
      weather_main,
      holiday,
    },
    meta: {
      hour,
      day_of_week,
      day,
      month,
      year,
      is_weekend: Boolean(is_weekend),
      is_rush_hour: Boolean(is_rush_hour),
      is_holiday: Boolean(is_holiday),
      temp_kelvin: Math.round(temp_k * 100) / 100,
      temp_celsius: Math.round((temp_k - 273.15) * 10) / 10,
      temp_fahrenheit: Math.round((((temp_k - 273.15) * 9) / 5 + 32) * 10) / 10,
      weather_main,
      holiday,
    },
  };
}
