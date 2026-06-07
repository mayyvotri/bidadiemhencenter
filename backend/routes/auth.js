import express from 'express';
import { login, getStatus } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public login route
router.post('/login', login);

// Protected token check route
router.get('/status', requireAuth, getStatus);

export default router;
