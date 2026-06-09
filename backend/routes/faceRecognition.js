import express from 'express';
import {
  registerFace,
  verifyFace,
  getFaceProfile,
  deleteFaceProfile,
  getVerificationLogs,
  getAllFaceProfiles,
  toggleFaceProfile
} from '../controllers/faceRecognitionController.js';
import {
  checkInWithFace,
  checkOutWithFace
} from '../controllers/attendanceController.js';
import { requireAuth, requireManager } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth); // All face recognition routes are protected

// Employee routes
router.post('/register', registerFace);
router.post('/verify', verifyFace);
router.get('/profile', getFaceProfile);
router.delete('/profile', deleteFaceProfile);

// Face-based attendance routes
router.post('/checkin-face', checkInWithFace);
router.post('/checkout-face', checkOutWithFace);

// Manager/Admin routes
router.get('/verification-logs', requireManager, getVerificationLogs);
router.get('/all-profiles', requireManager, getAllFaceProfiles);
router.patch('/:id/toggle', requireManager, toggleFaceProfile);

export default router;
