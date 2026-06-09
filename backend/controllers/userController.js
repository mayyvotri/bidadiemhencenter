import User from '../models/User.js';

export const createEmployee = async (req, res, next) => {
  try {
    const { email, password, name, phone, role, position } = req.body;

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

    const allowedRoles = ['staff', 'manager'];
    const userRole = allowedRoles.includes(role) ? role : 'staff';

    const allowedPositions = ['receptionist', 'waiter', 'cashier', 'technician', 'shift_supervisor', 'none'];
    const userPosition = allowedPositions.includes(position) ? position : 'none';

    const user = await User.create({
      email,
      password,
      name,
      phone,
      role: userRole,
      position: userPosition,
      isActive: false,
      approvalStatus: 'pending',
      mustChangePassword: true
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo nhân viên thành công. Tài khoản đang chờ được duyệt bởi quản lý.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        position: user.position,
        approvalStatus: user.approvalStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const { search, role, position, isActive, isLocked, approvalStatus, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) query.role = role;
    if (position) query.position = position;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isLocked !== undefined) query.isLocked = isLocked === 'true';
    if (approvalStatus) query.approvalStatus = approvalStatus;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const users = await User.find(query).select('-password').sort(sortOptions);

    return res.status(200).json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, role, position, avatar } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (role && ['staff', 'manager', 'admin'].includes(role)) user.role = role;
    if (position) {
      const allowedPositions = ['receptionist', 'waiter', 'cashier', 'technician', 'shift_supervisor', 'none'];
      if (allowedPositions.includes(position)) user.position = position;
    }
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật người dùng thành công',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        position: user.position,
        avatar: user.avatar,
        isActive: user.isActive,
        isLocked: user.isLocked,
        approvalStatus: user.approvalStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Xóa người dùng thành công'
    });
  } catch (error) {
    next(error);
  }
};

export const activateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    user.isActive = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Kích hoạt người dùng thành công',
      data: {
        id: user._id,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    user.isActive = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Vô hiệu hóa người dùng thành công',
      data: {
        id: user._id,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

export const forcePasswordChange = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    user.mustChangePassword = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Yêu cầu đổi mật khẩu đã được đặt',
      data: {
        id: user._id,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (error) {
    next(error);
  }
};

export const lockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    if (user.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã bị khóa'
      });
    }

    user.isLocked = true;
    user.lockedAt = new Date();
    user.lockedBy = req.user?.id || null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Khóa tài khoản thành công',
      data: {
        id: user._id,
        isLocked: user.isLocked,
        lockedAt: user.lockedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const unlockUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    if (!user.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản không bị khóa'
      });
    }

    user.isLocked = false;
    user.lockedAt = null;
    user.lockedBy = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Mở khóa tài khoản thành công',
      data: {
        id: user._id,
        isLocked: user.isLocked
      }
    });
  } catch (error) {
    next(error);
  }
};
