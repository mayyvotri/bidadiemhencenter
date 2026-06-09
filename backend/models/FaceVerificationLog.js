import mongoose from 'mongoose';

const faceVerificationLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  faceProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FaceProfile',
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
  confidence: {
    type: Number,
    required: true
  },
  faceDescriptor: {
    type: [Number],
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
  },
  location: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
faceVerificationLogSchema.index({ user: 1, createdAt: -1 });
faceVerificationLogSchema.index({ verificationType: 1, createdAt: -1 });
faceVerificationLogSchema.index({ success: 1, createdAt: -1 });

export default mongoose.model('FaceVerificationLog', faceVerificationLogSchema);
