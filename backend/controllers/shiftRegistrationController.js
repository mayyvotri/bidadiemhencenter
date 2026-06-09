import ShiftRegistration from '../models/ShiftRegistration.js';
import Shift from '../models/Shift.js';

export const getMyRegistrations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    const query = { user: userId };
    if (status) query.status = status;

    const registrations = await ShiftRegistration.find(query)
      .populate('shift')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: registrations,
      count: registrations.length
    });
  } catch (error) {
    next(error);
  }
};

export const getAllRegistrations = async (req, res, next) => {
  try {
    const { status, shiftId, userId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (shiftId) query.shift = shiftId;
    if (userId) query.user = userId;

    const registrations = await ShiftRegistration.find(query)
      .populate('user', 'name email phone position')
      .populate('shift')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: registrations,
      count: registrations.length
    });
  } catch (error) {
    next(error);
  }
};

export const createRegistration = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { shiftId, startDate, notes } = req.body;

    if (!shiftId || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin cần thiết'
      });
    }

    // Check if shift exists and is active
    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ca làm việc'
      });
    }

    if (!shift.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Ca làm việc này không hoạt động'
      });
    }

    // Check for duplicate registration
    const existingRegistration = await ShiftRegistration.findOne({
      user: userId,
      shift: shiftId,
      startDate: new Date(startDate),
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đăng ký ca làm việc này'
      });
    }

    // Check max employees limit
    if (shift.maxEmployees) {
      const approvedCount = await ShiftRegistration.countDocuments({
        shift: shiftId,
        status: 'approved',
        startDate: new Date(startDate)
      });

      if (approvedCount >= shift.maxEmployees) {
        return res.status(400).json({
          success: false,
          message: 'Ca làm việc đã đầy'
        });
      }
    }

    const registration = await ShiftRegistration.create({
      user: userId,
      shift: shiftId,
      startDate: new Date(startDate),
      notes
    });

    const populatedRegistration = await ShiftRegistration.findById(registration._id).populate('shift');

    return res.status(201).json({
      success: true,
      message: 'Đăng ký ca làm việc thành công',
      data: populatedRegistration
    });
  } catch (error) {
    next(error);
  }
};

export const cancelRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const registration = await ShiftRegistration.findById(id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đăng ký'
      });
    }

    // Check if user owns this registration
    if (registration.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy đăng ký này'
      });
    }

    // Can only cancel pending or approved registrations
    if (registration.status !== 'pending' && registration.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Không thể hủy đăng ký này'
      });
    }

    registration.status = 'cancelled';
    registration.endDate = new Date();
    await registration.save();

    return res.status(200).json({
      success: true,
      message: 'Hủy đăng ký thành công',
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

export const approveRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const managerId = req.user.id;

    const registration = await ShiftRegistration.findById(id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đăng ký'
      });
    }

    if (registration.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể phê duyệt đăng ký đang chờ'
      });
    }

    // Check max employees limit
    const shift = await Shift.findById(registration.shift);
    if (shift.maxEmployees) {
      const approvedCount = await ShiftRegistration.countDocuments({
        shift: registration.shift,
        status: 'approved',
        startDate: registration.startDate
      });

      if (approvedCount >= shift.maxEmployees) {
        return res.status(400).json({
          success: false,
          message: 'Ca làm việc đã đầy'
        });
      }
    }

    registration.status = 'approved';
    registration.approvedBy = managerId;
    registration.approvedAt = new Date();
    await registration.save();

    const populatedRegistration = await ShiftRegistration.findById(registration._id)
      .populate('user', 'name email')
      .populate('shift');

    return res.status(200).json({
      success: true,
      message: 'Phê duyệt đăng ký thành công',
      data: populatedRegistration
    });
  } catch (error) {
    next(error);
  }
};

export const rejectRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const managerId = req.user.id;

    const registration = await ShiftRegistration.findById(id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đăng ký'
      });
    }

    if (registration.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể từ chối đăng ký đang chờ'
      });
    }

    registration.status = 'rejected';
    registration.rejectionReason = reason || '';
    registration.approvedBy = managerId;
    registration.approvedAt = new Date();
    await registration.save();

    const populatedRegistration = await ShiftRegistration.findById(registration._id)
      .populate('user', 'name email')
      .populate('shift');

    return res.status(200).json({
      success: true,
      message: 'Từ chối đăng ký thành công',
      data: populatedRegistration
    });
  } catch (error) {
    next(error);
  }
};

export const getRegistrationStatistics = async (req, res, next) => {
  try {
    const { shiftId, startDate, endDate } = req.query;
    const query = {};

    if (shiftId) query.shift = shiftId;
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const registrations = await ShiftRegistration.find(query);

    const statistics = {
      total: registrations.length,
      pending: registrations.filter(r => r.status === 'pending').length,
      approved: registrations.filter(r => r.status === 'approved').length,
      rejected: registrations.filter(r => r.status === 'rejected').length,
      cancelled: registrations.filter(r => r.status === 'cancelled').length
    };

    return res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};
