import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
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
  deadline: {
    type: String,
    required: true
  },
  deadlineDate: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['urgent', 'high', 'medium', 'low'],
    default: 'medium'
  },
  assignedTo: {
    type: String,
    required: true
  },
  assignedToId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'completed', 'cancelled'],
    default: 'pending'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  customer: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    type: String,
    required: true
  },
  createdByName: {
    type: String,
    required: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  // Nhiệm vụ theo ca
  isShiftTask: {
    type: Boolean,
    default: false
  },
  dayKey: {
    type: String,
    enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', null],
    default: null
  },
  shiftName: {
    type: String,
    enum: ['Ca sáng', 'Ca tối', 'Ca khuya', null],
    default: null
  },
  assignmentDate: {
    type: Date,
    default: null
  },
  // Ảnh hoàn thành
  completionPhoto: {
    type: String,
    default: null
  },
  submittedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ status: 1, priority: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ deadlineDate: 1 });

taskSchema.pre('save', async function () {
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
    this.progress = 100;
  }
  if (this.deadlineDate && this.status !== 'completed' && this.deadlineDate < new Date()) {
    this._isOverdue = true;
  }
});

export default mongoose.model('Task', taskSchema);
