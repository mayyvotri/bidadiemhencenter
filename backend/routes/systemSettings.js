import express from 'express';
import { getSettings, updateSettings } from '../controllers/systemSettingsController.js';
import { requireAuth, requireManager } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth); // All settings routes are protected

// All authenticated users can view settings
router.get('/', getSettings);

// Only managers can update settings
router.put('/', requireManager, updateSettings);

export default router;
