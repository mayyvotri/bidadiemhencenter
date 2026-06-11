import express from 'express';
import multer from 'multer';
import {
  createRequest,
  getMyRequests,
  getAllRequests,
  approveRequest,
  rejectRequest
} from '../controllers/attendanceRequestController.js';
import { requireAuth, requireManager } from '../middlewares/authMiddleware.js';

// Use memory storage — buffer will be uploaded to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(file.originalname.toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, webp)'));
  }
});

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Employee: create attendance request (supports multipart with photo file)
router.post('/', upload.single('photo'), createRequest);

// Employee: view own requests
router.get('/my', getMyRequests);

// Manager: view all requests
router.get('/', requireManager, getAllRequests);

// Manager: approve request
router.patch('/:id/approve', requireManager, approveRequest);

// Manager: reject request
router.patch('/:id/reject', requireManager, rejectRequest);

export default router;
