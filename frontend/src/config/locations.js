/**
 * Central Location Configuration
 * Easily add, modify, or remove locations from this single configuration file.
 * 
 * IMPORTANT ML PRINCIPLE:
 * The XGBoost model was trained using the Metro Interstate Traffic Volume dataset.
 * The model does NOT use geographic coordinates as direct ML features.
 * Locations provide spatial context, scenario naming, and coordinates for live weather retrieval.
 */

export const PRECONFIGURED_LOCATIONS = [
  {
    id: 'guntur',
    name: 'Guntur',
    displayName: 'Guntur, Andhra Pradesh',
    state: 'Andhra Pradesh',
    country: 'India',
    latitude: 16.3067,
    longitude: 80.4365,
    corridorName: 'Guntur Metro Corridor',
    routePoints: ['Guntur West Entrance', 'Core Traffic Zone', 'Autonagar Exit'],
  },
  {
    id: 'vijayawada',
    name: 'Vijayawada',
    displayName: 'Vijayawada, Andhra Pradesh',
    state: 'Andhra Pradesh',
    country: 'India',
    latitude: 16.5062,
    longitude: 80.6480,
    corridorName: 'Vijayawada Arterial Corridor',
    routePoints: ['Benz Circle Approach', 'Core Traffic Zone', 'Varadhi Junction'],
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    displayName: 'Hyderabad, Telangana',
    state: 'Telangana',
    country: 'India',
    latitude: 17.3850,
    longitude: 78.4867,
    corridorName: 'Hyderabad Outer Ring Corridor',
    routePoints: ['Gachibowli Inbound', 'Core Traffic Zone', 'Hitec City Exit'],
  },
  {
    id: 'visakhapatnam',
    name: 'Visakhapatnam',
    displayName: 'Visakhapatnam, Andhra Pradesh',
    state: 'Andhra Pradesh',
    country: 'India',
    latitude: 17.6868,
    longitude: 83.2185,
    corridorName: 'Vizag Coastal Arterial',
    routePoints: ['NAD Junction Approach', 'Core Traffic Zone', 'Maddilapalem Corridor'],
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    displayName: 'Bengaluru, Karnataka',
    state: 'Karnataka',
    country: 'India',
    latitude: 12.9716,
    longitude: 77.5946,
    corridorName: 'Bengaluru Peripheral Corridor',
    routePoints: ['Silk Board Junction', 'Core Traffic Zone', 'Electronic City Flyover'],
  },
  {
    id: 'chennai',
    name: 'Chennai',
    displayName: 'Chennai, Tamil Nadu',
    state: 'Tamil Nadu',
    country: 'India',
    latitude: 13.0827,
    longitude: 80.2707,
    corridorName: 'Chennai Anna Salai Arterial',
    routePoints: ['Guindy Hub', 'Core Traffic Zone', 'Mount Road Junction'],
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    displayName: 'Mumbai, Maharashtra',
    state: 'Maharashtra',
    country: 'India',
    latitude: 19.0760,
    longitude: 72.8777,
    corridorName: 'Mumbai Western Express Corridor',
    routePoints: ['Bandra Connector', 'Core Traffic Zone', 'Andheri Flyover'],
  },
  {
    id: 'delhi',
    name: 'Delhi',
    displayName: 'Delhi, National Capital Region',
    state: 'Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.2090,
    corridorName: 'Delhi Ring Road Corridor',
    routePoints: ['Dhaula Kuan Approach', 'Core Traffic Zone', 'AIIMS Flyover'],
  },
  {
    id: 'i94-minneapolis',
    name: 'Minneapolis (I-94)',
    displayName: 'Minneapolis ↔ St. Paul, MN (ML Training Baseline)',
    state: 'Minnesota',
    country: 'United States',
    latitude: 44.9778,
    longitude: -93.2650,
    corridorName: 'I-94 Interstate Corridor',
    routePoints: ['I-35W Interchange', 'Snelling Ave Midway', 'Lexington Pkwy'],
    isBenchmark: true,
  },
];

export const DEFAULT_LOCATION = PRECONFIGURED_LOCATIONS[0]; // Guntur

export function getLocationById(id) {
  return PRECONFIGURED_LOCATIONS.find((loc) => loc.id === id) || DEFAULT_LOCATION;
}

export function formatCoordinates(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return '';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}
