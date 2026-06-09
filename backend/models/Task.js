import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  deadline: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  assignedTo: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'in_progress'],
    default: 'pending'
  },
  customer: {
    type: String,
    default: null
  },
  description: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.model('Task', taskSchema);
