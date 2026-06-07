import express from 'express';
import { getSalarySummary, getSalaryHistory } from '../controllers/salaryController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth); // Protect all salary actions

router.get('/summary', getSalarySummary);
router.get('/history', getSalaryHistory);

export default router;
