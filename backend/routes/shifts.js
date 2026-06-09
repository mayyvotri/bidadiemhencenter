import express from 'express';
import {
  getAllShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  getShiftEmployees
} from '../controllers/shiftController.js';
import { requireAuth, requireManager } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth); // All shift routes are protected

// All authenticated users can view shifts
router.get('/', getAllShifts);
router.get('/:id', getShiftById);

// Manager/Admin routes
router.post('/', requireManager, createShift);
router.put('/:id', requireManager, updateShift);
router.delete('/:id', requireManager, deleteShift);
router.get('/:id/employees', requireManager, getShiftEmployees);

export default router;
