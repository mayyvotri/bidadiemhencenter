import express from 'express';
import {
  createEmployee,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  forcePasswordChange,
  lockUser,
  unlockUser
} from '../controllers/userController.js';
import { requireAuth, requireAdmin, requireManager } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Manager and Admin routes
router.get('/', requireManager, getAllUsers);
router.get('/:id', requireManager, getUserById);

// Admin only routes
router.post('/', requireAdmin, createEmployee);
router.put('/:id', requireAdmin, updateUser);
router.delete('/:id', requireAdmin, deleteUser);
router.patch('/:id/activate', requireAdmin, activateUser);
router.patch('/:id/deactivate', requireAdmin, deactivateUser);
router.patch('/:id/force-password-change', requireAdmin, forcePasswordChange);
router.patch('/:id/lock', requireAdmin, lockUser);
router.patch('/:id/unlock', requireAdmin, unlockUser);

export default router;
