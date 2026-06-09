import express from 'express';
import {
  getPendingApprovals,
  approveAccount,
  rejectAccount,
  getAllApprovals
} from '../controllers/approvalController.js';
import { requireAuth, requireManager } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication and manager role
router.use(requireAuth);
router.use(requireManager);

router.get('/pending', getPendingApprovals);
router.get('/', getAllApprovals);
router.patch('/:id/approve', approveAccount);
router.patch('/:id/reject', rejectAccount);

export default router;
