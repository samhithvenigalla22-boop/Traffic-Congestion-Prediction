const rawApiUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001').trim();
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '').replace(/\/health\/?$/, '');

export function getAuthHeaders() {
  const token = localStorage.getItem('traffic_jwt_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    if (typeof data.detail === 'string') {
      errorMsg = data.detail;
    } else if (Array.isArray(data.detail)) {
      errorMsg = data.detail
        .map((d) => (typeof d === 'string' ? d : d?.msg || d?.message || JSON.stringify(d)))
        .join(', ');
    } else if (data.message) {
      errorMsg = data.message;
    } else {
      errorMsg = `Request failed with status ${response.status}`;
    }
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  health: () => apiRequest('/health'),
  signup: (userData) => apiRequest('/auth/signup', { method: 'POST', body: JSON.stringify(userData) }),
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getProfile: () => apiRequest('/auth/me'),
  predict: (predictionData) => apiRequest('/predict', { method: 'POST', body: JSON.stringify(predictionData) }),
  getHistory: () => apiRequest('/history'),
  clearHistory: () => apiRequest('/history', { method: 'DELETE' }),
};
