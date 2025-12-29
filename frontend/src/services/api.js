const API_URL = 'http://localhost:3001/api';

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Create headers with auth token
const getHeaders = () => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Generic API request handler
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      }

      // For conflict errors (409), include full response data
      if (response.status === 409) {
        const error = new Error(data.error || 'Conflict');
        error.conflictData = data;
        throw error;
      }

      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Authentication API
export const authAPI = {
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    apiRequest('/auth/logout', {
      method: 'POST',
    }),

  getCurrentUser: () => apiRequest('/auth/me'),
};

// Appointments API
export const appointmentsAPI = {
  getAll: () => apiRequest('/appointments'),

  getForPatient: (identifier) => apiRequest(`/appointments/patient/${identifier}`),

  create: (data) =>
    apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiRequest(`/appointments/${id}`, {
      method: 'DELETE',
    }),
};

// Inventory API
export const inventoryAPI = {
  getAll: () => apiRequest('/inventory'),

  create: (data) =>
    apiRequest('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiRequest(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiRequest(`/inventory/${id}`, {
      method: 'DELETE',
    }),
};

// Medical Records API
export const medicalRecordsAPI = {
  getAll: () => apiRequest('/medical-records'),

  getById: (id) => apiRequest(`/medical-records/${id}`),

  search: (name) => apiRequest(`/medical-records/search/${name}`),

  create: (data) =>
    apiRequest('/medical-records', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiRequest(`/medical-records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiRequest(`/medical-records/${id}`, {
      method: 'DELETE',
    }),
};

export default {
  auth: authAPI,
  appointments: appointmentsAPI,
  inventory: inventoryAPI,
  medicalRecords: medicalRecordsAPI,
};
