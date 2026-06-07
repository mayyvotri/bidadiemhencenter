import express from 'express';
import { checkIn, checkOut, getLogs } from '../controllers/attendanceController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth); // All attendance routes are protected

router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.get('/logs', getLogs);

export default router;
