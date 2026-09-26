/**
 * Browser Geolocation, Corridor Directory, and Client-Side Open-Meteo Weather Service
 * Completely standalone: queries Open-Meteo REST API directly from the browser.
 * Coordinates are used strictly for querying weather conditions, NOT as ML model features.
 */

const WMO_CODE_MAP = {
  0: ['Clear', 'sky is clear'],
  1: ['Clouds', 'few clouds'],
  2: ['Clouds', 'scattered clouds'],
  3: ['Clouds', 'overcast clouds'],
  45: ['Fog', 'fog'],
  48: ['Fog', 'depositing rime fog'],
  51: ['Drizzle', 'light intensity drizzle'],
  53: ['Drizzle', 'moderate drizzle'],
  55: ['Drizzle', 'heavy intensity drizzle'],
  56: ['Drizzle', 'light freezing drizzle'],
  57: ['Drizzle', 'dense freezing drizzle'],
  61: ['Rain', 'light rain'],
  63: ['Rain', 'moderate rain'],
  65: ['Rain', 'heavy intensity rain'],
  66: ['Rain', 'light freezing rain'],
  67: ['Rain', 'heavy freezing rain'],
  71: ['Snow', 'light snow'],
  73: ['Snow', 'moderate snow'],
  75: ['Snow', 'heavy snow'],
  77: ['Snow', 'snow grains'],
  80: ['Rain', 'light intensity shower rain'],
  81: ['Rain', 'proximity shower rain'],
  82: ['Rain', 'very heavy shower rain'],
  85: ['Snow', 'light shower snow'],
  86: ['Snow', 'heavy shower snow'],
  95: ['Thunderstorm', 'thunderstorm'],
  96: ['Thunderstorm', 'thunderstorm with slight hail'],
  99: ['Thunderstorm', 'thunderstorm with heavy hail'],
};

export const CORRIDOR_PRESETS = [
  {
    id: 'i94-msp',
    corridor_name: 'I-94 METRO CORRIDOR',
    city_name: 'Minneapolis ↔ St. Paul, MN',
    highway: 'Interstate 94',
    latitude: 44.9778,
    longitude: -93.2650,
    is_primary_ml: true,
    capacity: 7500,
    waypoints: [
      { name: 'I-35W Interchange', x: 310, y: 130, ratio: 1.0 },
      { name: 'Snelling Ave (Midway)', x: 440, y: 124, ratio: 0.76 },
      { name: 'Lexington Pkwy', x: 570, y: 126, ratio: 0.63 },
    ],
  },
  {
    id: 'i90-chi',
    corridor_name: 'I-90 / I-94 KENNEDY EXPY',
    city_name: 'Chicago, IL',
    highway: 'Kennedy Expressway',
    latitude: 41.8781,
    longitude: -87.6298,
    is_primary_ml: false,
    capacity: 7800,
    waypoints: [
      { name: 'Ohio St Feeder', x: 310, y: 130, ratio: 1.0 },
      { name: 'Fullerton Ave', x: 440, y: 124, ratio: 0.82 },
      { name: 'Montrose Ave', x: 570, y: 126, ratio: 0.68 },
    ],
  },
  {
    id: 'i405-lax',
    corridor_name: 'I-405 SAN DIEGO FREEWAY',
    city_name: 'Los Angeles, CA',
    highway: 'San Diego Fwy',
    latitude: 34.0522,
    longitude: -118.2437,
    is_primary_ml: false,
    capacity: 8200,
    waypoints: [
      { name: 'Sepulveda Pass', x: 310, y: 130, ratio: 1.0 },
      { name: 'Wilshire Blvd', x: 440, y: 124, ratio: 0.88 },
      { name: 'LAX / Century Blvd', x: 570, y: 126, ratio: 0.74 },
    ],
  },
  {
    id: 'i95-nyc',
    corridor_name: 'I-95 CROSS BRONX EXPY',
    city_name: 'New York, NY',
    highway: 'Cross Bronx Expy',
    latitude: 40.7128,
    longitude: -74.0060,
    is_primary_ml: false,
    capacity: 8000,
    waypoints: [
      { name: 'GW Bridge Approach', x: 310, y: 130, ratio: 1.0 },
      { name: 'Major Deegan Split', x: 440, y: 124, ratio: 0.85 },
      { name: 'Bruckner Interchange', x: 570, y: 126, ratio: 0.72 },
    ],
  },
  {
    id: 'i85-atl',
    corridor_name: 'I-85 / I-75 DOWNTOWN CONNECTOR',
    city_name: 'Atlanta, GA',
    highway: 'Downtown Connector',
    latitude: 33.7490,
    longitude: -84.3880,
    is_primary_ml: false,
    capacity: 7600,
    waypoints: [
      { name: 'Freedom Pkwy / Grady Curve', x: 310, y: 130, ratio: 1.0 },
      { name: 'North Ave (Ga Tech)', x: 440, y: 124, ratio: 0.81 },
      { name: '10th / 14th St Split', x: 570, y: 126, ratio: 0.69 },
    ],
  },
  {
    id: 'i5-sea',
    corridor_name: 'I-5 CENTRAL FREEWAY',
    city_name: 'Seattle, WA',
    highway: 'Interstate 5',
    latitude: 47.6062,
    longitude: -122.3321,
    is_primary_ml: false,
    capacity: 7400,
    waypoints: [
      { name: 'Ship Canal Bridge', x: 310, y: 130, ratio: 1.0 },
      { name: 'Mercer St (SLU)', x: 440, y: 124, ratio: 0.86 },
      { name: 'I-90 Interchange', x: 570, y: 126, ratio: 0.75 },
    ],
  },
  {
    id: 'm25-lon',
    corridor_name: 'M25 ORBITAL MOTORWAY',
    city_name: 'London, United Kingdom',
    highway: 'M25 Motorway',
    latitude: 51.5074,
    longitude: -0.1278,
    is_primary_ml: false,
    capacity: 7900,
    waypoints: [
      { name: 'Heathrow Jct 14-15', x: 310, y: 130, ratio: 1.0 },
      { name: 'M40 Interchange Jct 16', x: 440, y: 124, ratio: 0.79 },
      { name: 'Dartford Crossing', x: 570, y: 126, ratio: 0.70 },
    ],
  },
];

export function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let msg = 'Failed to retrieve location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission denied by user.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            msg = 'Location request timed out.';
            break;
          default:
            msg = error.message;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000, // 5 min cache
      }
    );
  });
}

/**
 * Direct client-side weather query to Open-Meteo (No API key required)
 */
export async function fetchLiveWeatherClient(lat = 44.9778, lon = -93.2650, fallbackName = '') {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,snowfall,cloud_cover,weather_code&timezone=auto`;
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) {
      throw new Error(`Open-Meteo request failed (${resp.status})`);
    }
    const data = await resp.json();
    const current = data.current || {};

    const temp_celsius = Math.round(Number(current.temperature_2m ?? 15) * 10) / 10;
    const rain_1h = Math.max(0, Number(current.rain ?? current.precipitation ?? 0));
    const snow_1h = Math.max(0, Number(current.snowfall ?? 0));
    const clouds_all = Math.min(100, Math.max(0, Math.round(Number(current.cloud_cover ?? 20))));
    const code = Number(current.weather_code ?? 0);

    const [weather_main, weather_description] = WMO_CODE_MAP[code] || ['Clear', 'sky is clear'];

    // Reverse geocode locality if fallbackName not provided
    let location_name = fallbackName || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    if (!fallbackName) {
      try {
        const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
        const geoResp = await fetch(geoUrl);
        if (geoResp.ok) {
          const geoData = await geoResp.json();
          const city = geoData.city || geoData.locality || geoData.principalSubdivision;
          const country = geoData.countryCode || geoData.countryName;
          if (city) {
            location_name = country ? `${city}, ${country}` : city;
          }
        }
      } catch {
        // Fallback to coordinates
      }
    }

    return {
      location_name,
      temp_celsius,
      temp_kelvin: Math.round((temp_celsius + 273.15) * 10) / 10,
      rain_1h,
      snow_1h,
      clouds_all,
      weather_main,
      weather_description,
      is_live: true,
      timestamp: current.time || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('Direct Open-Meteo fetch failed, using defaults:', err);
    return {
      location_name: fallbackName || 'Minneapolis (I-94 Corridor)',
      temp_celsius: 15.0,
      temp_kelvin: 288.15,
      rain_1h: 0.0,
      snow_1h: 0.0,
      clouds_all: 20,
      weather_main: 'Clear',
      weather_description: 'sky is clear',
      is_live: false,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Free geocoding search using Open-Meteo Geocoding API
 */
export async function searchLocations(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.results) return [];
    return data.results.map((item) => ({
      name: item.name,
      admin1: item.admin1 || '',
      country: item.country || '',
      latitude: item.latitude,
      longitude: item.longitude,
      display_name: [item.name, item.admin1, item.country].filter(Boolean).join(', '),
    }));
  } catch (err) {
    console.warn('Geocoding search failed:', err);
    return [];
  }
}
