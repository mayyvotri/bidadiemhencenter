import mongoose from 'mongoose';

const gpsVerificationLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verificationType: {
    type: String,
    enum: ['checkin', 'checkout'],
    required: true
  },
  success: {
    type: Boolean,
    required: true
  },
  employeeLocation: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    accuracy: {
      type: Number,
      default: null
    }
  },
  businessLocation: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  distance: {
    type: Number,
    required: true
  },
  allowedRadius: {
    type: Number,
    required: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
gpsVerificationLogSchema.index({ user: 1, createdAt: -1 });
gpsVerificationLogSchema.index({ verificationType: 1, createdAt: -1 });
gpsVerificationLogSchema.index({ success: 1, createdAt: -1 });

export default mongoose.model('GPSVerificationLog', gpsVerificationLogSchema);
