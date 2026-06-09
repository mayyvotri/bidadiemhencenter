import mongoose from 'mongoose';

const shiftSlotSchema = new mongoose.Schema({
  dayKey: { type: String, required: true },
  dayLabel: { type: String, required: true },
  date: { type: String, required: true },
  shiftName: { type: String, required: true },
  shiftTime: { type: String, required: true },
  role: { type: String, default: 'Phục vụ' },
  branch: { type: String, default: 'Chi nhánh 1 Nguyễn Oanh' },
  assignedStaffId: { type: String, default: null },
  assignedStaffName: { type: String, default: null },
  status: {
    type: String,
    enum: ['auto', 'manual', 'empty'],
    default: 'auto'
  },
  reason: { type: String, default: '' }
}, { _id: true });

const recommendationSchema = new mongoose.Schema({
  type: { type: String, enum: ['info', 'warning', 'conflict', 'suggestion'], required: true },
  priority: { type: Number, default: 0 },
  message: { type: String, required: true },
  affectedSlots: [{ type: String, default: '' }],
  suggestedFix: { type: String, default: '' }
});

const scheduleGeneratorSchema = new mongoose.Schema({
  weekStart: {
    type: Date,
    required: true
  },
  weekEnd: {
    type: Date,
    required: true
  },
  generatedBy: {
    type: String,
    default: null
  },
  generatedByName: {
    type: String,
    default: null
  },
  generatedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  slots: [shiftSlotSchema],
  recommendations: [recommendationSchema],
  config: {
    minHoursPerWeek: { type: Number, default: 20 },
    maxHoursPerWeek: { type: Number, default: 48 },
    maxConsecutiveDays: { type: Number, default: 6 },
    targetHoursPerEmployee: { type: Number, default: 40 },
    coverWeekends: { type: Boolean, default: true },
    preferWeekendRotation: { type: Boolean, default: true }
  },
  coverageStats: {
    totalSlots: { type: Number, default: 0 },
    filledSlots: { type: Number, default: 0 },
    emptySlots: { type: Number, default: 0 },
    coveragePercent: { type: Number, default: 0 }
  },
  employeeStats: [{
    staffId: { type: String, required: true },
    staffName: { type: String, required: true },
    dept: { type: String, default: '' },
    totalHours: { type: Number, default: 0 },
    daysWorked: { type: Number, default: 0 },
    weekendShifts: { type: Number, default: 0 },
    fairnessScore: { type: Number, default: 0 }
  }],
  publishedAt: {
    type: Date,
    default: null
  },
  publishedBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

scheduleGeneratorSchema.index({ weekStart: 1, weekEnd: 1 });
scheduleGeneratorSchema.index({ status: 1 });

export default mongoose.model('ScheduleGenerator', scheduleGeneratorSchema);
