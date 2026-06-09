import express from 'express';
import { getGPSLogs, getGPSStatistics } from '../controllers/gpsVerificationController.js';
import { requireAuth, requireManager } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth); // All GPS verification routes are protected

// Manager/Admin routes
router.get('/logs', requireManager, getGPSLogs);
router.get('/statistics', requireManager, getGPSStatistics);

export default router;
