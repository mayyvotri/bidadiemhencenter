import express from 'express';
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  getLeaveRequestById,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  getLeaveStatistics
} from '../controllers/leaveRequestController.js';
import { requireAuth, requireManager } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth); // All leave request routes are protected

// Employee routes
router.post('/', createLeaveRequest);
router.get('/my', getMyLeaveRequests);
router.delete('/:id', cancelLeaveRequest);

// Manager/Admin routes
router.get('/', requireManager, getAllLeaveRequests);
router.get('/statistics', requireManager, getLeaveStatistics);
router.get('/:id', requireManager, getLeaveRequestById);
router.patch('/:id/approve', requireManager, approveLeaveRequest);
router.patch('/:id/reject', requireManager, rejectLeaveRequest);

export default router;
