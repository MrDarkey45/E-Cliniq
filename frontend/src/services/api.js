const API_URL = 'http://localhost:3001/api';

const getToken = () => localStorage.getItem('token');

const getHeaders = () => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const apiRequest = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  const data = await response.json();

  if (!response.ok) {
    // Only reload on 401 when a session token already exists (expired session).
    // During a fresh login attempt there is no stored token, so we must NOT reload —
    // that would wipe the error state before the Login component can render it.
    if (response.status === 401 && getToken()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }

    if (response.status === 409) {
      const err = new Error(data.error || 'Conflict');
      err.conflictData = data;
      throw err;
    }

    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data;
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => apiRequest('/auth/me'),
};

// ── Appointments ──────────────────────────────────────────────────────────────
export const appointmentsAPI = {
  getAll: () => apiRequest('/appointments'),
  getForPatient: (identifier) => apiRequest(`/appointments/patient/${encodeURIComponent(identifier)}`),
  // Returns [{date, time}] of taken slots — no PII, safe for all roles
  getAvailability: (date) => apiRequest(`/appointments/availability${date ? `?date=${date}` : ''}`),
  create: (data) => apiRequest('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/appointments/${id}`, { method: 'DELETE' }),
};

// ── Inventory ─────────────────────────────────────────────────────────────────
export const inventoryAPI = {
  getAll: () => apiRequest('/inventory'),
  create: (data) => apiRequest('/inventory', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/inventory/${id}`, { method: 'DELETE' }),
};

// ── Patients ──────────────────────────────────────────────────────────────────
export const patientsAPI = {
  getAll: () => apiRequest('/patients'),
  search: (q) => apiRequest(`/patients/search?q=${encodeURIComponent(q)}`),
  getById: (id) => apiRequest(`/patients/${id}`),
  getMe: () => apiRequest('/patients/me'),
  create: (data) => apiRequest('/patients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getVisits: (id) => apiRequest(`/patients/${id}/visits`),
};

// ── Medical Records ───────────────────────────────────────────────────────────
export const medicalRecordsAPI = {
  getAll: () => apiRequest('/medical-records'),
  getById: (id) => apiRequest(`/medical-records/${id}`),
  search: (name) => apiRequest(`/medical-records/search/${encodeURIComponent(name)}`),
  create: (data) => apiRequest('/medical-records', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/medical-records/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/medical-records/${id}`, { method: 'DELETE' }),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsAPI = {
  getUnread: () => apiRequest('/notifications'),
  markAllRead: () => apiRequest('/notifications/read', { method: 'PUT' }),
};

export default {
  auth: authAPI,
  appointments: appointmentsAPI,
  inventory: inventoryAPI,
  patients: patientsAPI,
  medicalRecords: medicalRecordsAPI,
  notifications: notificationsAPI,
};
