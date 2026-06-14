import mongoose from 'mongoose';

const taskPoolSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Phục vụ', 'Thu ngân', 'Vệ sinh', 'Bảo dưỡng', 'Hành chính', 'Khác'],
    default: 'Khác'
  },
  priority: {
    type: String,
    enum: ['urgent', 'high', 'medium', 'low'],
    default: 'medium'
  },
  createdBy: {
    type: String,
    required: true
  },
  createdByName: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

taskPoolSchema.index({ isActive: 1 });
taskPoolSchema.index({ priority: 1 });

export default mongoose.model('TaskPool', taskPoolSchema);
