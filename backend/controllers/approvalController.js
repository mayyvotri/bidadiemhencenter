import User from '../models/User.js';

export const getPendingApprovals = async (req, res, next) => {
  try {
    const pendingUsers = await User.find({ approvalStatus: 'pending' })
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: pendingUsers
    });
  } catch (error) {
    next(error);
  }
};

export const approveAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const managerId = req.user.id;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    if (user.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã được duyệt'
      });
    }

    if (user.approvalStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã bị từ chối. Không thể duyệt lại.'
      });
    }

    user.approvalStatus = 'approved';
    user.isActive = true;
    user.approvedBy = managerId;
    user.approvedAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Duyệt tài khoản thành công',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        approvalStatus: user.approvalStatus,
        isActive: user.isActive,
        approvedAt: user.approvedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const rejectAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const managerId = req.user.id;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    if (user.approvalStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã bị từ chối'
      });
    }

    if (user.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đã được duyệt. Không thể từ chối.'
      });
    }

    user.approvalStatus = 'rejected';
    user.isActive = false;
    user.approvedBy = managerId;
    user.approvedAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Từ chối tài khoản thành công',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        approvalStatus: user.approvalStatus,
        isActive: user.isActive,
        approvedAt: user.approvedAt,
        reason
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllApprovals = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { approvalStatus: status } : {};
    
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};
