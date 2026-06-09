import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array', 'json'],
    default: 'string'
  },
  group: {
    type: String,
    enum: ['ATTENDANCE', 'PAYROLL', 'SCHEDULE', 'GPS', 'FACE', 'NOTIFICATION', 'SYSTEM', 'BUSINESS'],
    default: 'SYSTEM'
  },
  label: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  options: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  min: { type: Number, default: null },
  max: { type: Number, default: null },
  isPublic: {
    type: Boolean,
    default: false
  },
  updatedBy: { type: String, default: null },
  updatedByName: { type: String, default: null }
}, { timestamps: true });

systemConfigSchema.index({ key: 1 }, { unique: true });
systemConfigSchema.index({ group: 1 });

systemConfigSchema.statics.getConfig = async function (key, defaultValue = null) {
  const doc = await this.findOne({ key });
  return doc ? doc.value : defaultValue;
};

systemConfigSchema.statics.setConfig = async function (key, value, meta = {}) {
  const doc = await this.findOneAndUpdate(
    { key },
    { $set: { value, ...meta } },
    { upsert: true, new: true, runValidators: true }
  );
  return doc;
};

systemConfigSchema.statics.getGroup = async function (group) {
  return this.find({ group }).sort({ key: 1 });
};

systemConfigSchema.statics.getAllPublic = async function () {
  const docs = await this.find({ isPublic: true });
  const obj = {};
  docs.forEach(d => { obj[d.key] = d.value; });
  return obj;
};

systemConfigSchema.statics.initializeDefaults = async function () {
  const defaults = [
    // Attendance
    { key: 'ATTENDANCE_CHECKIN_START', value: '06:00', type: 'string', group: 'ATTENDANCE', label: 'Giờ bắt đầu check-in', description: 'Thời gian sớm nhất nhân viên được phép check-in', isPublic: true },
    { key: 'ATTENDANCE_CHECKIN_END', value: '09:00', type: 'string', group: 'ATTENDANCE', label: 'Giờ kết thúc check-in', description: 'Sau giờ này được coi là đi muộn', isPublic: true },
    { key: 'ATTENDANCE_CHECKOUT_END', value: '22:00', type: 'string', group: 'ATTENDANCE', label: 'Giờ kết thúc ca làm', description: 'Giờ chuẩn kết thúc ca làm việc', isPublic: true },
    { key: 'ATTENDANCE_LATE_THRESHOLD_MINUTES', value: 0, type: 'number', group: 'ATTENDANCE', label: 'Ngưỡng muộn (phút)', description: 'Số phút cho phép sau giờ check-in kết thúc', min: 0, max: 60, isPublic: true },
    { key: 'ATTENDANCE_AUTO_ABSENT', value: false, type: 'boolean', group: 'ATTENDANCE', label: 'Tự động đánh vắng', description: 'Tự động tạo bản ghi absent cho nhân viên không check-in', isPublic: false },
    { key: 'ATTENDANCE_WORK_DAYS', value: [1, 2, 3, 4, 5], type: 'array', group: 'ATTENDANCE', label: 'Ngày làm việc', description: 'Các ngày trong tuần được coi là ngày làm việc (0=CN, 1=T2...)', options: [{ value: 0, label: 'Chủ nhật' }, { value: 1, label: 'Thứ 2' }, { value: 2, label: 'Thứ 3' }, { value: 3, label: 'Thứ 4' }, { value: 4, label: 'Thứ 5' }, { value: 5, label: 'Thứ 6' }, { value: 6, label: 'Thứ 7' }], isPublic: true },

    // Payroll
    { key: 'PAYROLL_OVERTIME_RATE', value: 1.5, type: 'number', group: 'PAYROLL', label: 'Hệ số tăng ca', description: 'Hệ số lương khi tăng ca', min: 1, max: 3, isPublic: false },
    { key: 'PAYROLL_NIGHTSHIFT_RATE', value: 1.3, type: 'number', group: 'PAYROLL', label: 'Hệ số ca đêm', description: 'Hệ số lương ca đêm', min: 1, max: 3, isPublic: false },
    { key: 'PAYROLL_WEEKEND_RATE', value: 1.5, type: 'number', group: 'PAYROLL', label: 'Hệ số cuối tuần', description: 'Hệ số lương ngày cuối tuần', min: 1, max: 3, isPublic: false },
    { key: 'PAYROLL_HOLIDAY_RATE', value: 2.0, type: 'number', group: 'PAYROLL', label: 'Hệ số ngày lễ', description: 'Hệ số lương ngày lễ', min: 1, max: 4, isPublic: false },
    { key: 'PAYROLL_MONTHLY_SALARY_CYCLE', value: 26, type: 'number', group: 'PAYROLL', label: 'Ngày công/tháng', description: 'Số ngày làm việc chuẩn trong tháng', min: 20, max: 31, isPublic: false },
    { key: 'PAYROLL_PAYMENT_DAY', value: 5, type: 'number', group: 'PAYROLL', label: 'Ngày thanh toán lương', description: 'Ngày trong tháng thanh toán lương', min: 1, max: 28, isPublic: false },

    // Schedule
    { key: 'SCHEDULE_DEFAULT_MIN_HOURS', value: 20, type: 'number', group: 'SCHEDULE', label: 'Giờ tối thiểu/tuần', description: 'Số giờ tối thiểu mỗi nhân viên cần làm', min: 0, max: 40, isPublic: false },
    { key: 'SCHEDULE_DEFAULT_MAX_HOURS', value: 48, type: 'number', group: 'SCHEDULE', label: 'Giờ tối đa/tuần', description: 'Số giờ tối đa mỗi nhân viên được phép làm', min: 40, max: 72, isPublic: false },
    { key: 'SCHEDULE_MAX_CONSECUTIVE_DAYS', value: 6, type: 'number', group: 'SCHEDULE', label: 'Ngày liên tiếp tối đa', description: 'Số ngày làm việc liên tiếp tối đa', min: 4, max: 7, isPublic: false },

    // GPS
    { key: 'GPS_DEFAULT_RADIUS', value: 100, type: 'number', group: 'GPS', label: 'Bán kính GPS mặc định (m)', description: 'Khoảng cách tối đa cho phép check-in', min: 10, max: 1000, isPublic: false },
    { key: 'GPS_ENABLED', value: true, type: 'boolean', group: 'GPS', label: 'Bật xác minh GPS', description: 'Yêu cầu xác minh vị trí khi chấm công', isPublic: false },
    { key: 'GPS_ALLOW_OFFSITE', value: false, type: 'boolean', group: 'GPS', label: 'Cho phép check-in ngoài site', description: 'Cho phép check-in khi không ở trong bán kính cho phép', isPublic: false },

    // Face
    { key: 'FACE_ENABLED', value: true, type: 'boolean', group: 'FACE', label: 'Bật nhận diện khuôn mặt', description: 'Yêu cầu xác minh khuôn mặt khi chấm công', isPublic: false },
    { key: 'FACE_MIN_CONFIDENCE', value: 0.7, type: 'number', group: 'FACE', label: 'Ngưỡng tin cậy khuôn mặt', description: 'Ngưỡng tối thiểu để xác nhận khuôn mặt', min: 0.5, max: 1, isPublic: false },

    // Notification
    { key: 'NOTIFY_LEAVE_AUTO_APPROVE', value: false, type: 'boolean', group: 'NOTIFICATION', label: 'Tự động duyệt nghỉ phép', description: 'Tự động duyệt nghỉ phép sau X ngày', isPublic: false },
    { key: 'NOTIFY_SHIFT_REMINDER_HOURS', value: 24, type: 'number', group: 'NOTIFICATION', label: 'Nhắc lịch trước (giờ)', description: 'Số giờ trước ca làm để gửi nhắc', min: 1, max: 72, isPublic: false },

    // Business
    { key: 'BUSINESS_NAME', value: 'BIDA Center', type: 'string', group: 'BUSINESS', label: 'Tên doanh nghiệp', description: 'Tên hiển thị trên hệ thống', isPublic: true },
    { key: 'BUSINESS_WORK_START', value: '06:00', type: 'string', group: 'BUSINESS', label: 'Giờ mở cửa', description: 'Giờ bắt đầu làm việc', isPublic: true },
    { key: 'BUSINESS_WORK_END', value: '22:00', type: 'string', group: 'BUSINESS', label: 'Giờ đóng cửa', description: 'Giờ kết thúc làm việc', isPublic: true },

    // System
    { key: 'SYSTEM_SESSION_TIMEOUT', value: 480, type: 'number', group: 'SYSTEM', label: 'Timeout phiên (phút)', description: 'Thời gian tự động đăng xuất (phút)', min: 30, max: 1440, isPublic: false },
    { key: 'SYSTEM_MAX_LOGIN_ATTEMPTS', value: 5, type: 'number', group: 'SYSTEM', label: 'Số lần đăng nhập tối đa', description: 'Khóa tài khoản sau khi đăng nhập sai', min: 3, max: 10, isPublic: false },
    { key: 'SYSTEM_BACKUP_ENABLED', value: false, type: 'boolean', group: 'SYSTEM', label: 'Tự động backup', description: 'Tự động sao lưu dữ liệu hàng ngày', isPublic: false }
  ];

  for (const d of defaults) {
    await this.findOneAndUpdate({ key: d.key }, { $setOnInsert: d }, { upsert: true, new: true });
  }
};

export default mongoose.model('SystemConfig', systemConfigSchema);
