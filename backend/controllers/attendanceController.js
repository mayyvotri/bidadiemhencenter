import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import FaceVerificationLog from '../models/FaceVerificationLog.js';
import GPSVerificationLog from '../models/GPSVerificationLog.js';
import SystemSettings from '../models/SystemSettings.js';
import { verifyLocation } from '../utils/gpsUtils.js';

const getShiftName = (hour) => {
  if (hour >= 6 && hour < 12) return 'Ca sáng';
  if (hour >= 12 && hour < 18) return 'Ca chiều';
  return 'Ca tối';
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
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const { latitude, longitude, accuracy } = req.body;

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      user: userId,
      date: todayStart
    });

    if (existingAttendance && !existingAttendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã check-in hôm nay. Vui lòng check-out trước khi check-in lại.'
      });
    }

    // GPS Verification
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

          // Log failed GPS verification
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

        // Log successful GPS verification
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
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const { latitude, longitude, accuracy } = req.body;

    const attendance = await Attendance.findOne({
      user: userId,
      date: todayStart
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Bạn chưa check-in hôm nay'
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã check-out hôm nay'
      });
    }

    // GPS Verification
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

          // Log failed GPS verification
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

        // Log successful GPS verification
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

    const attendance = await Attendance.findOne({
      user: userId,
      date: todayStart
    }).populate('user', 'name email');

    if (!attendance || attendance.checkOut) {
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

export const checkInWithFace = async (req, res, next) => {
  try {
    const { userId, faceDescriptor, confidence, latitude, longitude, accuracy } = req.body;

    if (!userId || !faceDescriptor || confidence === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin cần thiết'
      });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      user: userId,
      date: todayStart
    });

    if (existingAttendance && !existingAttendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Nhân viên đã check-in hôm nay'
      });
    }

    // GPS Verification
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
          gpsMessage = `Nhân viên đang ở cách địa điểm làm việc ${verification.distance.toFixed(0)}m. Bán kính cho phép là ${settings.allowedRadius}m.`;

          // Log failed GPS verification
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

        // Log successful GPS verification
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
      message: 'Check-in bằng khuôn mặt thành công',
      data: {
        id: attendance._id,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        workingHours: attendance.workingHours,
        status: attendance.status,
        shift,
        user,
        confidence,
        gpsVerified,
        gpsDistance
      }
    });
  } catch (error) {
    next(error);
  }
};

export const checkOutWithFace = async (req, res, next) => {
  try {
    const { userId, faceDescriptor, confidence, latitude, longitude, accuracy } = req.body;

    if (!userId || !faceDescriptor || confidence === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin cần thiết'
      });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const attendance = await Attendance.findOne({
      user: userId,
      date: todayStart
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Nhân viên chưa check-in hôm nay'
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Nhân viên đã check-out hôm nay'
      });
    }

    // GPS Verification
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
          gpsMessage = `Nhân viên đang ở cách địa điểm làm việc ${verification.distance.toFixed(0)}m. Bán kính cho phép là ${settings.allowedRadius}m.`;

          // Log failed GPS verification
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

        // Log successful GPS verification
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
      message: 'Check-out bằng khuôn mặt thành công',
      data: {
        id: attendance._id,
        date: attendance.date,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        workingHours: attendance.workingHours,
        status: attendance.status,
        user,
        confidence,
        gpsVerified,
        gpsDistance
      }
    });
  } catch (error) {
    next(error);
  }
};
