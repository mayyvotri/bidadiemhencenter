import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['attendance', 'payroll', 'performance', 'coverage', 'summary'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  period: {
    type: String,
    required: true
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  generatedBy: {
    type: String,
    required: true
  },
  generatedByName: {
    type: String,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['draft', 'generated', 'exported', 'archived'],
    default: 'generated'
  },
  format: {
    type: String,
    enum: ['pdf', 'excel', 'both', 'screen'],
    default: 'screen'
  },
  summary: {
    totalRecords: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    averageValue: { type: Number, default: 0 },
    topValue: { type: Number, default: 0 },
    bottomValue: { type: Number, default: 0 },
    customMetrics: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  filters: {
    dept: { type: String, default: '' },
    branch: { type: String, default: '' },
    status: { type: String, default: '' },
    staffId: { type: String, default: '' }
  },
  exportCount: {
    type: Number,
    default: 0
  },
  lastExportedAt: {
    type: Date,
    default: null
  },
  lastExportedBy: {
    type: String,
    default: null
  },
  lastExportedFormat: {
    type: String,
    default: null
  }
}, { timestamps: true });

reportSchema.index({ type: 1, periodStart: -1 });
reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ status: 1 });

reportSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.data;
  return obj;
};

export default mongoose.model('Report', reportSchema);
