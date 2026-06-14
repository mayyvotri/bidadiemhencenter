import express from 'express';
import multer from 'multer';
import path from 'path';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

router.use(requireAuth);

// Configure multer - use memory storage for Cloudinary upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(file.originalname.toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, webp)'));
  }
});

// GET all tasks (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { status, priority, assignedTo, createdBy, overdue, isShiftTask, weekOffset } = req.query;
    let query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (createdBy) query.createdBy = createdBy;
    if (isShiftTask !== undefined) query.isShiftTask = isShiftTask === 'true';

    const tasks = await Task.find(query).sort({ priority: 1, deadlineDate: 1, createdAt: -1 });

    // Filter by week if weekOffset provided
    let filteredTasks = tasks;
    if (weekOffset !== undefined && isShiftTask === 'true') {
      const startOfWeek = getStartOfWeek(parseInt(weekOffset));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      filteredTasks = tasks.filter(t => {
        if (!t.assignmentDate) return false;
        return t.assignmentDate >= startOfWeek && t.assignmentDate < endOfWeek;
      });
    }

    const enriched = filteredTasks.map(task => {
      const obj = task.toObject();
      obj._isOverdue = task.deadlineDate && task.status !== 'completed' && task.deadlineDate < new Date();
      return obj;
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to get start of week
function getStartOfWeek(weekOffset = 0) {
  const date = new Date();
  const dayOfWeek = date.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayDate = new Date(date);
  mondayDate.setDate(date.getDate() + mondayOffset + weekOffset * 7);
  mondayDate.setHours(0, 0, 0, 0);
  return mondayDate;
}

// GET assigned tasks (shift tasks)
router.get('/assigned', async (req, res) => {
  try {
    const { weekOffset } = req.query;
    let query = { isShiftTask: true };

    let tasks = await Task.find(query).sort({ dayKey: 1, shiftName: 1, createdAt: -1 });

    // Filter by week if weekOffset provided
    if (weekOffset !== undefined) {
      const offset = parseInt(weekOffset);
      const startOfWeek = getStartOfWeek(offset);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      // Filter tasks based on deadlineDate falling within the week
      tasks = tasks.filter(t => {
        if (!t.deadlineDate) return false;
        const taskDate = new Date(t.deadlineDate);
        return taskDate >= startOfWeek && taskDate < endOfWeek;
      });
    }

    const enriched = tasks.map(task => {
      const obj = task.toObject();
      obj._isOverdue = task.deadlineDate && task.status !== 'completed' && new Date(task.deadlineDate) < new Date();
      return obj;
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to normalize names for comparison (remove extra spaces)
const normalizeName = (name) => name ? name.replace(/\s+/g, ' ').trim().toLowerCase() : '';

// GET my tasks (assigned to current user)
router.get('/my', async (req, res) => {
  try {
    // Convert user ID to string for comparison
    const userId = String(req.user.id).replace(/^new ObjectId\(['"](.+)['"]\)$/, '$1');
    const normalizedUserName = normalizeName(req.user.name);

    console.log('[tasks/my] req.user.id:', req.user.id, 'userId:', userId);
    console.log('[tasks/my] req.user.name:', req.user.name, 'normalized:', normalizedUserName);

    // Find all tasks first, then filter by normalized name
    const allTasks = await Task.find({}).lean();

    const myTasks = allTasks.filter(task => {
      // Check by assignedToId (string or ObjectId)
      const taskAssigneeIdStr = String(task.assignedToId || '');
      if (taskAssigneeIdStr === userId) return true;

      // Check by normalized name
      const taskAssigneeName = normalizeName(task.assignedTo);
      if (taskAssigneeName === normalizedUserName) return true;

      return false;
    });

    console.log('[tasks/my] found tasks count:', myTasks.length);

    const enriched = myTasks.map(task => {
      task._isOverdue = task.deadlineDate && task.status !== 'completed' && new Date(task.deadlineDate) < new Date();
      return task;
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET task statistics
router.get('/stats', async (req, res) => {
  try {
    const query = req.user.isAdmin ? {} : { assignedToId: req.user.id };

    const [total, pending, submitted, completed, highPriority, overdue] = await Promise.all([
      Task.countDocuments(query),
      Task.countDocuments({ ...query, status: 'pending' }),
      Task.countDocuments({ ...query, status: 'submitted' }),
      Task.countDocuments({ ...query, status: 'completed' }),
      Task.countDocuments({ ...query, priority: { $in: ['urgent', 'high'] }, status: { $ne: 'completed' } }),
      Task.countDocuments({
        ...query,
        status: { $ne: 'completed' },
        deadlineDate: { $lt: new Date() }
      })
    ]);

    res.json({
      success: true,
      stats: {
        total,
        pending,
        submitted,
        completed,
        highPriority,
        overdue,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET tasks by assignee (for manager to see each employee's tasks)
router.get('/by-employee/:name', async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền xem' });
    }
    const tasks = await Task.find({ assignedTo: req.params.name })
      .sort({ priority: 1, deadlineDate: 1 });
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    const obj = task.toObject();
    obj._isOverdue = task.deadlineDate && task.status !== 'completed' && task.deadlineDate < new Date();
    res.json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create new task (admin/manager only)
router.post('/', async (req, res) => {
  try {
    const { title, description, category, deadline, deadlineDate, priority, assignedTo, assignedToId, customer, notes, isShiftTask, dayKey, shiftName, assignmentDate } = req.body;

    if (!title || !deadline || !assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề, hạn chót và người thực hiện là bắt buộc.'
      });
    }

    const newTask = await Task.create({
      title,
      description: description || '',
      category: category || 'Khác',
      deadline,
      deadlineDate: deadlineDate || null,
      priority: priority || 'medium',
      assignedTo,
      assignedToId: assignedToId || null,
      customer: customer || null,
      notes: notes || '',
      status: 'pending',
      progress: 0,
      createdBy: req.user.id,
      createdByName: req.user.name,
      // Nhiệm vụ theo ca
      isShiftTask: isShiftTask || false,
      dayKey: dayKey || null,
      shiftName: shiftName || null,
      assignmentDate: assignmentDate ? new Date(assignmentDate) : null
    });

    const priorityLabel = { urgent: 'Khẩn cấp', high: 'Cao', medium: 'Trung bình', low: 'Thấp' }[priority] || 'Trung bình';
    let taskInfo = `với mức ưu tiên ${priorityLabel}, hạn chót ${deadline}`;
    if (isShiftTask && dayKey && shiftName) {
      taskInfo = `${shiftName} ngày ${dayKey}`;
    }
    await Notification.send({
      recipientId: assignedToId || assignedTo,
      recipientName: assignedTo,
      type: 'task_assigned',
      title: `Nhiệm vụ mới: ${title}`,
      message: `Bạn được giao nhiệm vụ "${title}" ${taskInfo}. Được tạo bởi ${req.user.name}.`,
      data: { taskId: newTask._id.toString() },
      priority: priority === 'urgent' || priority === 'high' ? 'high' : 'normal',
      actionUrl: '/tasks'
    });

    const obj = newTask.toObject();
    obj._isOverdue = false;
    res.status(201).json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update task (full update)
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const allowedFields = ['title', 'description', 'category', 'deadline', 'deadlineDate', 'priority', 'assignedTo', 'assignedToId', 'customer', 'notes', 'status', 'progress', 'isShiftTask', 'dayKey', 'shiftName', 'assignmentDate'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    if (task.status === 'completed' && !task.completedAt) {
      task.completedAt = new Date();
      task.progress = 100;
    }

    await task.save();

    const obj = task.toObject();
    obj._isOverdue = task.deadlineDate && task.status !== 'completed' && task.deadlineDate < new Date();
    res.json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH update task status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, progress } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (status) task.status = status;
    if (progress !== undefined) task.progress = Math.min(100, Math.max(0, progress));

    if (task.status === 'completed') {
      task.completedAt = new Date();
      task.progress = 100;
    }

    await task.save();

    const obj = task.toObject();
    obj._isOverdue = task.deadlineDate && task.status !== 'completed' && task.deadlineDate < new Date();
    res.json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH update progress only
router.patch('/:id/progress', async (req, res) => {
  try {
    const { progress } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    task.progress = Math.min(100, Math.max(0, progress || 0));

    if (task.progress === 100 && task.status !== 'completed') {
      task.status = 'completed';
      task.completedAt = new Date();
    } else if (task.progress > 0 && task.status === 'pending') {
      task.status = 'in_progress';
    }

    await task.save();

    const obj = task.toObject();
    obj._isOverdue = task.deadlineDate && task.status !== 'completed' && task.deadlineDate < new Date();
    res.json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH submit completion photo (staff sends photo for approval)
router.patch('/:id/submit-completion', upload.single('photo'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Debug logging
    console.log('[submit-completion] task.assignedToId:', task.assignedToId, 'type:', typeof task.assignedToId);
    console.log('[submit-completion] req.user.id:', req.user.id, 'type:', typeof req.user.id);
    console.log('[submit-completion] req.user:', req.user.name, 'isAdmin:', req.user.isAdmin);

    // Check if this is the assigned user (compare IDs) or by name as fallback
    const taskAssigneeId = task.assignedToId ? String(task.assignedToId) : '';
    const userId = String(req.user.id || '').replace(/^new ObjectId\(['"](.+)['"]\)$/, '$1');
    const isAssigned = taskAssigneeId.length > 0 && taskAssigneeId === userId;

    // Also check by name as fallback (for cases where assignedToId might be wrong)
    const isAssignedByName = task.assignedTo && req.user.name &&
      task.assignedTo.toLowerCase().trim() === req.user.name.toLowerCase().trim();

    console.log('[submit-completion] isAssigned:', isAssigned, 'isAssignedByName:', isAssignedByName);

    // If not assigned and not admin, deny
    if (!isAssigned && !isAssignedByName && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ người được giao mới có thể gửi ảnh'
      });
    }

    // Handle photo upload - upload to Cloudinary if file exists
    if (req.file) {
      try {
        console.log('[submit-completion] Uploading photo to Cloudinary...');
        const cloudResult = await uploadToCloudinary(
          req.file.buffer,
          'tasks',
          `task-${task._id}-${Date.now()}`
        );
        task.completionPhoto = cloudResult.url;
        console.log('[submit-completion] Uploaded to Cloudinary:', cloudResult.url);
      } catch (uploadError) {
        console.error('[submit-completion] Cloudinary upload error:', uploadError);
        // Fallback to local storage if Cloudinary fails
        task.completionPhoto = `/uploads/${req.file.filename}`;
      }
    } else if (req.body.photoUrl) {
      task.completionPhoto = req.body.photoUrl;
    }

    // Set status to submitted for admin approval
    if (req.body.status === 'submitted') {
      task.status = 'submitted';
      task.submittedAt = new Date();

      // Send notification to admin (task submitted for approval)
      try {
        await Notification.send({
          recipientId: 'admin',
          recipientName: 'Admin',
          type: 'task_submitted',
          title: `Yêu cầu duyệt: ${task.title}`,
          message: `Nhân viên ${task.assignedTo} đã gửi ảnh hoàn thành nhiệm vụ "${task.title}". Vui lòng kiểm tra và duyệt.`,
          data: { taskId: task._id.toString() },
          priority: task.priority === 'urgent' || task.priority === 'high' ? 'high' : 'normal',
          actionUrl: '/tasks'
        });
      } catch (notifErr) {
        console.error('[submit-completion] Notification error:', notifErr);
      }
    }

    await task.save();
    console.log('[submit-completion] Task saved successfully');

    const obj = task.toObject();
    obj._isOverdue = task.deadlineDate && task.status !== 'completed' && task.deadlineDate < new Date();
    console.log('[submit-completion] Sending response:', { success: true, status: obj.status, completionPhoto: obj.completionPhoto ? 'has photo' : 'no photo' });
    res.json({ success: true, data: obj });
  } catch (error) {
    console.error('[submit-completion] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
