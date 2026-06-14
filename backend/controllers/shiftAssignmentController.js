import ShiftAssignment from '../models/ShiftAssignment.js';
import Shift from '../models/Shift.js';
import User from '../models/User.js';
import LeaveRequest from '../models/LeaveRequest.js';

// Check for scheduling conflicts
const checkConflict = async (userId, date, shiftId, excludeAssignmentId = null) => {
  const shift = await Shift.findById(shiftId);
  if (!shift) return null;

  const query = {
    user: userId,
    date: new Date(date),
    _id: { $ne: excludeAssignmentId }
  };

  const existingAssignments = await ShiftAssignment.find(query).populate('shift');

  for (const assignment of existingAssignments) {
    const existingShift = assignment.shift;
    if (!existingShift) continue;

    // Check time overlap
    const [start1Hour, start1Min] = shift.startTime.split(':').map(Number);
    const [end1Hour, end1Min] = shift.endTime.split(':').map(Number);
    const [start2Hour, start2Min] = existingShift.startTime.split(':').map(Number);
    const [end2Hour, end2Min] = existingShift.endTime.split(':').map(Number);

    const start1 = start1Hour * 60 + start1Min;
    const end1 = end1Hour * 60 + end1Min;
    const start2 = start2Hour * 60 + start2Min;
    const end2 = end2Hour * 60 + end2Min;

    if (start1 < end2 && end1 > start2) {
      return {
        conflict: true,
        existingShift: existingShift,
        message: `Xung đột với ca ${existingShift.name} (${existingShift.startTime} - ${existingShift.endTime})`
      };
    }
  }

  return { conflict: false };
};

export const createAssignment = async (req, res, next) => {
  try {
    const { userId, shiftId, date, notes, isRecurring, recurringPattern, recurringEndDate } = req.body;
    const managerId = req.user.id;

    if (!userId || !shiftId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin cần thiết'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên'
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

    // Check for conflicts
    const conflict = await checkConflict(userId, date, shiftId);
    if (conflict && conflict.conflict) {
      return res.status(400).json({
        success: false,
        message: conflict.message
      });
    }

    // Check if user is on leave during this date
    const leaveRequest = await LeaveRequest.findOne({
      user: userId,
      status: 'approved',
      startDate: { $lte: new Date(date) },
      endDate: { $gte: new Date(date) }
    });

    if (leaveRequest) {
      return res.status(400).json({
        success: false,
        message: 'Nhân viên đang nghỉ phép trong ngày này'
      });
    }

    const assignment = await ShiftAssignment.create({
      user: userId,
      shift: shiftId,
      date: new Date(date),
      assignedBy: managerId,
      notes,
      isRecurring,
      recurringPattern,
      recurringEndDate: recurringEndDate ? new Date(recurringEndDate) : null
    });

    const populatedAssignment = await ShiftAssignment.findById(assignment._id)
      .populate('user', 'name email phone position')
      .populate('shift')
      .populate('assignedBy', 'name');

    return res.status(201).json({
      success: true,
      message: 'Phân công ca làm việc thành công',
      data: populatedAssignment
    });
  } catch (error) {
    next(error);
  }
};

export const getAllAssignments = async (req, res, next) => {
  try {
    const { userId, shiftId, startDate, endDate } = req.query;
    const query = {};

    if (userId) query.user = userId;
    if (shiftId) query.shift = shiftId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const assignments = await ShiftAssignment.find(query)
      .populate('user', 'name email phone position')
      .populate('shift')
      .populate('assignedBy', 'name')
      .sort({ date: 1, 'shift.startTime': 1 });

    return res.status(200).json({
      success: true,
      data: assignments,
      count: assignments.length
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await ShiftAssignment.findById(id)
      .populate('user', 'name email phone position')
      .populate('shift')
      .populate('assignedBy', 'name');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phân công'
      });
    }

    return res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

export const updateAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { shiftId, date, notes } = req.body;

    const assignment = await ShiftAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phân công'
      });
    }

    // Check for conflicts if changing shift or date
    if (shiftId || date) {
      const newShiftId = shiftId || assignment.shift;
      const newDate = date || assignment.date;
      const conflict = await checkConflict(assignment.user, newDate, newShiftId, id);
      if (conflict && conflict.conflict) {
        return res.status(400).json({
          success: false,
          message: conflict.message
        });
      }

      // Check if user is on leave during this date
      const leaveRequest = await LeaveRequest.findOne({
        user: assignment.user,
        status: 'approved',
        startDate: { $lte: new Date(newDate) },
        endDate: { $gte: new Date(newDate) }
      });

      if (leaveRequest) {
        return res.status(400).json({
          success: false,
          message: 'Nhân viên đang nghỉ phép trong ngày này'
        });
      }
    }

    if (shiftId) assignment.shift = shiftId;
    if (date) assignment.date = new Date(date);
    if (notes !== undefined) assignment.notes = notes;

    await assignment.save();

    const populatedAssignment = await ShiftAssignment.findById(assignment._id)
      .populate('user', 'name email phone position')
      .populate('shift')
      .populate('assignedBy', 'name');

    return res.status(200).json({
      success: true,
      message: 'Cập nhật phân công thành công',
      data: populatedAssignment
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await ShiftAssignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phân công'
      });
    }

    await ShiftAssignment.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Xóa phân công thành công'
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAssignments = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.id;

    const query = { user: userId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        // Parse YYYY-MM-DD as local date and adjust for MongoDB UTC storage
        const [y, m, d] = startDate.split('-');
        const start = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
        start.setHours(start.getHours() - start.getTimezoneOffset() / 60);
        query.date.$gte = start;
      }
      if (endDate) {
        // Parse YYYY-MM-DD as local date and adjust for MongoDB UTC storage
        const [y, m, d] = endDate.split('-');
        const end = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
        end.setHours(end.getHours() - end.getTimezoneOffset() / 60);
        query.date.$lte = end;
      }
    }

    console.log('[getMyAssignments] userId:', userId, 'startDate:', startDate, 'endDate:', endDate);

    const assignments = await ShiftAssignment.find(query)
      .populate('user', 'name email phone position')
      .populate('shift')
      .populate('assignedBy', 'name')
      .sort({ date: 1, 'shift.startTime': 1 });

    console.log('[getMyAssignments] found count:', assignments.length, 'dates:', assignments.map(a => a.date?.toISOString?.() || a.date));

    return res.status(200).json({
      success: true,
      data: assignments,
      count: assignments.length
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignmentsByDateRange = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu ngày bắt đầu hoặc ngày kết thúc'
      });
    }

    const assignments = await ShiftAssignment.find({
      date: {
        // Parse YYYY-MM-DD as local date and adjust for MongoDB UTC storage
        $gte: (() => {
          const [y, m, d] = startDate.split('-');
          const dt = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
          dt.setHours(dt.getHours() - dt.getTimezoneOffset() / 60);
          return dt;
        })(),
        $lte: (() => {
          const [y, m, d] = endDate.split('-');
          const dt = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
          dt.setHours(dt.getHours() - dt.getTimezoneOffset() / 60);
          return dt;
        })()
      }
    })
      .populate('user', 'name email phone position')
      .populate('shift')
      .sort({ date: 1, 'shift.startTime': 1 });

    return res.status(200).json({
      success: true,
      data: assignments,
      count: assignments.length
    });
  } catch (error) {
    next(error);
  }
};
