import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Đồ uống', 'Dụng cụ', 'Vệ sinh']
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  unit: {
    type: String,
    required: true
  },
  minStock: {
    type: Number,
    required: true,
    default: 10
  },
  status: {
    type: String,
    enum: ['ok', 'low', 'out'],
    default: 'ok'
  },
  price: {
    type: Number,
    default: 0
  },
  supplier: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.model('Inventory', inventorySchema);
