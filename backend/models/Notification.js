import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: String,
    required: true,
    index: true
  },
  recipientName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'schedule_change',
      'leave_approved',
      'leave_rejected',
      'leave_pending',
      'task_assigned',
      'task_updated',
      'task_submitted',
      'task_completed',
      'payroll_calculated',
      'payroll_approved',
      'payroll_paid',
      'shift_swap_request',
      'shift_swap_approved',
      'shift_swap_rejected',
      'system',
      'general'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  readBy: {
    type: String,
    default: null
  },
  actionUrl: {
    type: String,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

notificationSchema.index({ recipientId: 1, read: 1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 });

notificationSchema.statics.send = async function ({ recipientId, recipientName, type, title, message, data = {}, priority = 'normal', actionUrl = null }) {
  return this.create({
    recipientId,
    recipientName,
    type,
    title,
    message,
    data,
    priority,
    actionUrl
  });
};

notificationSchema.statics.sendBulk = async function (notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) return [];
  return this.insertMany(notifications.map(n => ({
    ...n,
    createdAt: new Date()
  })));
};

notificationSchema.statics.sendToAdmins = async function ({ type, title, message, data = {}, priority = 'normal' }) {
  const User = mongoose.model('User');
  const admins = await User.find({ role: { $in: ['manager', 'admin'] }, isActive: true }).select('_id name');
  const notifications = admins.map(admin => ({
    recipientId: admin._id.toString(),
    recipientName: admin.name,
    type,
    title,
    message,
    data,
    priority
  }));
  if (notifications.length > 0) {
    return this.insertMany(notifications);
  }
  return [];
};

export default mongoose.model('Notification', notificationSchema);
