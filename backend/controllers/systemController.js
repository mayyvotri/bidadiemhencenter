import AuditLog from '../models/AuditLog.js';
import SystemConfig from '../models/SystemConfig.js';
import SystemSettings from '../models/SystemSettings.js';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import Attendance from '../models/Attendance.js';
import Payroll from '../models/Payroll.js';
import Task from '../models/Task.js';
import LeaveRequest from '../models/LeaveRequest.js';
import ScheduleGenerator from '../models/ScheduleGenerator.js';
import crypto from 'crypto';

const IP = (req) => req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
const UA = (req) => req.headers['user-agent'] || null;

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, category, action, severity, performedBy, dateFrom, dateTo, search } = req.query;

    const query = {};
    if (category) query.category = category;
    if (action) query.action = action;
    if (severity) query.severity = severity;
    if (performedBy) query.performedBy = performedBy;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { performedByName: { $regex: search, $options: 'i' } },
        { targetName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      AuditLog.countDocuments(query)
    ]);

    const categories = await AuditLog.distinct('category');
    const actions = await AuditLog.distinct('action');

    res.json({
      success: true,
      data: {
        logs,
        categories,
        actions,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditStats = async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const monthAgo = new Date(today.getTime() - 30 * 86400000);

    const [total, todayCount, weekCount, monthCount, byCategory, bySeverity, recentCritical] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: today } }),
      AuditLog.countDocuments({ createdAt: { $gte: weekAgo } }),
      AuditLog.countDocuments({ createdAt: { $gte: monthAgo } }),
      AuditLog.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      AuditLog.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
      AuditLog.find({ severity: { $in: ['HIGH', 'CRITICAL'] }, createdAt: { $gte: weekAgo } })
        .sort({ createdAt: -1 }).limit(5).select('action description severity category createdAt performedByName')
    ]);

    res.json({
      success: true,
      data: {
        total, todayCount, weekCount, monthCount,
        byCategory: byCategory.map(c => ({ category: c._id, count: c.count })),
        bySeverity: bySeverity.map(s => ({ severity: s._id, count: s.count })),
        recentCritical
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── System Config ───────────────────────────────────────────────────────────

export const getAllConfigs = async (req, res, next) => {
  try {
    const { group } = req.query;
    const query = group ? { group } : {};
    const configs = await SystemConfig.find(query).sort({ group: 1, key: 1 });
    const groups = await SystemConfig.distinct('group');
    res.json({ success: true, data: { configs, groups } });
  } catch (error) {
    next(error);
  }
};

export const getConfigByKey = async (req, res, next) => {
  try {
    const { key } = req.params;
    let config = await SystemConfig.findOne({ key });
    if (!config) {
      const defaults = await SystemConfig.getConfig(key, null);
      return res.json({ success: true, data: { key, value: defaults } });
    }
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};

export const updateConfig = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const meta = {
      updatedBy: req.user.id,
      updatedByName: req.user.name
    };

    const config = await SystemConfig.findOneAndUpdate(
      { key },
      { $set: { value, ...meta } },
      { new: true, runValidators: true }
    );

    if (!config) {
      return res.status(404).json({ success: false, message: 'Config key not found.' });
    }

    await AuditLog.logSettings({
      description: `Cập nhật config "${config.label}" (${key}): ${JSON.stringify(value)}`,
      performedBy: req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      metadata: { key, oldValue: config.value, newValue: value },
      severity: 'MEDIUM'
    });

    res.json({ success: true, data: config, message: 'Đã cập nhật cấu hình.' });
  } catch (error) {
    next(error);
  }
};

export const updateConfigsBatch = async (req, res, next) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: 'updates must be an array.' });
    }

    const results = [];
    for (const { key, value } of updates) {
      const config = await SystemConfig.findOneAndUpdate(
        { key },
        { $set: { value, updatedBy: req.user.id, updatedByName: req.user.name } },
        { new: true, runValidators: true }
      );
      if (config) results.push(config);
    }

    await AuditLog.logSettings({
      description: `Batch update ${results.length} configs`,
      performedBy: req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      metadata: { count: results.length, keys: results.map(r => r.key) },
      severity: 'MEDIUM'
    });

    res.json({ success: true, data: results, message: `Đã cập nhật ${results.length} cấu hình.` });
  } catch (error) {
    next(error);
  }
};

export const initializeConfigs = async (req, res, next) => {
  try {
    await SystemConfig.initializeDefaults();
    res.json({ success: true, message: 'Đã khởi tạo cấu hình mặc định.' });
  } catch (error) {
    next(error);
  }
};

// ─── System Settings (legacy / location) ──────────────────────────────────────

export const getSystemSettings = async (req, res, next) => {
  try {
    let settings = await SystemSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const updateSystemSettings = async (req, res, next) => {
  try {
    const settings = await SystemSettings.getSettings();
    const allowedFields = ['businessName', 'location', 'allowedRadius', 'gpsVerificationEnabled', 'faceVerificationEnabled'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    Object.assign(settings, updates);
    await settings.save();

    await AuditLog.logSettings({
      description: `Cập nhật system settings: ${Object.keys(updates).join(', ')}`,
      performedBy: req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      metadata: updates,
      severity: 'MEDIUM'
    });

    res.json({ success: true, data: settings, message: 'Đã cập nhật cài đặt hệ thống.' });
  } catch (error) {
    next(error);
  }
};

// ─── User Management ──────────────────────────────────────────────────────────

export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const query = {};
    if (role) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (status === 'pending') query.approvalStatus = 'pending';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort(sort).skip(skip).limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, position } = req.body;

    if (req.user.id === id) {
      return res.status(400).json({ success: false, message: 'Không thể thay đổi vai trò của chính mình.' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

    const oldRole = user.role;
    if (role) user.role = role;
    if (position) user.position = position;
    await user.save();

    await AuditLog.logUser({
      action: 'USER_ROLE_CHANGE',
      description: `Đổi vai trò user "${user.name}" từ "${oldRole}" thành "${role || oldRole}"`,
      performedBy: req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      targetType: 'User',
      targetId: id,
      targetName: user.name,
      status: 'SUCCESS',
      metadata: { oldRole, newRole: role || oldRole },
      severity: 'HIGH'
    });

    res.json({ success: true, data: user, message: 'Đã cập nhật vai trò.' });
  } catch (error) {
    next(error);
  }
};

export const resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

    const tempPassword = newPassword || crypto.randomBytes(6).toString('hex').toUpperCase();
    user.password = tempPassword;
    user.mustChangePassword = true;
    user.isLocked = false;
    await user.save();

    await AuditLog.logUser({
      action: 'USER_RESET_PASSWORD',
      description: `Reset mật khẩu cho user "${user.name}" (${user.email})`,
      performedBy: req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      targetType: 'User',
      targetId: id,
      targetName: user.name,
      status: 'SUCCESS',
      metadata: { tempPassword: newPassword ? 'admin_set' : 'auto_generated' },
      severity: 'HIGH'
    });

    res.json({
      success: true,
      data: { tempPassword: newPassword ? undefined : tempPassword },
      message: newPassword ? 'Đã đặt lại mật khẩu.' : `Mật khẩu tạm: ${tempPassword}`
    });
  } catch (error) {
    next(error);
  }
};

export const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ success: false, message: 'Không thể thay đổi trạng thái của chính mình.' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

    user.isActive = !user.isActive;
    await user.save();

    await AuditLog.logUser({
      action: 'USER_UPDATE',
      description: `${user.isActive ? 'Mở khóa' : 'Khóa'} tài khoản user "${user.name}"`,
      performedBy: req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      targetType: 'User',
      targetId: id,
      targetName: user.name,
      status: user.isActive ? 'SUCCESS' : 'WARNING',
      metadata: { isActive: user.isActive },
      severity: user.isActive ? 'LOW' : 'MEDIUM'
    });

    res.json({ success: true, data: user, message: user.isActive ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.' });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản của chính mình.' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });

    await AuditLog.logUser({
      action: 'USER_DELETE',
      description: `Xóa user "${user.name}" (${user.email})`,
      performedBy: req.user.id,
      performedByName: req.user.name,
      performedByRole: req.user.role,
      targetType: 'User',
      targetId: id,
      targetName: user.name,
      status: 'WARNING',
      metadata: { email: user.email, role: user.role },
      severity: 'HIGH'
    });

    await User.findByIdAndDelete(id);
    res.json({ success: true, message: 'Đã xóa người dùng.' });
  } catch (error) {
    next(error);
  }
};

// ─── System Dashboard ─────────────────────────────────────────────────────────

export const getSystemDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const monthAgo = new Date(today.getTime() - 30 * 86400000);

    const [
      totalUsers, activeUsers, pendingUsers,
      totalAttendance, attendanceToday, attendanceThisMonth,
      totalPayroll, payrollThisMonth,
      totalTasks, overdueTasks,
      totalLeaves, pendingLeaves,
      recentAuditLogs,
      recentLogins
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true, approvalStatus: 'approved' }),
      User.countDocuments({ approvalStatus: 'pending' }),
      Attendance.countDocuments(),
      Attendance.countDocuments({ date: { $gte: today } }),
      Attendance.countDocuments({ date: { $gte: monthAgo } }),
      Payroll.countDocuments(),
      Payroll.countDocuments({ year: now.getFullYear(), month: now.getMonth() + 1 }),
      Task.countDocuments(),
      Task.countDocuments({ deadlineDate: { $lt: now }, status: { $ne: 'completed' } }),
      LeaveRequest.countDocuments(),
      LeaveRequest.countDocuments({ status: 'pending' }),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).select('action description category severity createdAt performedByName'),
      AuditLog.find({ action: { $in: ['LOGIN', 'LOGIN_FAILED'] } }).sort({ createdAt: -1 }).limit(10).select('action description status createdAt performedByName ipAddress')
    ]);

    const auditStats = await AuditLog.aggregate([
      { $match: { createdAt: { $gte: weekAgo } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const roleBreakdown = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const recentActivity = await Promise.all([
      Attendance.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name').select('user date status'),
      Task.find().sort({ createdAt: -1 }).limit(5).select('title status assignedTo deadlineDate')
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers, activeUsers, pendingUsers,
          totalAttendance, attendanceToday, attendanceThisMonth,
          totalPayroll, payrollThisMonth,
          totalTasks, overdueTasks,
          totalLeaves, pendingLeaves
        },
        auditStats: auditStats.map(s => ({ category: s._id, count: s.count })),
        roleBreakdown: roleBreakdown.map(r => ({ role: r._id, count: r.count })),
        recentActivity: {
          attendance: recentActivity[0],
          tasks: recentActivity[1]
        },
        recentAuditLogs,
        recentLogins
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Backup (metadata only) ───────────────────────────────────────────────────

export const exportAuditLogs = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, category, limit = 1000 } = req.query;
    const query = {};
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }
    if (category) query.category = category;

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(parseInt(limit));
    const data = logs.map(l => ({
      'Thời gian': l.createdAt,
      'Hành động': l.action,
      'Danh mục': l.category,
      'Mô tả': l.description,
      'Người thực hiện': l.performedByName || 'System',
      'Vai trò': l.performedByRole || '',
      'Đối tượng': l.targetName || '',
      'Trạng thái': l.status,
      'Mức độ': l.severity,
      'IP': l.ipAddress || ''
    }));

    res.json({ success: true, data, message: `Xuất ${data.length} audit logs.` });
  } catch (error) {
    next(error);
  }
};
