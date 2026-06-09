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
  logout: () => api.post('/auth/logout'),
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
  getAllFaceProfiles: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/face-recognition/all-profiles${qs ? `?${qs}` : ''}`);
  },
  toggleFaceProfile: (id) => api.patch(`/face-recognition/${id}/toggle`),
  deleteFaceProfileAdmin: (id) => api.delete(`/face-recognition/${id}`),
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

// Payroll API
export const payrollApi = {
  getWageConfigs: () => api.get('/salary/wage-configs'),
  getWageConfig: (staffId) => api.get(`/salary/wage-configs/${staffId}`),
  setWageConfig: (data) => api.post('/salary/wage-configs', data),
  bulkSetWages: (wages) => api.post('/salary/wage-configs/bulk', { wages }),
  calculatePayroll: (month, year) => api.post(`/salary/calculate/${month}/${year}`),
  getPayroll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/salary${queryString ? `?${queryString}` : ''}`);
  },
  getPayrollByStaff: (staffId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/salary/by-staff/${staffId}${queryString ? `?${queryString}` : ''}`);
  },
  getPayrollDetail: (id) => api.get(`/salary/detail/${id}`),
  adjustPayroll: (id, data) => api.patch(`/salary/${id}/adjust`, data),
  removeAdjustment: (id, adjId) => api.delete(`/salary/${id}/adjustments/${adjId}`),
  updatePayrollStatus: (id, status) => api.patch(`/salary/${id}/status`, { status }),
  getPayrollReport: (month, year) => api.get(`/salary/report?month=${month}&year=${year}`),
  getPayrollStats: () => api.get('/salary/stats'),
  getSalarySummary: () => api.get('/salary/summary'),
  getSalaryHistory: () => api.get('/salary/history'),
};

// Notification API
export const notificationApi = {
  getNotifications: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/notifications${queryString ? `?${queryString}` : ''}`);
  },
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications'),
  sendNotification: (data) => api.post('/notifications/send', data),
  sendBulkNotifications: (notifications) => api.post('/notifications/send-bulk', { notifications }),
};

// Schedule Generator API
export const scheduleGeneratorApi = {
  getSettings: () => api.get('/schedule/generator/settings'),
  updateSettings: (data) => api.put('/schedule/generator/settings', data),
  getAvailability: (weekOffset) => api.get(`/schedule/generator/availability?weekOffset=${weekOffset}`),
  getSchedule: (weekOffset) => api.get(`/schedule/generator/schedule?weekOffset=${weekOffset}`),
  generate: (data) => api.post('/schedule/generator/generate', data),
  updateSlot: (id, data) => api.patch(`/schedule/generator/${id}/slot`, data),
  batchUpdateSlots: (id, changes) => api.patch(`/schedule/generator/${id}/slots/batch`, changes),
  publish: (id) => api.patch(`/schedule/generator/${id}/publish`),
  archive: (id) => api.patch(`/schedule/generator/${id}/archive`),
  getHistory: (status) => api.get(`/schedule/generator/history${status ? `?status=${status}` : ''}`),
};

// Reports & Analytics API
export const reportApi = {
  getTypes: () => api.get('/reports/types'),
  getDashboard: () => api.get('/reports/dashboard'),
  generate: (data) => api.post('/reports/generate', data),
  getHistory: (params) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/reports/history${qs ? `?${qs}` : ''}`);
  },
  getData: (id) => api.get(`/reports/${id}`),
  exportReport: (id, format) => api.patch(`/reports/${id}/export/${format}`),
  delete: (id) => api.delete(`/reports/${id}`),
};

// System / Admin API
export const systemApi = {
  // Dashboard
  getDashboard: () => api.get('/system/dashboard'),
  // Audit logs
  getAuditLogs: (params) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/system/audit${qs ? `?${qs}` : ''}`);
  },
  getAuditStats: () => api.get('/system/audit/stats'),
  exportAuditLogs: (params) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/system/audit/export${qs ? `?${qs}` : ''}`);
  },
  // System config
  getAllConfigs: (group) => api.get(`/system/config${group ? `?group=${group}` : ''}`),
  getConfig: (key) => api.get(`/system/config/${key}`),
  updateConfig: (key, value) => api.patch(`/system/config/${key}`, { value }),
  updateConfigsBatch: (updates) => api.post('/system/config/batch', { updates }),
  initializeConfigs: () => api.post('/system/config/initialize'),
  // System settings
  getSettings: () => api.get('/system/settings'),
  updateSettings: (data) => api.patch('/system/settings', data),
  // User management
  getUsers: (params) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/system/users${qs ? `?${qs}` : ''}`);
  },
  updateUserRole: (id, data) => api.patch(`/system/users/${id}/role`, data),
  resetUserPassword: (id, data) => api.patch(`/system/users/${id}/password`, data),
  toggleUserStatus: (id) => api.patch(`/system/users/${id}/toggle`),
  deleteUser: (id) => api.delete(`/system/users/${id}`),
};
