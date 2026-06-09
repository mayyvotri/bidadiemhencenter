import ShiftSwap from '../models/ShiftSwap.js';
import Staff from '../models/Staff.js';

// In-memory weekly shift data (seeded with initial shifts)
const weekShifts = {
  'Mon': [
    { id: 'Mon-1', name: 'Ca sáng', time: '08:00 - 14:00', role: 'Phục vụ', branch: 'Chi nhánh 1 Nguyễn Oanh', assignedTo: 'Minh Nguyễn', status: 'scheduled' },
    { id: 'Mon-2', name: 'Ca chiều', time: '14:00 - 20:00', role: 'Thu ngân', branch: 'Chi nhánh 1 Nguyễn Oanh', assignedTo: 'Văn Thanh', status: 'scheduled' },
  ],
  'Tue': [
    { id: 'Tue-1', name: 'Ca sáng', time: '08:00 - 14:00', role: 'Phục vụ', branch: 'Chi nhánh 1 Nguyễn Oanh', assignedTo: 'Lê Dũng', status: 'scheduled' },
    { id: 'Tue-2', name: 'Ca tối', time: '18:00 - 23:30', role: 'Quản lý bàn', branch: 'Chi nhánh 2 Quang Trung', assignedTo: 'Hồng Ánh', status: 'scheduled' },
  ],
  'Wed': [
    { id: 'Wed-1', name: 'Ca chiều', time: '14:00 - 20:00', role: 'Phục vụ', branch: 'Chi nhánh 1 Nguyễn Oanh', assignedTo: 'Minh Nguyễn', status: 'scheduled' },
  ],
  'Thu': [
    { id: 'Thu-1', name: 'Ca sáng', time: '08:00 - 14:00', role: 'Thu ngân', branch: 'Chi nhánh 1 Nguyễn Oanh', assignedTo: 'Văn Thanh', status: 'scheduled' },
    { id: 'Thu-2', name: 'Ca tối', time: '18:00 - 23:30', role: 'Phục vụ', branch: 'Chi nhánh 2 Quang Trung', assignedTo: 'Hồng Ánh', status: 'scheduled' },
  ],
  'Fri': [
    { id: 'Fri-1', name: 'Ca sáng', time: '08:00 - 14:00', role: 'Phục vụ', branch: 'Chi nhánh 1 Nguyễn Oanh', assignedTo: 'Lê Dũng', status: 'scheduled' },
    { id: 'Fri-2', name: 'Ca tối', time: '18:00 - 23:30', role: 'Quản lý bàn', branch: 'Chi nhánh 2 Quang Trung', assignedTo: 'Minh Nguyễn', status: 'scheduled' },
  ],
  'Sat': [
    { id: 'Sat-1', name: 'Ca sáng', time: '08:00 - 14:00', role: 'Phục vụ VIP', branch: 'Chi nhánh 1 Nguyễn Oanh', assignedTo: 'Văn Thanh', status: 'scheduled' },
    { id: 'Sat-2', name: 'Ca tối', time: '18:00 - 23:30', role: 'Phục vụ', branch: 'Chi nhánh 1 Nguyễn Oanh', assignedTo: 'Hồng Ánh', status: 'scheduled' },
  ],
  'Sun': [
    { id: 'Sun-1', name: 'Ca sáng', time: '08:00 - 14:00', role: 'Phục vụ', branch: 'Chi nhánh 1 Nguyễn Oanh', assignedTo: 'Lê Dũng', status: 'scheduled' },
    { id: 'Sun-2', name: 'Ca tối', time: '18:00 - 23:30', role: 'Quản lý bàn', branch: 'Chi nhánh 1 Nguyễn Oanh', assignedTo: 'Minh Nguyễn', status: 'scheduled' },
  ],
};

export const getShifts = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      shifts: weekShifts,
      weekOf: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    next(error);
  }
};

export const getSwapRequests = async (req, res, next) => {
  try {
    const user = req.user;
    let query = {};

    if (!user.isAdmin) {
      query = {
        $or: [
          { requesterId: user.id },
          { targetStaffId: user.id }
        ]
      };
    }

    const requests = await ShiftSwap.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const pendingCount = await ShiftSwap.countDocuments(
      user.isAdmin ? { status: 'pending' } : { targetStaffId: user.id, status: 'pending' }
    );

    return res.status(200).json({
      success: true,
      requests,
      pendingCount
    });
  } catch (error) {
    next(error);
  }
};

export const requestSwap = async (req, res, next) => {
  try {
    const {
      requesterShiftId,
      requesterShiftName,
      requesterShiftTime,
      requesterShiftDay,
      targetStaffId,
      targetStaffName,
      targetShiftId,
      targetShiftName,
      targetShiftTime,
      targetShiftDay,
      reason
    } = req.body;

    if (!requesterShiftId || !targetStaffId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Mã ca, nhân viên đổi và lý do là bắt buộc.'
      });
    }

    if (requesterShiftId === targetShiftId) {
      return res.status(400).json({
        success: false,
        message: 'Ca gốc và ca đổi không thể trùng nhau.'
      });
    }

    const existingPending = await ShiftSwap.findOne({
      requesterShiftId,
      requesterId: req.user.id,
      status: 'pending'
    });
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã có yêu cầu đổi ca đang chờ cho ca này.'
      });
    }

    const newSwap = await ShiftSwap.create({
      requesterId: req.user.id,
      requesterName: req.user.name,
      requesterShiftId,
      requesterShiftName,
      requesterShiftTime,
      requesterShiftDay,
      targetStaffId,
      targetStaffName,
      targetShiftId: targetShiftId || null,
      targetShiftName: targetShiftName || null,
      targetShiftTime: targetShiftTime || null,
      targetShiftDay: targetShiftDay || null,
      reason
    });

    return res.status(201).json({
      success: true,
      message: 'Yêu cầu đổi ca đã được gửi.',
      request: newSwap
    });
  } catch (error) {
    next(error);
  }
};

export const approveSwap = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ quản lý mới có thể duyệt yêu cầu đổi ca.'
      });
    }

    const swapRequest = await ShiftSwap.findById(id);

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Yêu cầu không tồn tại.'
      });
    }

    if (swapRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu này không còn ở trạng thái chờ duyệt.'
      });
    }

    swapRequest.status = 'approved';
    swapRequest.approvedBy = req.user.id;
    swapRequest.approvedAt = new Date();
    swapRequest.processedAt = new Date();
    await swapRequest.save();

    return res.status(200).json({
      success: true,
      message: 'Yêu cầu đổi ca đã được duyệt.',
      request: swapRequest
    });
  } catch (error) {
    next(error);
  }
};

export const rejectSwap = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ quản lý mới có thể từ chối yêu cầu đổi ca.'
      });
    }

    const swapRequest = await ShiftSwap.findById(id);

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Yêu cầu không tồn tại.'
      });
    }

    if (swapRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu này không còn ở trạng thái chờ duyệt.'
      });
    }

    swapRequest.status = 'rejected';
    swapRequest.approvedBy = req.user.id;
    swapRequest.processedAt = new Date();
    await swapRequest.save();

    return res.status(200).json({
      success: true,
      message: 'Yêu cầu đổi ca đã bị từ chối.',
      request: swapRequest
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSwap = async (req, res, next) => {
  try {
    const { id } = req.params;

    const swapRequest = await ShiftSwap.findById(id);

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Yêu cầu không tồn tại.'
      });
    }

    if (swapRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ yêu cầu đang chờ duyệt mới có thể hủy.'
      });
    }

    swapRequest.status = 'cancelled';
    swapRequest.processedAt = new Date();
    await swapRequest.save();

    return res.status(200).json({
      success: true,
      message: 'Yêu cầu đổi ca đã được hủy.',
      request: swapRequest
    });
  } catch (error) {
    next(error);
  }
};
