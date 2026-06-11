import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import GPSVerificationLog from '../models/GPSVerificationLog.js';
import SystemSettings from '../models/SystemSettings.js';
import { verifyLocation } from '../utils/gpsUtils.js';

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

export const checkIn = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const { latitude, longitude, accuracy } = req.body;

    // Find the last attendance record that hasn't been checked out yet
    // This allows multiple check-in/out pairs per day
    const existingAttendance = await Attendance.findOne({
      user: userId,
      checkOut: null
    }).sort({ checkIn: -1 });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa check-out ca trước. Vui lòng check-out trước khi check-in lại.'
      });
    }

    let gpsVerified = true;
    let gpsDistance = 0;
    let gpsMessage = '';

    if (latitude && longitude) {
      const settings = await SystemSettings.getSettings();

      if (settings.gpsVerificationEnabled) {
        const verification = verifyLocation(
          { latitude, longitude },
          settings.location,
          settings.allowedRadius
        );

        gpsDistance = verification.distance;

        if (!verification.withinRadius) {
          gpsVerified = false;
          gpsMessage = `Bạn đang ở cách địa điểm làm việc ${verification.distance.toFixed(0)}m. Bán kính cho phép là ${settings.allowedRadius}m.`;

          await GPSVerificationLog.create({
            user: userId,
            verificationType: 'checkin',
            success: false,
            employeeLocation: { latitude, longitude, accuracy },
            businessLocation: settings.location,
            distance: verification.distance,
            allowedRadius: settings.allowedRadius,
            errorMessage: gpsMessage,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          });

          return res.status(403).json({
            success: false,
            message: gpsMessage,
            data: {
              distance: verification.distance,
              allowedRadius: settings.allowedRadius
            }
          });
        }

        await GPSVerificationLog.create({
          user: userId,
          verificationType: 'checkin',
          success: true,
          employeeLocation: { latitude, longitude, accuracy },
          businessLocation: settings.location,
          distance: verification.distance,
          allowedRadius: settings.allowedRadius,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      }
    }

    const shift = getShiftName(now.getHours());
    const status = getStatus(now);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const attendance = await Attendance.create({
      user: userId,
      date: todayStart,
      checkIn: now,
      status,
      location: { latitude, longitude }
    });

    const user = await User.findById(userId).select('name email');

    return res.status(201).json({
      success: true,
      message: gpsVerified ? 'Check-in thành công' : 'Check-in thành công (GPS không được xác thực)',
      data: {
        id: attendance._id,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        workingHours: attendance.workingHours,
        status: attendance.status,
        shift,
        user,
        gpsVerified,
        gpsDistance
      }
    });
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const { latitude, longitude, accuracy } = req.body;

    // Find the last attendance record that hasn't been checked out yet
    // This allows multiple check-in/out pairs per day
    const attendance = await Attendance.findOne({
      user: userId,
      checkOut: null
    }).sort({ checkIn: -1 });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa check-in. Vui lòng check-in trước khi check-out.'
      });
    }

    let gpsVerified = true;
    let gpsDistance = 0;
    let gpsMessage = '';

    if (latitude && longitude) {
      const settings = await SystemSettings.getSettings();

      if (settings.gpsVerificationEnabled) {
        const verification = verifyLocation(
          { latitude, longitude },
          settings.location,
          settings.allowedRadius
        );

        gpsDistance = verification.distance;

        if (!verification.withinRadius) {
          gpsVerified = false;
          gpsMessage = `Bạn đang ở cách địa điểm làm việc ${verification.distance.toFixed(0)}m. Bán kính cho phép là ${settings.allowedRadius}m.`;

          await GPSVerificationLog.create({
            user: userId,
            verificationType: 'checkout',
            success: false,
            employeeLocation: { latitude, longitude, accuracy },
            businessLocation: settings.location,
            distance: verification.distance,
            allowedRadius: settings.allowedRadius,
            errorMessage: gpsMessage,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          });

          return res.status(403).json({
            success: false,
            message: gpsMessage,
            data: {
              distance: verification.distance,
              allowedRadius: settings.allowedRadius
            }
          });
        }

        await GPSVerificationLog.create({
          user: userId,
          verificationType: 'checkout',
          success: true,
          employeeLocation: { latitude, longitude, accuracy },
          businessLocation: settings.location,
          distance: verification.distance,
          allowedRadius: settings.allowedRadius,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      }
    }

    attendance.checkOut = now;
    attendance.location = { latitude, longitude };
    await attendance.save();

    const user = await User.findById(userId).select('name email');

    return res.status(200).json({
      success: true,
      message: gpsVerified ? 'Check-out thành công' : 'Check-out thành công (GPS không được xác thực)',
      data: {
        id: attendance._id,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        workingHours: attendance.workingHours,
        status: attendance.status,
        user,
        gpsVerified,
        gpsDistance
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getLogs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, limit = 30 } = req.query;

    const query = { user: userId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const logs = await Attendance.find(query)
      .populate('user', 'name email')
      .sort({ date: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      user: userId,
      date: { $gte: todayStart, $lt: tomorrow },
      checkOut: null
    })
      .sort({ checkIn: -1 })
      .populate('user', 'name email');

    if (!attendance) {
      return res.status(200).json({
        success: true,
        active: false,
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      active: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

export const getAllAttendance = async (req, res, next) => {
  try {
    const { startDate, endDate, userId, status, limit = 100 } = req.query;

    const query = {};

    if (userId) query.user = userId;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const logs = await Attendance.find(query)
      .populate('user', 'name email phone role position')
      .sort({ date: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    next(error);
  }
};

export const updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, notes } = req.body;

    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bản ghi điểm danh'
      });
    }

    if (checkIn) attendance.checkIn = new Date(checkIn);
    if (checkOut) attendance.checkOut = new Date(checkOut);
    if (notes !== undefined) attendance.notes = notes;
    attendance.editedBy = req.user.id;
    attendance.editedAt = new Date();

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật điểm danh thành công',
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

export const getStatistics = async (req, res, next) => {
  try {
    const { userId, month, year } = req.query;

    const query = {};

    if (userId) query.user = userId;

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendances = await Attendance.find(query)
      .populate('user', 'name email role position');

    const statistics = {
      totalDays: attendances.length,
      totalWorkingHours: attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0),
      onTime: attendances.filter(a => a.status === 'on_time').length,
      late: attendances.filter(a => a.status === 'late').length,
      earlyLeave: attendances.filter(a => a.status === 'early_leave').length,
      absent: attendances.filter(a => a.status === 'absent').length,
      averageWorkingHours: attendances.length > 0
        ? (attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0) / attendances.length).toFixed(2)
        : 0
    };

    return res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeStatistics = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0);

    const attendances = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('user', 'name email role position');

    const employeeStats = {};

    attendances.forEach(att => {
      if (!employeeStats[att.user._id]) {
        employeeStats[att.user._id] = {
          user: att.user,
          totalDays: 0,
          totalWorkingHours: 0,
          onTime: 0,
          late: 0,
          earlyLeave: 0,
          absent: 0
        };
      }

      employeeStats[att.user._id].totalDays++;
      employeeStats[att.user._id].totalWorkingHours += att.workingHours || 0;

      if (att.status === 'on_time') employeeStats[att.user._id].onTime++;
      else if (att.status === 'late') employeeStats[att.user._id].late++;
      else if (att.status === 'early_leave') employeeStats[att.user._id].earlyLeave++;
      else if (att.status === 'absent') employeeStats[att.user._id].absent++;
    });

    const statsArray = Object.values(employeeStats).map(stat => ({
      ...stat,
      averageWorkingHours: stat.totalDays > 0 ? (stat.totalWorkingHours / stat.totalDays).toFixed(2) : 0
    }));

    return res.status(200).json({
      success: true,
      data: statsArray,
      count: statsArray.length
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/attendance/today-status - Get today's attendance status
export const getTodayStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all attendance records for today (to support multiple check-in/out pairs)
    const attendances = await Attendance.find({
      user: userId,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ checkIn: 1 });

    // Find the latest open session for today and the latest record overall
    const activeSession = await Attendance.findOne({
      user: userId,
      date: { $gte: today, $lt: tomorrow },
      checkOut: null
    }).sort({ checkIn: -1 });

    const lastRecord = attendances.length > 0 ? attendances[attendances.length - 1] : null;
    const hasActiveSession = Boolean(activeSession);

    // Calculate total hours worked today from completed sessions
    let totalHoursToday = 0;
    let sessionsCount = 0;
    attendances.forEach(a => {
      if (a.workingHours && a.workingHours > 0) {
        totalHoursToday += a.workingHours;
        sessionsCount++;
      }
    });

    return res.status(200).json({
      success: true,
      isClockedIn: hasActiveSession,
      hasCheckedIn: attendances.length > 0,
      hasCheckedOut: attendances.some(a => a.checkOut),
      checkInTime: activeSession ? activeSession.checkIn : (lastRecord ? lastRecord.checkIn : null),
      checkOutTime: activeSession ? null : (lastRecord ? lastRecord.checkOut : null),
      activeSession,
      totalSessionsToday: attendances.length,
      totalHoursToday: Math.round(totalHoursToday * 100) / 100,
      attendances: attendances
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/attendance/my-history - Get my attendance history (for staff salary page)
export const getMyAttendanceHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    let dateQuery = {};
    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
      dateQuery = { date: { $gte: startDate, $lte: endDate } };
    } else {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      dateQuery = { date: { $gte: startDate, $lte: endDate } };
    }

    const records = await Attendance.find({
      user: userId,
      ...dateQuery
    }).sort({ date: 1 });

    // Calculate summary (recalculate hours from times if needed)
    let totalHours = 0;
    let totalDays = 0;
    let lateCount = 0;
    let overtimeHours = 0;
    const REGULAR_DAY_HOURS = 8;

    records.forEach(r => {
      // Calculate hours from times if workingHours is 0
      let hours = r.workingHours || 0;
      if ((hours === 0) && r.checkIn && r.checkOut) {
        const checkInTime = new Date(r.checkIn);
        const checkOutTime = new Date(r.checkOut);
        if (checkOutTime > checkInTime) {
          hours = Math.round((checkOutTime - checkInTime) / (1000 * 60 * 60) * 100) / 100;
        }
      }

      if (r.status !== 'absent') {
        totalHours += hours;
        totalDays++;
      }
      if (r.status === 'late') lateCount++;
      if (hours > REGULAR_DAY_HOURS) {
        overtimeHours += hours - REGULAR_DAY_HOURS;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        month: month ? Number(month) : new Date().getMonth() + 1,
        year: year ? Number(year) : new Date().getFullYear(),
        records: records.map(r => {
          // Calculate hours from times if not set
          let hours = r.workingHours || 0;
          if ((hours === 0) && r.checkIn && r.checkOut) {
            const checkInTime = new Date(r.checkIn);
            const checkOutTime = new Date(r.checkOut);
            if (checkOutTime > checkInTime) {
              hours = Math.round((checkOutTime - checkInTime) / (1000 * 60 * 60) * 100) / 100;
            }
          }
          return {
            _id: r._id,
            date: r.date,
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            hours,
            status: r.status,
            shift: r.shift
          };
        }),
        summary: {
          totalDaysWorked: totalDays,
          totalHoursWorked: Math.round(totalHours * 100) / 100,
          lateCount,
          overtimeHours: Math.round(overtimeHours * 100) / 100
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
