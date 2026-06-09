import express from 'express';
import Table from '../models/Table.js';

const router = express.Router();

// GET all tables
router.get('/', async (req, res) => {
  try {
    const tables = await Table.find();
    res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET table statistics (must be before /:id)
router.get('/stats/overview', async (req, res) => {
  try {
    const tables = await Table.find();
    const total = tables.length;
    const occupied = tables.filter(t => t.status === 'Occupied').length;
    const available = total - occupied;

    res.json({
      success: true,
      data: {
        total,
        occupied,
        available,
        vipTables: tables.filter(t => t.type === 'VIP').length,
        stdTables: tables.filter(t => t.type === 'STD').length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET single table by ID
router.get('/:id', async (req, res) => {
  try {
    const table = await Table.findOne({ id: req.params.id });
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    res.json({
      success: true,
      data: table
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST book a table
router.post('/:id/book', async (req, res) => {
  try {
    const table = await Table.findOneAndUpdate(
      { id: req.params.id, status: 'Ready' },
      {
        status: 'Occupied',
        time: req.body.duration || '02:00:00',
        staff: req.body.staff || 'Unknown',
        customer: req.body.customer || null,
        bookingTime: new Date()
      },
      { new: true }
    );
    
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found or already occupied'
      });
    }
    
    res.json({
      success: true,
      data: table
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST release a table
router.post('/:id/release', async (req, res) => {
  try {
    const table = await Table.findOneAndUpdate(
      { id: req.params.id },
      {
        status: 'Ready',
        time: null,
        staff: null,
        customer: null,
        bookingTime: null
      },
      { new: true }
    );
    
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    
    res.json({
      success: true,
      data: table
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
