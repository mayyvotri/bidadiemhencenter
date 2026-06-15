import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Load environment variables
dotenv.config();

// Import route modules (we will create these files next)
import authRoutes from './routes/auth.js';
import attendanceRoutes from './routes/attendance.js';
import attendanceRequestRoutes from './routes/attendanceRequests.js';
import scheduleRoutes from './routes/schedule.js';
import salaryRoutes from './routes/salary.js';
import staffRoutes from './routes/staff.js';
import tablesRoutes from './routes/tables.js';
import tasksRoutes from './routes/tasks.js';
import taskPoolRoutes from './routes/taskPool.js';
import inventoryRoutes from './routes/inventory.js';
import userRoutes from './routes/users.js';
import approvalRoutes from './routes/approvals.js';
import notificationRoutes from './routes/notifications.js';
import reportRoutes from './routes/reports.js';
import systemRoutes from './routes/system.js';
import shiftAssignmentRoutes from './routes/shiftAssignments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Connect to MongoDB
connectDB();

// Enable CORS
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : ['*'];

app.use(cors({
  origin: allowedOrigins.length === 1 && allowedOrigins[0] === '*' ? '*' : allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Parse requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'task-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Request logging middleware
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/attendance-requests', attendanceRequestRoutes);
app.use('/api/v1/schedule', scheduleRoutes);
app.use('/api/v1/salary', salaryRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/tables', tablesRoutes);
app.use('/api/v1/tasks', tasksRoutes);
app.use('/api/v1/task-pool', taskPoolRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/approvals', approvalRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/shift-assignments', shiftAssignmentRoutes);

// Base / Health Check Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    message: 'Backend application is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

export default app;
