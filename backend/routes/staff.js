import express from 'express';
import User from '../models/User.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET all staff (from User collection - for schedule assignment)
router.get('/', requireAuth, async (req, res) => {
  try {
    // Get all active users with staff/manager role
    const users = await User.find({ 
      role: { $in: ['staff', 'manager'] },
      isActive: true
    }).select('-password');
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET single staff by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST create new staff
router.post('/', async (req, res) => {
  try {
    const lastUser = await User.findOne().sort({ createdAt: -1 });
    const newId = lastUser ? `DHB-${parseInt(lastUser._id.toString().slice(-4), 16)}` : 'DHB-1001';

    const { id: _ignoredId, joinDate: _ignoredJoinDate, ...body } = req.body;

    const newUser = await User.create({
      ...body,
      role: body.role || 'staff',
      approvalStatus: 'approved',
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      data: newUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT update staff
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const allowedFields = [
      'name', 'phone', 'role', 'position', 'avatar', 'isActive',
      'status', 'workArea', 'address', 'dateOfBirth', 'emergencyContact',
      'salary', 'notes', 'approvalStatus', 'mustChangePassword'
    ];
    
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE staff
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
