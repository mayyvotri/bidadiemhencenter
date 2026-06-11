import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://thienphu579_db_user:Q9fPmjoH2LNZYVLH@autorent.lqjrq5z.mongodb.net/bidadiemhen';

const shiftAssignmentSchema = new mongoose.Schema({}, { strict: false });
const ShiftAssignment = mongoose.model('ShiftAssignment', shiftAssignmentSchema);

async function check() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Get all ShiftAssignments, populate shift
  const assignments = await ShiftAssignment.find({}).sort({ date: -1 }).limit(20);
  console.log(`\nTotal ShiftAssignments: ${assignments.length}`);
  assignments.forEach(a => {
    console.log(`_id: ${a._id}`);
    console.log(`  user: ${a.user}`);
    console.log(`  shift: ${a.shift}`);
    console.log(`  date: ${a.date} -> ISO: ${a.date?.toISOString()}`);
    console.log(`  assignedBy: ${a.assignedBy}`);
    console.log('---');
  });

  // Get unique user IDs
  const userIds = [...new Set(assignments.map(a => String(a.user)))];
  console.log('\nUnique user IDs:', userIds);

  // Check if any shifts exist
  const shiftSchema = new mongoose.Schema({}, { strict: false });
  const Shift = mongoose.model('Shift', shiftSchema);
  const shifts = await Shift.find({}).limit(10);
  console.log('\nShifts:', shifts.length);
  shifts.forEach(s => {
    console.log(`  _id: ${s._id}, name: ${s.name}, startTime: ${s.startTime}, endTime: ${s.endTime}`);
  });

  await mongoose.disconnect();
  process.exit(0);
}

check().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
