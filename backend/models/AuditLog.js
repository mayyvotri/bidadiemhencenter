import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_RESET_PASSWORD', 'USER_ROLE_CHANGE',
      'PASSWORD_CHANGE', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_COMPLETE',
      'ATTENDANCE_CHECKIN', 'ATTENDANCE_CHECKOUT', 'ATTENDANCE_EDIT',
      'LEAVE_REQUEST_CREATE', 'LEAVE_REQUEST_APPROVE', 'LEAVE_REQUEST_REJECT',
      'SCHEDULE_CREATE', 'SCHEDULE_UPDATE', 'SCHEDULE_PUBLISH', 'SCHEDULE_DELETE',
      'PAYROLL_CALCULATE', 'PAYROLL_APPROVE', 'PAYROLL_EXPORT',
      'TASK_CREATE', 'TASK_UPDATE', 'TASK_COMPLETE',
      'INVENTORY_CREATE', 'INVENTORY_UPDATE', 'INVENTORY_DELETE',
      'SETTINGS_UPDATE', 'SYSTEM_BACKUP', 'REPORT_GENERATE', 'REPORT_EXPORT',
      'SHIFT_CREATE', 'SHIFT_UPDATE', 'SHIFT_DELETE',
      'SHIFT_REGISTRATION_CREATE', 'SHIFT_REGISTRATION_APPROVE', 'SHIFT_REGISTRATION_REJECT',
      'SHIFT_SWAP_REQUEST', 'SHIFT_SWAP_APPROVE', 'SHIFT_SWAP_REJECT',
      'FACE_REGISTER', 'FACE_VERIFY', 'GPS_VERIFY',
      'SYSTEM_ERROR', 'SYSTEM_WARNING'
    ]
  },
  category: {
    type: String,
    enum: ['AUTH', 'USER', 'ATTENDANCE', 'LEAVE', 'SCHEDULE', 'PAYROLL', 'TASK', 'INVENTORY', 'SETTINGS', 'SYSTEM', 'REPORT', 'SHIFT', 'FACE', 'GPS'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  performedBy: {
    type: String,
    default: null
  },
  performedByName: {
    type: String,
    default: null
  },
  performedByRole: {
    type: String,
    default: null
  },
  targetType: {
    type: String,
    default: null
  },
  targetId: {
    type: String,
    default: null
  },
  targetName: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    default: null
  },
  endpoint: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'WARNING'],
    default: 'SUCCESS'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  severity: {
    type: String,
    enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'INFO'
  }
}, { timestamps: true });

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

auditLogSchema.statics.log = async function ({ action, category, description, performedBy, performedByName, performedByRole, targetType, targetId, targetName, ipAddress, userAgent, method, endpoint, status = 'SUCCESS', metadata = {}, severity = 'INFO' }) {
  return this.create({
    action, category, description,
    performedBy, performedByName, performedByRole,
    targetType, targetId, targetName,
    ipAddress, userAgent, method, endpoint,
    status, metadata, severity
  });
};

auditLogSchema.statics.logAuth = async function ({ action, description, performedBy, performedByName, ipAddress, userAgent, status, severity }) {
  return this.log({ action, category: 'AUTH', description, performedBy, performedByName, ipAddress, userAgent, status, severity });
};

auditLogSchema.statics.logUser = async function ({ action, description, performedBy, performedByName, performedByRole, targetType, targetId, targetName, status, metadata, severity }) {
  return this.log({ action, category: 'USER', description, performedBy, performedByName, performedByRole, targetType, targetId, targetName, status, metadata, severity });
};

auditLogSchema.statics.logSettings = async function ({ description, performedBy, performedByName, performedByRole, metadata, severity = 'MEDIUM' }) {
  return this.log({ action: 'SETTINGS_UPDATE', category: 'SETTINGS', description, performedBy, performedByName, performedByRole, metadata, severity });
};

export default mongoose.model('AuditLog', auditLogSchema);
