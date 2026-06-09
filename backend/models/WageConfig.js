import mongoose from 'mongoose';

const wageConfigSchema = new mongoose.Schema({
  staffId: {
    type: String,
    required: true,
    unique: true
  },
  staffName: {
    type: String,
    required: true
  },
  dept: {
    type: String,
    required: true
  },
  baseWage: {
    type: Number,
    required: true,
    min: 0
  },
  overtimeRate: {
    type: Number,
    default: 1.5
  },
  nightShiftRate: {
    type: Number,
    default: 1.3
  },
  weekendRate: {
    type: Number,
    default: 1.5
  },
  holidayRate: {
    type: Number,
    default: 2.0
  },
  allowances: {
    type: Number,
    default: 0
  },
  effectiveFrom: {
    type: Date,
    default: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  },
  effectiveTo: {
    type: Date,
    default: null
  },
  updatedBy: {
    type: String,
    default: null
  },
  updatedByName: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

wageConfigSchema.index({ staffId: 1 });
wageConfigSchema.index({ dept: 1 });

export default mongoose.model('WageConfig', wageConfigSchema);
