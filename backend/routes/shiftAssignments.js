import express from 'express';
import {
  createAssignment,
  getAllAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getMyAssignments,
  getAssignmentsByDateRange
} from '../controllers/shiftAssignmentController.js';
import { requireAuth, requireManager } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth); // All shift assignment routes are protected

// Employee routes
router.get('/my', getMyAssignments);

// Manager/Admin routes
router.post('/', requireManager, createAssignment);
router.get('/', requireManager, getAllAssignments);
router.get('/date-range', requireManager, getAssignmentsByDateRange);
router.get('/:id', requireManager, getAssignmentById);
router.put('/:id', requireManager, updateAssignment);
router.delete('/:id', requireManager, deleteAssignment);

export default router;
