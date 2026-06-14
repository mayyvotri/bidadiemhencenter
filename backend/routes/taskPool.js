import express from 'express';
import TaskPool from '../models/TaskPool.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// GET all pool tasks
router.get('/', async (req, res) => {
  try {
    const poolTasks = await TaskPool.find({ isActive: true }).sort({ priority: 1, createdAt: -1 });
    res.json({ success: true, data: poolTasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create pool task
router.post('/', async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Tiêu đề là bắt buộc' });
    }

    const newPoolTask = await TaskPool.create({
      title,
      description: description || '',
      category: category || 'Khác',
      priority: priority || 'medium',
      createdBy: req.user.id,
      createdByName: req.user.name || req.user.username || 'Admin'
    });

    res.status(201).json({ success: true, data: newPoolTask });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update pool task
router.put('/:id', async (req, res) => {
  try {
    const poolTask = await TaskPool.findById(req.params.id);
    if (!poolTask) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy nhiệm vụ' });
    }

    const { title, description, category, priority } = req.body;
    if (title) poolTask.title = title;
    if (description !== undefined) poolTask.description = description;
    if (category) poolTask.category = category;
    if (priority) poolTask.priority = priority;

    await poolTask.save();
    res.json({ success: true, data: poolTask });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE pool task
router.delete('/:id', async (req, res) => {
  try {
    const poolTask = await TaskPool.findByIdAndDelete(req.params.id);
    if (!poolTask) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy nhiệm vụ' });
    }
    res.json({ success: true, message: 'Đã xóa nhiệm vụ' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST assign pool task to staff
router.post('/assign', async (req, res) => {
  try {
    const { poolTaskId, assignedTo, assignedToId, dayKey, shiftName, deadlineDate, deadline } = req.body;
    
    console.log('[assign] Request body:', JSON.stringify(req.body, null, 2));

    if (!poolTaskId || !assignedTo || !dayKey || !shiftName) {
      console.log('[assign] Missing required fields');
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    const poolTask = await TaskPool.findById(poolTaskId);
    if (!poolTask) {
      console.log('[assign] Pool task not found, poolTaskId:', poolTaskId);
      return res.status(404).json({ success: false, error: 'Không tìm thấy nhiệm vụ trong pool' });
    }
    
    console.log('[assign] Found poolTask:', poolTask.title);

    let newTask;
    try {
      newTask = await Task.create({
        title: poolTask.title,
        description: poolTask.description,
        category: poolTask.category,
        priority: poolTask.priority,
        deadline: deadline || '12:00',
        deadlineDate: deadlineDate || null,
        assignedTo,
        assignedToId: assignedToId || null,
        customer: null,
        notes: '',
        status: 'pending',
        progress: 0,
        createdBy: req.user.id,
        createdByName: req.user.name || req.user.username || 'Admin',
        isShiftTask: true,
        dayKey,
        shiftName,
        assignmentDate: new Date()
      });
      console.log('[assign] Task created successfully:', newTask._id);
    } catch (taskError) {
      console.error('[assign] Task.create error:', taskError.message, taskError.errors);
      return res.status(500).json({ success: false, error: 'Lỗi khi tạo task: ' + taskError.message });
    }

    // Send notification separately (don't fail task creation if notification fails)
    if (assignedToId) {
      try {
        await Notification.send({
          recipientId: assignedToId,
          recipientName: assignedTo,
          type: 'task_assigned',
          title: `Nhiệm vụ mới: ${poolTask.title}`,
          message: `Bạn được giao nhiệm vụ "${poolTask.title}" vào ${shiftName} ngày ${dayKey}. Được tạo bởi ${req.user.name || req.user.username || 'Admin'}.`,
          data: { taskId: newTask._id.toString() },
          priority: poolTask.priority === 'urgent' || poolTask.priority === 'high' ? 'high' : 'normal',
          actionUrl: '/tasks'
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError.message);
      }
    }

    const obj = newTask.toObject();
    obj._isOverdue = false;
    res.status(201).json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
