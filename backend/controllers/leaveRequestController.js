import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';

const calculateBusinessDays = (startDate, endDate) => {
  let count = 0;
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Exclude weekends
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

export const createLeaveRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { leaveType, startDate, endDate, reason, attachments, emergencyContact } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin cần thiết'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Ngày kết thúc phải sau ngày bắt đầu'
      });
    }

    const days = calculateBusinessDays(start, end);

    if (days <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Ngày nghỉ phải bao gồm ít nhất một ngày làm việc'
      });
    }

    // Check leave balance for paid leave types
    if (leaveType !== 'unpaid') {
      const currentYear = new Date().getFullYear();
      const balance = await LeaveBalance.findOne({ user: userId, year: currentYear });

      if (!balance) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy số ngày nghỉ phép'
        });
      }

      const balanceField = leaveType;
      if (balance[balanceField] < days) {
        return res.status(400).json({
          success: false,
          message: `Không đủ số ngày nghỉ phép. Còn lại: ${balance[balanceField]} ngày`
        });
      }
    }

    // Check for overlapping leave requests
    const overlapping = await LeaveRequest.findOne({
      user: userId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã có yêu cầu nghỉ phép trong khoảng thời gian này'
      });
    }

    const leaveRequest = await LeaveRequest.create({
      user: userId,
      leaveType,
      startDate: start,
      endDate: end,
      days,
      reason,
      attachments: attachments || [],
      emergencyContact
    });

    const populatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate('user', 'name email phone position');

    return res.status(201).json({
      success: true,
      message: 'Tạo yêu cầu nghỉ phép thành công',
      data: populatedRequest
    });
  } catch (error) {
    next(error);
  }
};

export const getMyLeaveRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, year } = req.query;
    const query = { user: userId };

    if (status) query.status = status;
    if (year) {
      query.startDate = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31)
      };
    }

    const requests = await LeaveRequest.find(query)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    next(error);
  }
};

export const getAllLeaveRequests = async (req, res, next) => {
  try {
    const { status, userId, year } = req.query;
    const query = {};

    if (status) query.status = status;
    if (userId) query.user = userId;
    if (year) {
      query.startDate = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31)
      };
    }

    const requests = await LeaveRequest.find(query)
      .populate('user', 'name email phone position')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaveRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await LeaveRequest.findById(id)
      .populate('user', 'name email phone position')
      .populate('approvedBy', 'name');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu nghỉ phép'
      });
    }

    return res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

export const approveLeaveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const managerId = req.user.id;

    const request = await LeaveRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu nghỉ phép'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể phê duyệt yêu cầu đang chờ'
      });
    }

    // Deduct from leave balance for paid leave types
    if (request.leaveType !== 'unpaid') {
      const currentYear = new Date().getFullYear();
      const balance = await LeaveBalance.findOne({ user: request.user, year: currentYear });

      if (!balance) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy số ngày nghỉ phép'
        });
      }

      const balanceField = request.leaveType;
      if (balance[balanceField] < request.days) {
        return res.status(400).json({
          success: false,
          message: `Không đủ số ngày nghỉ phép. Còn lại: ${balance[balanceField]} ngày`
        });
      }

      balance[balanceField] -= request.days;
      await balance.save();
    }

    request.status = 'approved';
    request.approvedBy = managerId;
    request.approvedAt = new Date();
    await request.save();

    const populatedRequest = await LeaveRequest.findById(request._id)
      .populate('user', 'name email')
      .populate('approvedBy', 'name');

    return res.status(200).json({
      success: true,
      message: 'Phê duyệt yêu cầu nghỉ phép thành công',
      data: populatedRequest
    });
  } catch (error) {
    next(error);
  }
};

export const rejectLeaveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const managerId = req.user.id;

    const request = await LeaveRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu nghỉ phép'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể từ chối yêu cầu đang chờ'
      });
    }

    request.status = 'rejected';
    request.rejectionReason = reason || '';
    request.approvedBy = managerId;
    request.approvedAt = new Date();
    await request.save();

    const populatedRequest = await LeaveRequest.findById(request._id)
      .populate('user', 'name email')
      .populate('approvedBy', 'name');

    return res.status(200).json({
      success: true,
      message: 'Từ chối yêu cầu nghỉ phép thành công',
      data: populatedRequest
    });
  } catch (error) {
    next(error);
  }
};

export const cancelLeaveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const request = await LeaveRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu nghỉ phép'
      });
    }

    // Check if user owns this request
    if (request.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy yêu cầu này'
      });
    }

    // Can only cancel pending or approved requests
    if (request.status !== 'pending' && request.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Không thể hủy yêu cầu này'
      });
    }

    // If approved, restore leave balance
    if (request.status === 'approved' && request.leaveType !== 'unpaid') {
      const currentYear = new Date().getFullYear();
      const balance = await LeaveBalance.findOne({ user: userId, year: currentYear });

      if (balance) {
        const balanceField = request.leaveType;
        balance[balanceField] += request.days;
        await balance.save();
      }
    }

    request.status = 'cancelled';
    await request.save();

    return res.status(200).json({
      success: true,
      message: 'Hủy yêu cầu nghỉ phép thành công',
      data: request
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaveStatistics = async (req, res, next) => {
  try {
    const { year } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const query = {
      startDate: {
        $gte: new Date(currentYear, 0, 1),
        $lte: new Date(currentYear, 11, 31)
      }
    };

    const requests = await LeaveRequest.find(query);

    const statistics = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      cancelled: requests.filter(r => r.status === 'cancelled').length,
      byType: {
        annual: requests.filter(r => r.leaveType === 'annual').length,
        sick: requests.filter(r => r.leaveType === 'sick').length,
        personal: requests.filter(r => r.leaveType === 'personal').length,
        maternity: requests.filter(r => r.leaveType === 'maternity').length,
        paternity: requests.filter(r => r.leaveType === 'paternity').length,
        unpaid: requests.filter(r => r.leaveType === 'unpaid').length
      },
      totalDays: requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.days, 0)
    };

    return res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};
