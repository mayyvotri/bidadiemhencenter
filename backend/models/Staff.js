import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  dept: {
    type: String,
    required: true,
    enum: ['Quản lý', 'Thu ngân', 'Phục vụ', 'Bảo vệ', 'Vệ sinh']
  },
  status: {
    type: String,
    required: true,
    enum: ['Đang làm', 'Nghỉ', 'Tạm nghỉ'],
    default: 'Đang làm'
  },
  joinDate: {
    type: String,
    required: true
  },
  rating: {
    type: String,
    default: '4.0'
  },
  hours: {
    type: String,
    default: '0h'
  },
  avatar: {
    type: String,
    default: ''
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model('Staff', staffSchema);
