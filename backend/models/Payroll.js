import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema({
  staffId: {
    type: String,
    required: true
  },
  staffName: {
    type: String,
    required: true
  },
  dept: {
    type: String,
    default: ''
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  baseWage: {
    type: Number,
    default: 0
  },
  totalHoursWorked: {
    type: Number,
    default: 0
  },
  regularHours: {
    type: Number,
    default: 0
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  nightShiftHours: {
    type: Number,
    default: 0
  },
  weekendHours: {
    type: Number,
    default: 0
  },
  holidayHours: {
    type: Number,
    default: 0
  },
  totalDaysWorked: {
    type: Number,
    default: 0
  },
  lateCount: {
    type: Number,
    default: 0
  },
  absentDays: {
    type: Number,
    default: 0
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
  baseSalary: {
    type: Number,
    default: 0
  },
  overtimePay: {
    type: Number,
    default: 0
  },
  nightShiftPay: {
    type: Number,
    default: 0
  },
  weekendPay: {
    type: Number,
    default: 0
  },
  holidayPay: {
    type: Number,
    default: 0
  },
  allowances: {
    type: Number,
    default: 0
  },
  grossSalary: {
    type: Number,
    default: 0
  },
  deductions: {
    type: Number,
    default: 0
  },
  adjustments: [
    {
      reason: { type: String, default: '' },
      amount: { type: Number, default: 0 },
      type: { type: String, enum: ['bonus', 'deduction'], default: 'bonus' },
      addedBy: { type: String, default: null },
      addedByName: { type: String, default: null },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  adjustmentTotal: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'calculated', 'approved', 'paid', 'cancelled'],
    default: 'draft'
  },
  calculatedBy: {
    type: String,
    default: null
  },
  calculatedAt: {
    type: Date,
    default: null
  },
  approvedBy: {
    type: String,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  attendanceDetails: [
    {
      date: { type: String, default: '' },
      checkIn: { type: String, default: '' },
      checkOut: { type: String, default: '' },
      hours: { type: Number, default: 0 },
      status: { type: String, default: '' }
    }
  ]
}, {
  timestamps: true
});

payrollSchema.index({ staffId: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ month: 1, year: 1 });
payrollSchema.index({ status: 1 });

payrollSchema.pre('save', async function () {
  const wagePerHour = this.baseWage / 176;
  this.overtimePay = Math.round(this.overtimeHours * wagePerHour * (this.overtimeRate - 1) * 100) / 100;
  this.nightShiftPay = Math.round(this.nightShiftHours * wagePerHour * (this.nightShiftRate - 1) * 100) / 100;
  this.weekendPay = Math.round(this.weekendHours * wagePerHour * (this.weekendRate - 1) * 100) / 100;
  this.holidayPay = Math.round(this.holidayHours * wagePerHour * (this.holidayRate - 1) * 100) / 100;

  this.baseSalary = Math.round(this.regularHours * wagePerHour * 100) / 100;
  this.grossSalary = Math.round((this.baseSalary + this.overtimePay + this.nightShiftPay + this.weekendPay + this.holidayPay + this.allowances) * 100) / 100;
  this.netSalary = Math.round((this.grossSalary + this.adjustmentTotal - this.deductions) * 100) / 100;
});

export default mongoose.model('Payroll', payrollSchema);
