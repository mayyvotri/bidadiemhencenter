import mongoose from 'mongoose';

const shiftAssignmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String,
    enum: ['daily', 'weekly', 'biweekly', 'monthly'],
    default: null
  },
  recurringEndDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
shiftAssignmentSchema.index({ user: 1, date: 1 });
shiftAssignmentSchema.index({ shift: 1, date: 1 });
shiftAssignmentSchema.index({ date: 1 });
shiftAssignmentSchema.index({ user: 1, shift: 1, date: 1 }, { unique: true });

// Prevent duplicate assignments
shiftAssignmentSchema.pre('save', async function(next) {
  const existing = await this.constructor.findOne({
    user: this.user,
    shift: this.shift,
    date: this.date,
    _id: { $ne: this._id }
  });

  if (existing) {
    next(new Error('Nhân viên đã được phân công ca làm việc này vào ngày này'));
  } else {
    next();
  }
});

export default mongoose.model('ShiftAssignment', shiftAssignmentSchema);
