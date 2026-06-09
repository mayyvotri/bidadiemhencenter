import express from 'express';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// GET all tasks
router.get('/', async (req, res) => {
  try {
    const { status, priority, assignedTo, createdBy, overdue } = req.query;
    let query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (createdBy) query.createdBy = createdBy;

    const tasks = await Task.find(query).sort({ priority: 1, deadlineDate: 1, createdAt: -1 });

    const enriched = tasks.map(task => {
      const obj = task.toObject();
      obj._isOverdue = task.deadlineDate && task.status !== 'completed' && task.deadlineDate < new Date();
      return obj;
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET my tasks (assigned to current user)
router.get('/my', async (req, res) => {
  try {
    const tasks = await Task.find({ assignedToId: req.user.id })
      .sort({ priority: 1, deadlineDate: 1, createdAt: -1 });

    const enriched = tasks.map(task => {
      const obj = task.toObject();
      obj._isOverdue = task.deadlineDate && task.status !== 'completed' && task.deadlineDate < new Date();
      return obj;
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

    const [total, pending, inProgress, completed, highPriority, overdue] = await Promise.all([
      Task.countDocuments(query),
      Task.countDocuments({ ...query, status: 'pending' }),
      Task.countDocuments({ ...query, status: 'in_progress' }),
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
        inProgress,
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
    const { title, description, category, deadline, deadlineDate, priority, assignedTo, assignedToId, customer, notes } = req.body;

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
      createdByName: req.user.name
    });

    const priorityLabel = { urgent: 'Khẩn cấp', high: 'Cao', medium: 'Trung bình', low: 'Thấp' }[priority] || 'Trung bình';
    await Notification.send({
      recipientId: assignedToId || assignedTo,
      recipientName: assignedTo,
      type: 'task_assigned',
      title: `Nhiệm vụ mới: ${title}`,
      message: `Bạn được giao nhiệm vụ "${title}" với mức ưu tiên ${priorityLabel}, hạn chót ${deadline}. Được tạo bởi ${req.user.name}.`,
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

    const allowedFields = ['title', 'description', 'category', 'deadline', 'deadlineDate', 'priority', 'assignedTo', 'assignedToId', 'customer', 'notes', 'status', 'progress'];
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

export default router;
