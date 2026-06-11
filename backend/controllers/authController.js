import User from '../models/User.js';
import Token from '../models/Token.js';
import AuditLog from '../models/AuditLog.js';
import { generateAccessToken, generateRefreshToken, generateResetToken, verifyRefreshToken, verifyResetToken } from '../utils/jwt.js';
import crypto from 'crypto';

const IP = (req) => req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
const UA = (req) => req.headers['user-agent'] || null;

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email và mật khẩu là bắt buộc'
      });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      await AuditLog.logAuth({
        action: 'LOGIN_FAILED',
        description: `Đăng nhập thất bại - email không tồn tại: ${email}`,
        ipAddress: IP(req),
        userAgent: UA(req),
        status: 'FAILURE',
        severity: 'MEDIUM'
      });
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      await AuditLog.logAuth({
        action: 'LOGIN_FAILED',
        description: `Đăng nhập thất bại - sai mật khẩu cho: ${email}`,
        ipAddress: IP(req),
        userAgent: UA(req),
        status: 'FAILURE',
        severity: 'MEDIUM'
      });
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác'
      });
    }

    const isPending = user.approvalStatus === 'pending';

    const accessToken = generateAccessToken({ userId: user._id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user._id });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await Token.deleteMany({ user: user._id, type: 'refresh' });
    await Token.create({
      user: user._id,
      token: refreshToken,
      type: 'refresh',
      expiresAt
    });

    await AuditLog.logAuth({
      action: 'LOGIN',
      description: `User "${user.name}" đăng nhập thành công`,
      performedBy: String(user._id),
      performedByName: user.name,
      performedByRole: user.role,
      ipAddress: IP(req),
      userAgent: UA(req),
      status: 'SUCCESS',
      severity: 'LOW'
    });

    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      pendingApproval: isPending,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        mustChangePassword: user.mustChangePassword,
        isAdmin: user.role === 'manager' || user.role === 'admin',
        approvalStatus: user.approvalStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const { email, password, name, phone, role } = req.body;

    if (!email || !password || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email, mật khẩu, tên và số điện thoại là bắt buộc'
      });
    }

    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    const allowedRoles = ['staff'];
    const userRole = allowedRoles.includes(role) ? role : 'staff';

    const user = await User.create({
      email,
      password,
      name,
      phone,
      role: userRole,
      isActive: false,
      approvalStatus: 'pending',
      mustChangePassword: true
    });

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công. Tài khoản của bạn đang chờ được duyệt bởi quản lý.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        approvalStatus: user.approvalStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await Token.deleteMany({ user: userId, type: 'refresh' });

    await AuditLog.logAuth({
      action: 'LOGOUT',
      description: `User "${req.user.name}" đăng xuất`,
      performedBy: userId,
      performedByName: req.user.name,
      ipAddress: IP(req),
      userAgent: UA(req),
      status: 'SUCCESS',
      severity: 'LOW'
    });

    return res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const tokenDoc = await Token.findOne({ token: refreshToken, type: 'refresh', used: false });

    if (!tokenDoc) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    tokenDoc.used = true;
    await tokenDoc.save();

    const newAccessToken = generateAccessToken({ userId: user._id, email: user.email, role: user.role });
    const newRefreshToken = generateRefreshToken({ userId: user._id });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Token.create({
      user: user._id,
      token: newRefreshToken,
      type: 'refresh',
      expiresAt
    });

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác'
      });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng với email này'
      });
    }

    const resetToken = generateResetToken({ userId: user._id });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await Token.create({
      user: user._id,
      token: resetToken,
      type: 'reset',
      expiresAt
    });

    return res.status(200).json({
      success: true,
      message: 'Token đặt lại mật khẩu đã được tạo',
      resetToken
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token và mật khẩu mới là bắt buộc'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    const decoded = verifyResetToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    const tokenDoc = await Token.findOne({ token, type: 'reset', used: false });

    if (!tokenDoc) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    tokenDoc.used = true;
    await tokenDoc.save();

    return res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công'
    });
  } catch (error) {
    next(error);
  }
};

export const getStatus = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user
  });
};
