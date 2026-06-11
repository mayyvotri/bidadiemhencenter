import express from 'express';
import {
  checkIn,
  checkOut,
  getLogs,
  getActiveSession,
  getAllAttendance,
  updateAttendance,
  getStatistics,
  getEmployeeStatistics,
  getTodayStatus,
  getMyAttendanceHistory
} from '../controllers/attendanceController.js';
import { requireAuth, requireManager } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth); // All attendance routes are protected

// Employee routes
router.get('/active', getActiveSession);
router.get('/today-status', getTodayStatus);
router.get('/my-history', getMyAttendanceHistory);
router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.get('/logs', getLogs);
router.get('/statistics', getStatistics);

// Manager/Admin routes
router.get('/all', requireManager, getAllAttendance);
router.get('/employee-statistics', requireManager, getEmployeeStatistics);
router.put('/:id', requireManager, updateAttendance);

export default router;
