import express from 'express';
import {
  getCoverageStatistics,
  getWeeklyCoverage,
  getMonthlyCoverage,
  getUnderstaffedShifts
} from '../controllers/staffingCoverageController.js';
import { requireAuth, requireManager } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth); // All staffing coverage routes are protected

// Manager/Admin routes
router.get('/statistics', requireManager, getCoverageStatistics);
router.get('/weekly', requireManager, getWeeklyCoverage);
router.get('/monthly', requireManager, getMonthlyCoverage);
router.get('/understaffed', requireManager, getUnderstaffedShifts);

export default router;
