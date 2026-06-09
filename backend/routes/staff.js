import express from 'express';
import Staff from '../models/Staff.js';

const router = express.Router();

// GET all staff
router.get('/', async (req, res) => {
  try {
    const staff = await Staff.find();
    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET single staff by ID
router.get('/:id', async (req, res) => {
  try {
    const staff = await Staff.findOne({ id: req.params.id });
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found'
      });
    }
    res.json({
      success: true,
      data: staff
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
    const lastStaff = await Staff.findOne().sort({ createdAt: -1 });
    const lastNum = lastStaff ? parseInt(lastStaff.id.split('-')[1], 10) : 1000;
    const newId = `DHB-${(Number.isNaN(lastNum) ? 1000 : lastNum) + 1}`;

    const { id: _ignoredId, joinDate: _ignoredJoinDate, ...body } = req.body;

    const newStaff = await Staff.create({
      ...body,
      id: newId,
      joinDate: new Date().toLocaleDateString('vi-VN')
    });
    
    res.status(201).json({
      success: true,
      data: newStaff
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT update staff
router.put('/:id', async (req, res) => {
  try {
    const staff = await Staff.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found'
      });
    }
    
    res.json({
      success: true,
      data: staff
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
    const staff = await Staff.findOneAndDelete({ id: req.params.id });
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Staff deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
