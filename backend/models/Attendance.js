import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    default: null
  },
  workingHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['on_time', 'late', 'early_leave', 'absent'],
    default: 'on_time'
  },
  notes: {
    type: String,
    default: ''
  },
  editedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  editedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ user: 1, date: -1 });

// Calculate working hours before saving
attendanceSchema.pre('save', function() {
  if (this.checkIn && this.checkOut) {
    const diff = new Date(this.checkOut).getTime() - new Date(this.checkIn).getTime();
    this.workingHours = Math.round((diff / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
  }
});

export default mongoose.model('Attendance', attendanceSchema);
