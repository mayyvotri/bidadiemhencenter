import mongoose from 'mongoose';

const leaveBalanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  annual: {
    type: Number,
    default: 12
  },
  sick: {
    type: Number,
    default: 10
  },
  personal: {
    type: Number,
    default: 3
  },
  maternity: {
    type: Number,
    default: 90
  },
  paternity: {
    type: Number,
    default: 14
  },
  unpaid: {
    type: Number,
    default: 0
  },
  year: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
leaveBalanceSchema.index({ user: 1, year: 1 }, { unique: true });

export default mongoose.model('LeaveBalance', leaveBalanceSchema);
