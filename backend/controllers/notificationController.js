import Notification from '../models/Notification.js';

const NOTIFICATION_TYPES = {
  schedule_change: { icon: '📅', label: 'Thay đổi lịch', color: '#60a5fa' },
  leave_approved: { icon: '✅', label: 'Nghỉ phép được duyệt', color: '#10b981' },
  leave_rejected: { icon: '❌', label: 'Nghỉ phép bị từ chối', color: '#ef4444' },
  leave_pending: { icon: '⏳', label: 'Yêu cầu nghỉ phép', color: '#f59e0b' },
  task_assigned: { icon: '📋', label: 'Nhiệm vụ mới', color: '#8b5cf6' },
  task_updated: { icon: '✏️', label: 'Nhiệm vụ cập nhật', color: '#3b82f6' },
  task_completed: { icon: '🎉', label: 'Nhiệm vụ hoàn thành', color: '#10b981' },
  payroll_calculated: { icon: '💵', label: 'Lương đã tính', color: '#10b981' },
  payroll_approved: { icon: '✅', label: 'Lương đã duyệt', color: '#10b981' },
  payroll_paid: { icon: '💰', label: 'Lương đã thanh toán', color: '#10b981' },
  shift_swap_request: { icon: '🔄', label: 'Yêu cầu đổi ca', color: '#f59e0b' },
  shift_swap_approved: { icon: '✅', label: 'Đổi ca được duyệt', color: '#10b981' },
  shift_swap_rejected: { icon: '❌', label: 'Đổi ca bị từ chối', color: '#ef4444' },
  system: { icon: '⚙️', label: 'Thông báo hệ thống', color: '#6b7280' },
  general: { icon: '📢', label: 'Thông báo', color: '#3b82f6' }
};

export const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const query = { recipientId: req.user.id };
    if (unreadOnly === 'true') query.read = false;

    const skip = (Number(page) - 1) * Number(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipientId: req.user.id, read: false })
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.user.id,
      read: false
    });
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: req.user.id },
      { read: true, readAt: new Date(), readBy: req.user.id },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo.' });
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipientId: req.user.id, read: false },
      { read: true, readAt: new Date(), readBy: req.user.id }
    );
    res.json({ success: true, data: { modified: result.modifiedCount } });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndDelete({ _id: id, recipientId: req.user.id });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo.' });
    }
    res.json({ success: true, message: 'Đã xóa thông báo.' });
  } catch (error) {
    next(error);
  }
};

export const clearAllNotifications = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({ recipientId: req.user.id });
    res.json({ success: true, data: { deleted: result.deletedCount } });
  } catch (error) {
    next(error);
  }
};

export const getNotificationTypes = async (req, res, next) => {
  res.json({ success: true, data: NOTIFICATION_TYPES });
};

export const sendNotification = async (req, res, next) => {
  try {
    const { recipientId, recipientName, type, title, message, data, priority, actionUrl } = req.body;
    if (!recipientId || !recipientName || !type || !title || !message) {
      return res.status(400).json({ success: false, message: 'Thông tin không đầy đủ.' });
    }
    const notification = await Notification.send({
      recipientId, recipientName, type, title, message, data, priority, actionUrl
    });
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

export const sendBulkNotifications = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền.' });
    }
    const { notifications } = req.body;
    if (!Array.isArray(notifications)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ.' });
    }
    const results = await Notification.sendBulk(notifications);
    res.status(201).json({ success: true, data: results, count: results.length });
  } catch (error) {
    next(error);
  }
};
