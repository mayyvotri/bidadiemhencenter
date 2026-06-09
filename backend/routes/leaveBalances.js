import express from 'express';
import {
  getMyLeaveBalance,
  getAllLeaveBalances,
  getLeaveBalanceByUserId,
  updateLeaveBalance,
  initializeLeaveBalances
} from '../controllers/leaveBalanceController.js';
import { requireAuth, requireManager } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth); // All leave balance routes are protected

// Employee routes
router.get('/my', getMyLeaveBalance);

// Manager/Admin routes
router.get('/', requireManager, getAllLeaveBalances);
router.get('/:userId', requireManager, getLeaveBalanceByUserId);
router.put('/:userId', requireManager, updateLeaveBalance);
router.post('/initialize', requireManager, initializeLeaveBalances);

export default router;
