import mongoose from 'mongoose';

const faceProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  faceDescriptors: [{
    type: [Number],
    required: true
  }],
  registeredAt: {
    type: Date,
    default: Date.now
  },
  lastUsedAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  captureCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
faceProfileSchema.index({ user: 1 });

export default mongoose.model('FaceProfile', faceProfileSchema);
