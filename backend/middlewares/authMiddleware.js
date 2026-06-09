import User from '../models/User.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access. Token is missing or invalid.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. Invalid token.'
      });
    }

    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. Account not found or inactive.'
      });
    }

    if (user.approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. Account is not approved.'
      });
    }

    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      isAdmin: user.role === 'manager' || user.role === 'admin'
    };

    return next();
  } catch {
    return res.status(403).json({
      success: false,
      message: 'Access forbidden. Invalid token.'
    });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access forbidden. Admin privileges required.'
    });
  }
  return next();
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. Insufficient permissions.'
      });
    }
    return next();
  };
};

export const requireManager = (req, res, next) => {
  if (!req.user || (req.user.role !== 'manager' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Access forbidden. Manager privileges required.'
    });
  }
  return next();
};
