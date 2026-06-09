import express from 'express';
import {
  getWageConfigs,
  getWageConfig,
  setWageConfig,
  bulkSetWages,
  calculatePayroll,
  getPayroll,
  getPayrollByStaff,
  getPayrollDetail,
  adjustPayroll,
  removeAdjustment,
  updatePayrollStatus,
  getPayrollReport,
  getPayrollStats,
  getSalarySummary,
  getSalaryHistory
} from '../controllers/salaryController.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// ── Wage Config ──────────────────────────────────────────────────────────────
router.get('/wage-configs', requireAdmin, getWageConfigs);
router.get('/wage-configs/:staffId', requireAdmin, getWageConfig);
router.post('/wage-configs', requireAdmin, setWageConfig);
router.post('/wage-configs/bulk', requireAdmin, bulkSetWages);

// ── Payroll Calculation ───────────────────────────────────────────────────────
router.post('/calculate/:month/:year', requireAdmin, calculatePayroll);

// ── Payroll CRUD ─────────────────────────────────────────────────────────────
router.get('/', getPayroll);
router.get('/by-staff/:staffId', getPayrollByStaff);
router.get('/detail/:id', getPayrollDetail);
router.get('/report', requireAdmin, getPayrollReport);
router.get('/stats', getPayrollStats);

// ── Salary Summary (legacy + personal) ─────────────────────────────────────
router.get('/summary', getSalarySummary);
router.get('/history', getSalaryHistory);

// ── Adjustments ─────────────────────────────────────────────────────────────
router.patch('/:id/adjust', requireAdmin, adjustPayroll);
router.delete('/:id/adjustments/:adjId', requireAdmin, removeAdjustment);

// ── Status ─────────────────────────────────────────────────────────────────
router.patch('/:id/status', requireAdmin, updatePayrollStatus);

export default router;
