// Script để check và clean dữ liệu ShiftAssignment bị lỗi ngày
import mongoose from 'mongoose';
import 'dotenv/config';

const ShiftAssignment = mongoose.model('ShiftAssignment', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
  date: Date,
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String
}, { timestamps: true }));

async function checkData() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/staff_management');

  const assignments = await ShiftAssignment.find({}).populate('user', 'name').populate('shift', 'name');
  
  console.log('Total assignments:', assignments.length);
  console.log('\nSample assignments:');
  
  assignments.slice(0, 10).forEach(a => {
    const isoDate = a.date.toISOString();
    const localDate = a.date.toLocaleDateString('vi-VN');
    console.log(`- User: ${a.user?.name}, Shift: ${a.shift?.name}, ISO: ${isoDate}, Local: ${localDate}`);
  });

  // Xóa tất cả assignments để test (uncomment nếu cần)
  // console.log('\nDeleting all assignments...');
  // await ShiftAssignment.deleteMany({});
  // console.log('Deleted all assignments');

  await mongoose.disconnect();
}

checkData().catch(console.error);
