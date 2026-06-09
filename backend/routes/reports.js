import express from 'express';
import {
  getReportTypes,
  generateReport,
  getReportData,
  exportReport,
  getReportHistory,
  deleteReport,
  getDashboardData
} from '../controllers/reportController.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/types', getReportTypes);
router.get('/history', getReportHistory);
router.get('/dashboard', getDashboardData);
router.get('/:id', getReportData);
router.post('/generate', generateReport);
router.patch('/:id/export/:format', exportReport);
router.delete('/:id', deleteReport);

export default router;
