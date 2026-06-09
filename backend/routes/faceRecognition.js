import express from 'express';
import {
  registerFace,
  verifyFace,
  getFaceProfile,
  deleteFaceProfile,
  getVerificationLogs,
  getAllFaceProfiles,
  toggleFaceProfile,
  deleteFaceProfileAdmin
} from '../controllers/faceRecognitionController.js';
import {
  checkInWithFace,
  checkOutWithFace
} from '../controllers/attendanceController.js';
import { requireAuth, requireManager } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Employee routes
router.post('/register', registerFace);
router.post('/verify', verifyFace);
router.get('/profile', getFaceProfile);
router.delete('/profile', deleteFaceProfile);

// Face-based attendance
router.post('/checkin-face', checkInWithFace);
router.post('/checkout-face', checkOutWithFace);

// Manager / Admin routes
router.get('/all-profiles', requireManager, getAllFaceProfiles);
router.patch('/:id/toggle', requireManager, toggleFaceProfile);
router.delete('/:id', requireManager, deleteFaceProfileAdmin);
router.get('/verification-logs', requireManager, getVerificationLogs);

export default router;
