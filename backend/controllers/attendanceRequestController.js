import AttendanceRequest from '../models/AttendanceRequest.js';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Payroll from '../models/Payroll.js';
import mongoose from 'mongoose';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const getShiftName = (hour) => {
  if (hour >= 8 && hour < 16) return 'Ca sáng';
  if (hour >= 16 && hour < 21) return 'Ca tối';
  return 'Ca khuya';
};

const getStatus = (checkInTime) => {
  const hour = new Date(checkInTime).getHours();
  if (hour >= 9) return 'late';
  return 'on_time';
};

// Helper: Update Payroll.attendanceDetails when attendance is approved
const updatePayrollAttendance = async (employeeId, dateStr, checkIn, checkOut, hours, status) => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  let payroll = await Payroll.findOne({ staffId: employeeId.toString(), month, year });

  if (!payroll) {
    const staff = await User.findById(employeeId);
    if (!staff) return;

    payroll = await Payroll.create({
      staffId: employeeId.toString(),
      staffName: staff.name,
      dept: staff.dept || '',
      month,
      year,
      totalHoursWorked: 0,
      regularHours: 0,
      overtimeHours: 0,
      nightShiftHours: 0,
      weekendHours: 0,
      holidayHours: 0,
      totalDaysWorked: 0,
      lateCount: 0,
      absentDays: 0,
      status: 'draft'
    });
  }

  const existingIdx = payroll.attendanceDetails.findIndex(d => d.date === dateStr);

  // Calculate actual hours from check-in/check-out times if available
  let actualHours = hours || 0;
  if (checkIn && checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (!isNaN(checkInDate) && !isNaN(checkOutDate) && checkOutDate > checkInDate) {
      actualHours = (checkOutDate - checkInDate) / (1000 * 60 * 60);
      actualHours = Math.round(actualHours * 100) / 100; // Round to 2 decimals
    }
  }

  if (existingIdx >= 0) {
    if (checkIn) payroll.attendanceDetails[existingIdx].checkIn = checkIn;
    if (checkOut) payroll.attendanceDetails[existingIdx].checkOut = checkOut;
    payroll.attendanceDetails[existingIdx].hours = actualHours;
    if (status) payroll.attendanceDetails[existingIdx].status = status;
  } else {
    payroll.attendanceDetails.push({
      date: dateStr,
      checkIn: checkIn || '',
      checkOut: checkOut || '',
      hours: actualHours,
      status: status || 'on_time'
    });
    payroll.totalDaysWorked = (payroll.totalDaysWorked || 0) + 1;
    if (status === 'late') {
      payroll.lateCount = (payroll.lateCount || 0) + 1;
    }
  }

  // Recalculate total hours from all attendance details
  payroll.totalHoursWorked = payroll.attendanceDetails.reduce((sum, d) => sum + (d.hours || 0), 0);
  payroll.regularHours = payroll.totalHoursWorked;

  await payroll.save();
  console.log('[APPROVE] Payroll updated for date:', dateStr, '- hours:', actualHours);
};

// POST /api/v1/attendance-requests - Employee submits a new attendance request
export const createRequest = async (req, res) => {
  try {
    const { type } = req.body;
    const employeeId = req.user.id;

    let photoUrl;
    let location = {};

    if (req.body.location) {
      try { location = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location; } catch { /* ignore */ }
    }

    // Upload to Cloudinary if file is present
    if (req.file) {
      try {
        const employee = await User.findById(employeeId).select('name');
        const result = await uploadToCloudinary(
          req.file.buffer,
          'attendance',
          `attendance-${type}-${employee?.name || employeeId}-${Date.now()}`
        );
        photoUrl = result.url;
      } catch (cloudErr) {
        console.error('Cloudinary upload error:', cloudErr);
        return res.status(500).json({
          success: false,
          message: 'Không thể tải ảnh lên Cloud. Vui lòng thử lại.'
        });
      }
    } else if (req.body.photoUrl) {
      photoUrl = req.body.photoUrl;
    }

    if (!type || !photoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Loại yêu cầu và ảnh là bắt buộc.'
      });
    }

    if (!['checkin', 'checkout'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại yêu cầu không hợp lệ.'
      });
    }

    // Prevent multiple check-ins if there's no checkout yet
    if (type === 'checkin') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      // 1. Check if there's a pending check-in request without a checkout request yet
      const pendingCheckin = await AttendanceRequest.findOne({
        employee: employeeId,
        type: 'checkin',
        requestTime: { $gte: todayStart, $lt: todayEnd },
        status: 'pending'
      });

      if (pendingCheckin) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã gửi yêu cầu check-in hôm nay và đang chờ duyệt. Vui lòng chờ duyệt trước.'
        });
      }

      // 2. Check if employee already has an active attendance (approved check-in without checkout) today
      const activeAttendance = await Attendance.findOne({
        user: new mongoose.Types.ObjectId(employeeId),
        date: { $gte: todayStart, $lt: todayEnd },
        checkOut: null
      });

      if (activeAttendance) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã check-in hôm nay và chưa check-out. Vui lòng check-out trước.'
        });
      }
    }

    // Allow multiple check-in/out pairs per day - no restriction

    // Create the request
    const request = await AttendanceRequest.create({
      employee: employeeId,
      type,
      photoUrl,
      location
    });

    // Notify managers
    const managers = await User.find({ role: { $in: ['manager', 'admin', 'quản lý', 'quản trị'] }, isActive: true });
    const employee = await User.findById(employeeId).select('name');

    const notifPromises = managers.map(manager =>
      Notification.create({
        recipientId: manager._id.toString(),
        recipientName: manager.name,
        type: 'general',
        title: 'Yêu cầu chấm công mới',
        message: `${employee?.name || 'Nhân viên'} đã gửi yêu cầu ${type === 'checkin' ? 'check-in' : 'check-out'}.`,
        data: {
          requestId: request._id.toString(),
          employeeId: employeeId,
          employeeName: employee?.name
        },
        priority: 'normal'
      })
    );
    await Promise.all(notifPromises);

    const populated = await AttendanceRequest.findById(request._id)
      .populate('employee', 'name email');

    return res.status(201).json({
      success: true,
      message: 'Yêu cầu chấm công đã được gửi. Vui lòng chờ quản lý duyệt.',
      data: populated
    });
  } catch (error) {
    console.error('[CREATE REQUEST ERROR]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra.'
    });
  }
};

// GET /api/v1/attendance-requests/my - Employee views their own requests
export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { employee: userId };
    if (status) filter.status = status;

    const requests = await AttendanceRequest.find(filter)
      .sort({ requestTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('employee', 'name email');

    const total = await AttendanceRequest.countDocuments(filter);

    return res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[GET MY REQUESTS ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra.'
    });
  }
};

// GET /api/v1/attendance-requests - Manager views all requests
export const getAllRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const requests = await AttendanceRequest.find(filter)
      .sort({ requestTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('employee', 'name email')
      .populate('reviewedBy', 'name');

    const total = await AttendanceRequest.countDocuments(filter);

    return res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[GET ALL REQUESTS ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra.'
    });
  }
};

// PATCH /api/v1/attendance-requests/:id/approve - Manager approves request
export const approveRequest = async (req, res) => {
  console.log('[APPROVE CONTROLLER] HIT - id:', req.params.id);
  try {
    const { id } = req.params;
    const managerId = req.user.id;
    console.log('[APPROVE] Manager:', managerId);

    const request = await AttendanceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Yêu cầu không tồn tại.'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu đã được xử lý.'
      });
    }

    const now = new Date();
    const requestDate = new Date(request.requestTime);
    const requestDateStart = new Date(requestDate.getFullYear(), requestDate.getMonth(), requestDate.getDate());

    if (request.type === 'checkin') {
      console.log('[APPROVE] type=checkin - creating new attendance');
      
      // Always create a new attendance record for each approved check-in
      const shift = getShiftName(requestDate.getHours());
      const status = getStatus(requestDate);

      // Create new attendance record
      console.log('[APPROVE] Creating attendance record for:', request.employee);
      await Attendance.create({
        user: request.employee,
        date: requestDateStart,
        checkIn: request.requestTime,
        status,
        shift,
        location: request.location
      });
      console.log('[APPROVE] Attendance record created successfully');

      // Update Payroll immediately
      const checkInTimeStr = new Date(request.requestTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      await updatePayrollAttendance(request.employee, requestDate.toISOString().split('T')[0], checkInTimeStr, null, 0, status);

    } else if (request.type === 'checkout') {
      console.log('[APPROVE] type=checkout - finding active attendance');
      
      // Find the last attendance record that hasn't been checked out yet
      // This allows multiple check-in/out pairs per day for the same employee
      const attendance = await Attendance.findOne({
        user: request.employee,
        checkOut: null
      }).sort({ checkIn: -1 });
      
      // Check if there's an approved check-in request (any pending one before this checkout)
      const existingCheckinRequest = await AttendanceRequest.findOne({
        employee: request.employee,
        type: 'checkin',
        requestTime: { $lte: request.requestTime },
        status: 'approved'
      }).sort({ requestTime: -1 });
      
      console.log('[APPROVE] attendance record:', attendance ? attendance._id : 'null');
      console.log('[APPROVE] approved check-in request:', existingCheckinRequest ? existingCheckinRequest._id : 'null');

      // Only allow checkout if there's a check-in
      if (!attendance && !existingCheckinRequest) {
        return res.status(400).json({
          success: false,
          message: 'Chưa có lệnh check-in. Vui lòng check-in trước.'
        });
      }
      
      // If we have an attendance record, update it with checkout
      if (attendance && !attendance.checkOut) {
        attendance.checkOut = request.requestTime;

        // Force workingHours calculation before save
        const checkInTime = new Date(attendance.checkIn);
        const checkOutTime = new Date(attendance.checkOut);
        const hours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
        attendance.workingHours = Math.round(hours * 100) / 100;
        console.log('[APPROVE] Working hours calculated:', attendance.workingHours, 'hours from', checkInTime.toISOString(), 'to', checkOutTime.toISOString());

        await attendance.save();
        console.log('[APPROVE] Attendance saved with workingHours:', attendance.workingHours);

        // Update Payroll with actual hours from Attendance
        await updatePayrollAttendance(
          request.employee,
          requestDate.toISOString().split('T')[0],
          attendance.checkIn.toISOString(), // Pass ISO string for accurate calculation
          attendance.checkOut.toISOString(),
          attendance.workingHours,
          attendance.status
        );
      } else {
        console.log('[APPROVE] No active check-in found, skipping attendance update');
      }
    } else {
      console.log('[APPROVE] Unknown request type:', request.type);
    }
    
    console.log('[APPROVE] START - id:', id, 'managerId:', managerId, 'status:', request.status);
    const updated = await AttendanceRequest.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        reviewedBy: managerId,
        reviewedAt: now
      },
      { new: true }
    ).populate('employee', 'name email').populate('reviewedBy', 'name');
    console.log('[APPROVE] AFTER UPDATE - updated:', updated ? { _id: updated._id, status: updated.status } : 'NULL');

    if (!updated) {
      console.error('[APPROVE] FAIL - document not found after update');
      return res.status(404).json({
        success: false,
        message: 'Yêu cầu không tồn tại.'
      });
    }

    // Verify the update actually worked
    const verify = await AttendanceRequest.findById(id).select('status reviewedBy reviewedAt');
    console.log('[APPROVE] VERIFY DB - status:', verify?.status, 'reviewedBy:', verify?.reviewedBy);

    const employeeUser = await User.findById(request.employee).select('name');

    // Notify employee
    await Notification.create({
      recipientId: request.employee.toString(),
      recipientName: employeeUser?.name || 'Nhân viên',
      type: 'general',
      title: 'Yêu cầu chấm công được duyệt',
      message: `Yêu cầu ${request.type === 'checkin' ? 'check-in' : 'check-out'} của bạn đã được duyệt.`,
      data: {
        requestId: request._id.toString(),
        requestStatus: 'approved',
        requestType: request.type
      },
      priority: 'normal'
    });

    // Broadcast storage event to notify other tabs/windows
    // The frontend will listen for this and refresh attendance status
    console.log('[APPROVE] Broadcasting attendance update notification');

    return res.json({
      success: true,
      message: 'Yêu cầu đã được duyệt.',
      data: updated
    });
  } catch (error) {
    console.error('[APPROVE ERROR]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra khi duyệt yêu cầu.'
    });
  }
};

// PATCH /api/v1/attendance-requests/:id/reject - Manager rejects request
export const rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const managerId = req.user.id;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Lý do từ chối là bắt buộc.'
      });
    }

    const request = await AttendanceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Yêu cầu không tồn tại.'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu đã được xử lý.'
      });
    }

    const now = new Date();

    // Update request status directly with findByIdAndUpdate
    const updated = await AttendanceRequest.findByIdAndUpdate(
      id,
      {
        status: 'rejected',
        reviewedBy: managerId,
        reviewedAt: now,
        rejectionReason: reason.trim()
      },
      { new: true }
    ).populate('employee', 'name email').populate('reviewedBy', 'name');

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Yêu cầu không tồn tại.'
      });
    }

    const employeeUser = await User.findById(request.employee).select('name');

    // Notify employee
    await Notification.create({
      recipientId: request.employee.toString(),
      recipientName: employeeUser?.name || 'Nhân viên',
      type: 'general',
      title: 'Yêu cầu chấm công bị từ chối',
      message: `Yêu cầu ${request.type === 'checkin' ? 'check-in' : 'check-out'} của bạn đã bị từ chối. Lý do: ${reason}`,
      data: {
        requestId: request._id.toString(),
        requestStatus: 'rejected',
        requestType: request.type,
        rejectionReason: reason.trim()
      },
      priority: 'high'
    });

    return res.json({
      success: true,
      message: 'Yêu cầu đã bị từ chối.',
      data: updated
    });
  } catch (error) {
    console.error('[REJECT REQUEST ERROR]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Có lỗi xảy ra.'
    });
  }
};
