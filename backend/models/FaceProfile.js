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
  isDeleted: {
    type: Boolean,
    default: false
  },
  captureCount: {
    type: Number,
    default: 0
  },
  descriptorCount: {
    type: Number,
    default: 0
  },
  captureAngle: {
    type: String,
    default: 'frontal'
  },
  qualityScore: {
    type: Number,
    default: null
  },
  replacedAt: {
    type: Date,
    default: null
  },
  replacedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FaceProfile',
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

faceProfileSchema.index({ user: 1 }, { unique: true });
faceProfileSchema.index({ isActive: 1, isDeleted: 1 });
faceProfileSchema.index({ registeredAt: -1 });

export default mongoose.model('FaceProfile', faceProfileSchema);
