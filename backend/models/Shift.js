import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  startTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  daysOfWeek: [{
    type: Number,
    min: 0,
    max: 6
  }],
  maxEmployees: {
    type: Number,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#3b82f6'
  }
}, {
  timestamps: true
});

// Index for efficient queries
shiftSchema.index({ isActive: 1 });
shiftSchema.index({ daysOfWeek: 1 });

export default mongoose.model('Shift', shiftSchema);
