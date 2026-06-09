import mongoose from 'mongoose';

const shiftSwapSchema = new mongoose.Schema({
  requesterId: {
    type: String,
    required: true
  },
  requesterName: {
    type: String,
    required: true
  },
  requesterShiftId: {
    type: String,
    required: true
  },
  requesterShiftName: {
    type: String,
    required: true
  },
  requesterShiftTime: {
    type: String,
    required: true
  },
  requesterShiftDay: {
    type: String,
    required: true
  },
  targetStaffId: {
    type: String,
    required: true
  },
  targetStaffName: {
    type: String,
    required: true
  },
  targetShiftId: {
    type: String,
    default: null
  },
  targetShiftName: {
    type: String,
    default: null
  },
  targetShiftTime: {
    type: String,
    default: null
  },
  targetShiftDay: {
    type: String,
    default: null
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  approvedBy: {
    type: String,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  processedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

shiftSwapSchema.index({ status: 1, createdAt: -1 });
shiftSwapSchema.index({ targetStaffId: 1, status: 1 });
shiftSwapSchema.index({ requesterId: 1, status: 1 });

export default mongoose.model('ShiftSwap', shiftSwapSchema);
