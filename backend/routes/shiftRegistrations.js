import express from 'express';
import {
  getMyRegistrations,
  getAllRegistrations,
  createRegistration,
  cancelRegistration,
  approveRegistration,
  rejectRegistration,
  getRegistrationStatistics
} from '../controllers/shiftRegistrationController.js';
import { requireAuth, requireManager } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth); // All shift registration routes are protected

// Employee routes
router.get('/my', getMyRegistrations);
router.post('/', createRegistration);
router.delete('/:id', cancelRegistration);

// Manager/Admin routes
router.get('/', requireManager, getAllRegistrations);
router.patch('/:id/approve', requireManager, approveRegistration);
router.patch('/:id/reject', requireManager, rejectRegistration);
router.get('/statistics', requireManager, getRegistrationStatistics);

export default router;
