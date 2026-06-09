import express from 'express';
import {
  getAuditLogs,
  getAuditStats,
  getAllConfigs,
  getConfigByKey,
  updateConfig,
  updateConfigsBatch,
  initializeConfigs,
  getSystemSettings,
  updateSystemSettings,
  getAllUsers,
  updateUserRole,
  resetUserPassword,
  toggleUserStatus,
  deleteUser,
  getSystemDashboard,
  exportAuditLogs
} from '../controllers/systemController.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

// Audit logs
router.get('/audit', getAuditLogs);
router.get('/audit/stats', getAuditStats);
router.get('/audit/export', exportAuditLogs);

// System config
router.get('/config', getAllConfigs);
router.get('/config/:key', getConfigByKey);
router.patch('/config/:key', updateConfig);
router.post('/config/batch', updateConfigsBatch);
router.post('/config/initialize', initializeConfigs);

// System settings (legacy)
router.get('/settings', getSystemSettings);
router.patch('/settings', updateSystemSettings);

// User management
router.get('/users', getAllUsers);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/password', resetUserPassword);
router.patch('/users/:id/toggle', toggleUserStatus);
router.delete('/users/:id', deleteUser);

// Dashboard
router.get('/dashboard', getSystemDashboard);

export default router;
