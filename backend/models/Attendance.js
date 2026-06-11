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
  shift: {
    type: String,
    default: ''
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
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

// Index for efficient queries (no unique index on user+date to allow multiple check-in/out per day)
attendanceSchema.index({ user: 1, date: 1 }); // Removed unique: true
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ user: 1, date: -1 });
attendanceSchema.index({ user: 1, checkIn: -1 }); // For finding latest record

// Calculate working hours before saving (only if not already set)
attendanceSchema.pre('save', function() {
  if (this.checkIn && this.checkOut) {
    const diff = new Date(this.checkOut).getTime() - new Date(this.checkIn).getTime();
    // Only calculate if workingHours is 0/undefined, otherwise trust explicitly set value
    if (!this.workingHours) {
      this.workingHours = Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
    }
  }
});

export default mongoose.model('Attendance', attendanceSchema);
