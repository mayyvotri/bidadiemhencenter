import ShiftAssignment from '../models/ShiftAssignment.js';
import Shift from '../models/Shift.js';
import User from '../models/User.js';

export const getCoverageStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate, shiftId } = req.query;
    const query = {};

    if (shiftId) query.shift = shiftId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const assignments = await ShiftAssignment.find(query)
      .populate('shift')
      .populate('user', 'name position');

    const shifts = await Shift.find({ isActive: true });
    const users = await User.find({ role: 'employee' });

    const statistics = {
      totalShifts: shifts.length,
      totalEmployees: users.length,
      totalAssignments: assignments.length,
      assignmentsByShift: {},
      assignmentsByEmployee: {},
      assignmentsByDate: {},
      coverageByShift: {}
    };

    // Calculate assignments by shift
    shifts.forEach(shift => {
      const shiftAssignments = assignments.filter(a => a.shift?._id.toString() === shift._id.toString());
      statistics.assignmentsByShift[shift._id] = {
        shiftName: shift.name,
        count: shiftAssignments.length,
        maxEmployees: shift.maxEmployees,
        utilization: shift.maxEmployees ? ((shiftAssignments.length / shift.maxEmployees) * 100).toFixed(2) : null
      };
    });

    // Calculate assignments by employee
    users.forEach(user => {
      const userAssignments = assignments.filter(a => a.user?._id.toString() === user._id.toString());
      statistics.assignmentsByEmployee[user._id] = {
        userName: user.name,
        position: user.position,
        count: userAssignments.length
      };
    });

    // Calculate assignments by date
    assignments.forEach(assignment => {
      const dateKey = assignment.date.toISOString().split('T')[0];
      if (!statistics.assignmentsByDate[dateKey]) {
        statistics.assignmentsByDate[dateKey] = 0;
      }
      statistics.assignmentsByDate[dateKey]++;
    });

    // Calculate coverage by shift
    shifts.forEach(shift => {
      const shiftAssignments = assignments.filter(a => a.shift?._id.toString() === shift._id.toString());
      const uniqueDates = [...new Set(shiftAssignments.map(a => a.date.toISOString().split('T')[0]))];
      statistics.coverageByShift[shift._id] = {
        shiftName: shift.name,
        daysCovered: uniqueDates.length,
        totalAssignments: shiftAssignments.length
      };
    });

    return res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

export const getWeeklyCoverage = async (req, res, next) => {
  try {
    const { startDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const assignments = await ShiftAssignment.find({
      date: {
        $gte: start,
        $lt: end
      }
    })
      .populate('shift')
      .populate('user', 'name position');

    const weeklyData = [];
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + i);
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayAssignments = assignments.filter(a => a.date.toISOString().split('T')[0] === dateKey);

      weeklyData.push({
        date: dateKey,
        dayName: dayNames[currentDate.getDay()],
        assignments: dayAssignments.length,
        details: dayAssignments.map(a => ({
          employee: a.user?.name,
          position: a.user?.position,
          shift: a.shift?.name,
          time: `${a.shift?.startTime} - ${a.shift?.endTime}`
        }))
      });
    }

    return res.status(200).json({
      success: true,
      data: weeklyData
    });
  } catch (error) {
    next(error);
  }
};

export const getMonthlyCoverage = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();

    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 0);

    const assignments = await ShiftAssignment.find({
      date: {
        $gte: start,
        $lte: end
      }
    })
      .populate('shift')
      .populate('user', 'name position');

    const shifts = await Shift.find({ isActive: true });
    const monthlyData = [];

    for (let day = 1; day <= end.getDate(); day++) {
      const currentDate = new Date(targetYear, targetMonth, day);
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayAssignments = assignments.filter(a => a.date.toISOString().split('T')[0] === dateKey);

      const shiftCoverage = {};
      shifts.forEach(shift => {
        const shiftAssignments = dayAssignments.filter(a => a.shift?._id.toString() === shift._id.toString());
        shiftCoverage[shift._id] = {
          shiftName: shift.name,
          assigned: shiftAssignments.length,
          max: shift.maxEmployees,
          color: shift.color
        };
      });

      monthlyData.push({
        date: dateKey,
        day: currentDate.getDay(),
        totalAssignments: dayAssignments.length,
        shiftCoverage
      });
    }

    return res.status(200).json({
      success: true,
      data: monthlyData,
      summary: {
        totalDays: end.getDate(),
        totalAssignments: assignments.length,
        averagePerDay: (assignments.length / end.getDate()).toFixed(2)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUnderstaffedShifts = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const dateKey = targetDate.toISOString().split('T')[0];

    const shifts = await Shift.find({ isActive: true });
    const assignments = await ShiftAssignment.find({
      date: new Date(dateKey)
    }).populate('shift');

    const understaffed = [];

    shifts.forEach(shift => {
      const shiftAssignments = assignments.filter(a => a.shift?._id.toString() === shift._id.toString());
      if (shift.maxEmployees && shiftAssignments.length < shift.maxEmployees) {
        understaffed.push({
          shift: {
            id: shift._id,
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            maxEmployees: shift.maxEmployees,
            color: shift.color
          },
          assigned: shiftAssignments.length,
          needed: shift.maxEmployees - shiftAssignments.length,
          gap: shift.maxEmployees - shiftAssignments.length
        });
      }
    });

    return res.status(200).json({
      success: true,
      data: understaffed,
      count: understaffed.length
    });
  } catch (error) {
    next(error);
  }
};
