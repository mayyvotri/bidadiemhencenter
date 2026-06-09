const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

async function request(endpoint, options = {}) {
  const accessToken = localStorage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

export const getTaskId = (task) => task._id || task.id;

// Auth API
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, name, phone, role) => api.post('/auth/register', { email, password, name, phone, role }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
  changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
  getStatus: () => api.get('/auth/status'),
};

// User API
export const userApi = {
  createEmployee: (email, password, name, phone, role, position) => api.post('/users', { email, password, name, phone, role, position }),
  getAllUsers: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/users${queryString ? `?${queryString}` : ''}`);
  },
  getUserById: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  activateUser: (id) => api.patch(`/users/${id}/activate`),
  deactivateUser: (id) => api.patch(`/users/${id}/deactivate`),
  forcePasswordChange: (id) => api.patch(`/users/${id}/force-password-change`),
  lockUser: (id, reason) => api.patch(`/users/${id}/lock`, { reason }),
  unlockUser: (id) => api.patch(`/users/${id}/unlock`),
};

// Approval API
export const approvalApi = {
  getPendingApprovals: () => api.get('/approvals/pending'),
  getAllApprovals: (status) => api.get(`/approvals${status ? `?status=${status}` : ''}`),
  approveAccount: (id) => api.patch(`/approvals/${id}/approve`),
  rejectAccount: (id, reason) => api.patch(`/approvals/${id}/reject`, { reason }),
};

// Attendance API
export const attendanceApi = {
  checkIn: () => api.post('/attendance/checkin'),
  checkOut: () => api.post('/attendance/checkout'),
  getActiveSession: () => api.get('/attendance/active'),
  getLogs: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/attendance/logs${queryString ? `?${queryString}` : ''}`);
  },
  getStatistics: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/attendance/statistics${queryString ? `?${queryString}` : ''}`);
  },
  getAllAttendance: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/attendance/all${queryString ? `?${queryString}` : ''}`);
  },
  updateAttendance: (id, data) => api.put(`/attendance/${id}`, data),
  getEmployeeStatistics: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/attendance/employee-statistics${queryString ? `?${queryString}` : ''}`);
  },
  checkInWithFace: (data) => api.post('/attendance/checkin-face', data),
  checkOutWithFace: (data) => api.post('/attendance/checkout-face', data),
};

// Face Recognition API
export const faceRecognitionApi = {
  registerFace: (faceDescriptors) => api.post('/face-recognition/register', { faceDescriptors }),
  verifyFace: (faceDescriptor, verificationType) => api.post('/face-recognition/verify', { faceDescriptor, verificationType }),
  getFaceProfile: () => api.get('/face-recognition/profile'),
  deleteFaceProfile: () => api.delete('/face-recognition/profile'),
  getVerificationLogs: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/face-recognition/verification-logs${queryString ? `?${queryString}` : ''}`);
  },
  getAllFaceProfiles: () => api.get('/face-recognition/all-profiles'),
  toggleFaceProfile: (id) => api.patch(`/face-recognition/${id}/toggle`),
};

// System Settings API
export const systemSettingsApi = {
  getSettings: () => api.get('/system-settings'),
  updateSettings: (data) => api.put('/system-settings', data),
};

// GPS Verification API
export const gpsVerificationApi = {
  getLogs: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/gps-verification/logs${queryString ? `?${queryString}` : ''}`);
  },
  getStatistics: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/gps-verification/statistics${queryString ? `?${queryString}` : ''}`);
  },
};

// Shift API
export const shiftApi = {
  getAllShifts: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/shifts${queryString ? `?${queryString}` : ''}`);
  },
  getShiftById: (id) => api.get(`/shifts/${id}`),
  createShift: (data) => api.post('/shifts', data),
  updateShift: (id, data) => api.put(`/shifts/${id}`, data),
  deleteShift: (id) => api.delete(`/shifts/${id}`),
  getShiftEmployees: (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/shifts/${id}/employees${queryString ? `?${queryString}` : ''}`);
  },
};

// Shift Registration API
export const shiftRegistrationApi = {
  getMyRegistrations: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/shift-registrations/my${queryString ? `?${queryString}` : ''}`);
  },
  getAllRegistrations: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/shift-registrations${queryString ? `?${queryString}` : ''}`);
  },
  createRegistration: (data) => api.post('/shift-registrations', data),
  cancelRegistration: (id) => api.delete(`/shift-registrations/${id}`),
  approveRegistration: (id) => api.patch(`/shift-registrations/${id}/approve`),
  rejectRegistration: (id, reason) => api.patch(`/shift-registrations/${id}/reject`, { reason }),
  getStatistics: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/shift-registrations/statistics${queryString ? `?${queryString}` : ''}`);
  },
};

// Shift Assignment API
export const shiftAssignmentApi = {
  createAssignment: (data) => api.post('/shift-assignments', data),
  getAllAssignments: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/shift-assignments${queryString ? `?${queryString}` : ''}`);
  },
  getAssignmentById: (id) => api.get(`/shift-assignments/${id}`),
  updateAssignment: (id, data) => api.put(`/shift-assignments/${id}`, data),
  deleteAssignment: (id) => api.delete(`/shift-assignments/${id}`),
  getMyAssignments: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/shift-assignments/my${queryString ? `?${queryString}` : ''}`);
  },
  getAssignmentsByDateRange: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/shift-assignments/date-range${queryString ? `?${queryString}` : ''}`);
  },
};

// Staffing Coverage API
export const staffingCoverageApi = {
  getStatistics: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/staffing-coverage/statistics${queryString ? `?${queryString}` : ''}`);
  },
  getWeeklyCoverage: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/staffing-coverage/weekly${queryString ? `?${queryString}` : ''}`);
  },
  getMonthlyCoverage: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/staffing-coverage/monthly${queryString ? `?${queryString}` : ''}`);
  },
  getUnderstaffedShifts: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/staffing-coverage/understaffed${queryString ? `?${queryString}` : ''}`);
  },
};

// Leave Request API
export const leaveRequestApi = {
  createLeaveRequest: (data) => api.post('/leave-requests', data),
  getMyLeaveRequests: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/leave-requests/my${queryString ? `?${queryString}` : ''}`);
  },
  getAllLeaveRequests: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/leave-requests${queryString ? `?${queryString}` : ''}`);
  },
  getLeaveRequestById: (id) => api.get(`/leave-requests/${id}`),
  approveLeaveRequest: (id) => api.patch(`/leave-requests/${id}/approve`),
  rejectLeaveRequest: (id, reason) => api.patch(`/leave-requests/${id}/reject`, { reason }),
  cancelLeaveRequest: (id) => api.delete(`/leave-requests/${id}`),
  getStatistics: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/leave-requests/statistics${queryString ? `?${queryString}` : ''}`);
  },
};

// Leave Balance API
export const leaveBalanceApi = {
  getMyLeaveBalance: () => api.get('/leave-balances/my'),
  getAllLeaveBalances: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/leave-balances${queryString ? `?${queryString}` : ''}`);
  },
  getLeaveBalanceByUserId: (userId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/leave-balances/${userId}${queryString ? `?${queryString}` : ''}`);
  },
  updateLeaveBalance: (userId, data) => api.put(`/leave-balances/${userId}`, data),
  initializeLeaveBalances: (data) => api.post('/leave-balances/initialize', data),
};
