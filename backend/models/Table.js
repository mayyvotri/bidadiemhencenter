import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ['VIP', 'STD']
  },
  status: {
    type: String,
    required: true,
    enum: ['Occupied', 'Ready', 'Maintenance'],
    default: 'Ready'
  },
  time: {
    type: String,
    default: null
  },
  staff: {
    type: String,
    default: null
  },
  customer: {
    type: String,
    default: null
  },
  bookingTime: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.model('Table', tableSchema);
