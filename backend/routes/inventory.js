import express from 'express';
import Inventory from '../models/Inventory.js';

const router = express.Router();

// Helper function to update status based on quantity
const updateStatus = (item) => {
  if (item.quantity === 0) {
    item.status = 'out';
  } else if (item.quantity < item.minStock) {
    item.status = 'low';
  } else {
    item.status = 'ok';
  }
  return item;
};

// GET all inventory
router.get('/', async (req, res) => {
  try {
    const { category, status } = req.query;
    let query = {};
    
    if (category) query.category = category;
    if (status) query.status = status;
    
    const inventory = await Inventory.find(query);
    const updatedInventory = inventory.map(updateStatus);
    
    res.json({
      success: true,
      data: updatedInventory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET low stock items (must be before /:id)
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const lowStockItems = await Inventory.find({ $expr: { $lt: ['$quantity', '$minStock'] } });
    res.json({
      success: true,
      data: lowStockItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET single inventory item by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await Inventory.findOne({ id: req.params.id });
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    res.json({
      success: true,
      data: updateStatus(item)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST create new inventory item
router.post('/', async (req, res) => {
  try {
    const lastItem = await Inventory.findOne().sort({ createdAt: -1 });
    const lastNum = lastItem ? parseInt(lastItem.id.split('-')[1], 10) : 0;
    const newId = `INV-${String((Number.isNaN(lastNum) ? 0 : lastNum) + 1).padStart(3, '0')}`;

    const { id: _ignoredId, status: _ignoredStatus, ...body } = req.body;

    const newItem = await Inventory.create({
      ...body,
      id: newId,
      status: 'ok'
    });
    
    res.status(201).json({
      success: true,
      data: updateStatus(newItem)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT update inventory item
router.put('/:id', async (req, res) => {
  try {
    const item = await Inventory.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      data: updateStatus(item)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST add stock (increase quantity)
router.post('/:id/add', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quantity'
      });
    }
    
    const item = await Inventory.findOneAndUpdate(
      { id: req.params.id },
      { $inc: { quantity: quantity } },
      { new: true }
    );
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      data: updateStatus(item)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST remove stock (decrease quantity)
router.post('/:id/remove', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quantity'
      });
    }
    
    const item = await Inventory.findOne({ id: req.params.id });
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    if (item.quantity < quantity) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock'
      });
    }
    
    const updatedItem = await Inventory.findOneAndUpdate(
      { id: req.params.id },
      { $inc: { quantity: -quantity } },
      { new: true }
    );
    
    res.json({
      success: true,
      data: updateStatus(updatedItem)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE inventory item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Inventory.findOneAndDelete({ id: req.params.id });
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
