import mongoose from 'mongoose';

const shiftRegistrationSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
shiftRegistrationSchema.index({ user: 1, status: 1 });
shiftRegistrationSchema.index({ shift: 1, status: 1 });
shiftRegistrationSchema.index({ status: 1, createdAt: -1 });
shiftRegistrationSchema.index({ user: 1, shift: 1, startDate: 1 }, { unique: true });

export default mongoose.model('ShiftRegistration', shiftRegistrationSchema);
