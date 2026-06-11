const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

function getHeaders() {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Something went wrong');
  return data;
}

export const attendanceRequestApi = {
  create: async (type, photoDataUrl, location) => {
    const res = await fetch(photoDataUrl);
    const blob = await res.blob();
    const formData = new FormData();
    formData.append('type', type);
    formData.append('photo', blob, `attendance_${type}_${Date.now()}.jpg`);
    if (location) {
      formData.append('location', typeof location === 'string' ? location : JSON.stringify(location));
    }

    const response = await fetch(`${BASE_URL}/attendance-requests`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  getMyRequests: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${BASE_URL}/attendance-requests/my${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
    }).then(handleResponse);
  },

  getAllRequests: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${BASE_URL}/attendance-requests${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
    }).then(handleResponse);
  },

  approve: (id) =>
    fetch(`${BASE_URL}/attendance-requests/${id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
    }).then(handleResponse),

  reject: (id, reason) =>
    fetch(`${BASE_URL}/attendance-requests/${id}/reject`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getHeaders() },
      body: JSON.stringify({ reason }),
    }).then(handleResponse),
};
