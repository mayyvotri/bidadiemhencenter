import express from 'express';
import {
  getShifts,
  getSwapRequests,
  requestSwap,
  approveSwap,
  rejectSwap,
  cancelSwap
} from '../controllers/scheduleController.js';
import {
  getGeneratorSettings,
  updateGeneratorSettings,
  generateSchedule,
  getGeneratedSchedule,
  updateSlot,
  batchUpdateSlots,
  publishSchedule,
  archiveSchedule,
  getScheduleHistory,
  getAvailabilityAnalysis
} from '../controllers/scheduleGeneratorController.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Existing schedule endpoints
router.get('/', getShifts);
router.get('/swaps', getSwapRequests);
router.post('/swap', requestSwap);
router.patch('/swaps/:id/approve', requireAdmin, approveSwap);
router.patch('/swaps/:id/reject', requireAdmin, rejectSwap);
router.patch('/swaps/:id/cancel', cancelSwap);

// AI Schedule Generator
router.get('/generator/settings', requireAdmin, getGeneratorSettings);
router.put('/generator/settings', requireAdmin, updateGeneratorSettings);
router.get('/generator/availability', requireAdmin, getAvailabilityAnalysis);
router.get('/generator/schedule', getGeneratedSchedule);
router.post('/generator/generate', requireAdmin, generateSchedule);
router.patch('/generator/:id/slot', requireAdmin, updateSlot);
router.patch('/generator/:id/slots/batch', requireAdmin, batchUpdateSlots);
router.patch('/generator/:id/publish', requireAdmin, publishSchedule);
router.patch('/generator/:id/archive', requireAdmin, archiveSchedule);
router.get('/generator/history', requireAdmin, getScheduleHistory);

export default router;
