// CommonJS test script for verifying JS prediction engine with Node
const fs = require('fs');
const path = require('path');

const modelData = JSON.parse(fs.readFileSync(path.join(__dirname, '../frontend/src/ml/modelData.json'), 'utf8'));

// Test sample matching the python test
const sample = {
  temp: 15.13, // 15.13 C = 288.28 K
  temp_unit: 'C',
  rain_1h: 0.0,
  snow_1h: 0.0,
  clouds_all: 40,
  date_time: '2012-10-02T09:00:00',
  weather_main: 'Clouds',
  holiday: 'None'
};

// Feature Engineering
const dateObj = new Date(sample.date_time);
const hour = dateObj.getHours();
const jsDay = dateObj.getDay();
const day_of_week = jsDay === 0 ? 6 : jsDay - 1;
const day = dateObj.getDate();
const month = dateObj.getMonth() + 1;
const year = dateObj.getFullYear();
const is_weekend = day_of_week >= 5 ? 1 : 0;
const is_rush_hour = (is_weekend === 0 && [7, 8, 9, 16, 17, 18].includes(hour)) ? 1 : 0;

const sin_hour = Math.sin((2 * Math.PI * hour) / 24.0);
const cos_hour = Math.cos((2 * Math.PI * hour) / 24.0);
const sin_month = Math.sin((2 * Math.PI * month) / 12.0);
const cos_month = Math.cos((2 * Math.PI * month) / 12.0);
const sin_dow = Math.sin((2 * Math.PI * day_of_week) / 7.0);
const cos_dow = Math.cos((2 * Math.PI * day_of_week) / 7.0);

const temp_k = Math.max(180.0, Math.min(sample.temp + 273.15, 340.0));
const rain_1h = Math.min(Math.max(sample.rain_1h, 0), 100.0);
const snow_1h = Math.min(Math.max(sample.snow_1h, 0), 50.0);
const clouds_all = Math.min(Math.max(Math.round(sample.clouds_all), 0), 100);

const holiday = sample.holiday;
const is_holiday = holiday !== 'None' ? 1 : 0;
const weather_main = sample.weather_main;

const derived = {
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
};

// Preprocessing
const { numerical: numCols, scaler_mean, scaler_scale, categories } = modelData.features;
const numVector = new Float32Array(numCols.length);
for (let i = 0; i < numCols.length; i++) {
  const col = numCols[i];
  const raw = derived[col];
  numVector[i] = Math.fround((raw - scaler_mean[i]) / scaler_scale[i]);
}

const weatherCats = categories.weather_main;
const weatherVec = new Float32Array(weatherCats.length);
for (let i = 0; i < weatherCats.length; i++) {
  weatherVec[i] = weatherCats[i] === weather_main ? Math.fround(1.0) : Math.fround(0.0);
}

const holidayCats = categories.holiday;
const holidayVec = new Float32Array(holidayCats.length);
for (let i = 0; i < holidayCats.length; i++) {
  holidayVec[i] = holidayCats[i] === holiday ? Math.fround(1.0) : Math.fround(0.0);
}

const totalLength = numVector.length + weatherVec.length + holidayVec.length;
const featureVector = new Float32Array(totalLength);
featureVector.set(numVector, 0);
featureVector.set(weatherVec, numVector.length);
featureVector.set(holidayVec, numVector.length + weatherVec.length);

// Tree evaluation
function evaluateTree(node, vec) {
  while (node.leaf === undefined) {
    const featIdx = parseInt(node.split.slice(1), 10);
    const val = vec[featIdx] || 0.0;
    const cond = Math.fround(node.split_condition);
    const nextId = val < cond ? node.yes : node.no;
    let found = false;
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        if (node.children[i].nodeid === nextId) {
          node = node.children[i];
          found = true;
          break;
        }
      }
    }
    if (!found) break;
  }
  return node.leaf !== undefined ? node.leaf : 0.0;
}

let sum = 0.0;
for (const tree of modelData.trees) {
  sum += evaluateTree(tree, featureVector);
}

const result = modelData.base_score + sum;
console.log('Base score:', modelData.base_score);
console.log('Tree leaf sum:', sum);
console.log('Node JS Predicted Volume:', result);
console.log('Expected Python Volume:   5410.7437');
console.log('Absolute Difference:     ', Math.abs(result - 5410.7437));
