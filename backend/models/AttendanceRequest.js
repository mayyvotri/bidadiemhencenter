import mongoose from 'mongoose';

const attendanceRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  type: {
    type: String,
    enum: ['checkin', 'checkout'],
    required: true
  },

  photoUrl: {
    type: String,
    required: true
  },

  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },

  requestTime: {
    type: Date,
    default: Date.now
  },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  reviewedAt: {
    type: Date
  },

  rejectionReason: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
attendanceRequestSchema.index({ employee: 1, status: 1 });
attendanceRequestSchema.index({ status: 1, requestTime: -1 });

export default mongoose.model('AttendanceRequest', attendanceRequestSchema);
