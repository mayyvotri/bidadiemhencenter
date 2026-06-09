import express from 'express';
import { login, register, logout, refreshToken, changePassword, forgotPassword, resetPassword, getStatus } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/logout', requireAuth, logout);
router.post('/refresh-token', refreshToken);
router.post('/change-password', requireAuth, changePassword);
router.get('/status', requireAuth, getStatus);

export default router;
