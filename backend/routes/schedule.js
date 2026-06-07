import express from 'express';
import { getShifts, requestSwap } from '../controllers/scheduleController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth); // Protect all scheduling actions

router.get('/', getShifts);
router.post('/swap', requestSwap);

export default router;
