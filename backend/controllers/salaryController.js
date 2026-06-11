import Payroll from '../models/Payroll.js';
import WageConfig from '../models/WageConfig.js';
import Attendance from '../models/Attendance.js';
import Staff from '../models/Staff.js';

const STANDARD_HOURS_PER_MONTH = 176;
const REGULAR_DAY_HOURS = 8;

const isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
};

const isNightShift = (checkInHour) => {
  return checkInHour >= 22 || checkInHour < 6;
};

const formatDateStr = (date) => {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

// ─── Wage Config ────────────────────────────────────────────────────────────────

export const getWageConfigs = async (req, res, next) => {
  try {
    const configs = await WageConfig.find().sort({ staffName: 1 });
    res.json({ success: true, data: configs });
  } catch (error) {
    next(error);
  }
};

export const getWageConfig = async (req, res, next) => {
  try {
    const config = await WageConfig.findOne({ staffId: req.params.staffId });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cấu hình lương.' });
    }
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};

export const setWageConfig = async (req, res, next) => {
  try {
    const { staffId, staffName, dept, baseWage, overtimeRate, nightShiftRate, weekendRate, holidayRate, allowances } = req.body;

    if (!staffId || !staffName || !dept || baseWage == null) {
      return res.status(400).json({ success: false, message: 'Thông tin bắt buộc bị thiếu.' });
    }

    let config = await WageConfig.findOne({ staffId });
    const data = {
      staffId, staffName, dept,
      baseWage: Number(baseWage),
      overtimeRate: Number(overtimeRate) || 1.5,
      nightShiftRate: Number(nightShiftRate) || 1.3,
      weekendRate: Number(weekendRate) || 1.5,
      holidayRate: Number(holidayRate) || 2.0,
      allowances: Number(allowances) || 0,
      effectiveFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      updatedBy: req.user.id,
      updatedByName: req.user.name
    };

    if (config) {
      config.effectiveTo = new Date();
      await config.save();
    }

    config = await WageConfig.create({ ...data, effectiveTo: null });
    res.status(201).json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};

export const bulkSetWages = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền.' });
    }
    const { wages } = req.body;
    if (!Array.isArray(wages)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ.' });
    }
    const results = [];
    for (const w of wages) {
      if (!w.staffId || !w.staffName || w.baseWage == null) continue;
      let config = await WageConfig.findOne({ staffId: w.staffId });
      if (config) {
        config.effectiveTo = new Date();
        await config.save();
      }
      config = await WageConfig.create({
        staffId: w.staffId,
        staffName: w.staffName,
        dept: w.dept || 'Phục vụ',
        baseWage: Number(w.baseWage),
        overtimeRate: Number(w.overtimeRate) || 1.5,
        nightShiftRate: Number(w.nightShiftRate) || 1.3,
        weekendRate: Number(w.weekendRate) || 1.5,
        holidayRate: Number(w.holidayRate) || 2.0,
        allowances: Number(w.allowances) || 0,
        effectiveFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        effectiveTo: null,
        updatedBy: req.user.id,
        updatedByName: req.user.name
      });
      results.push(config);
    }
    res.status(201).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

// ─── Payroll Calculation ───────────────────────────────────────────────────────

export const calculatePayroll = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền tính lương.' });
    }

    const { month, year } = req.params;

    const staffList = await Staff.find({ status: 'Đang làm' });
    const results = [];

    for (const staff of staffList) {
      const wageConfig = await WageConfig.findOne({ staffId: staff.id });
      if (!wageConfig) continue;

      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);

      const attendanceRecords = await Attendance.find({
        user: staff.id,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });

      let totalHours = 0, regularHours = 0, overtimeHours = 0;
      let nightShiftHours = 0, weekendHours = 0, holidayHours = 0;
      let totalDays = 0, lateCount = 0, absentDays = 0;
      const attendanceDetails = [];

      for (const record of attendanceRecords) {
        const hours = record.workingHours || 0;
        const checkInHour = record.checkIn ? new Date(record.checkIn).getHours() : 8;
        const dateStr = formatDateStr(record.date);
        const dayOfWeek = new Date(record.date).getDay();
        const isHoliday = false;

        attendanceDetails.push({
          date: dateStr,
          checkIn: formatTime(record.checkIn),
          checkOut: formatTime(record.checkOut),
          hours,
          status: record.status
        });

        if (record.status === 'absent') {
          absentDays++;
          continue;
        }

        totalDays++;
        totalHours += hours;

        if (isHoliday) {
          holidayHours += hours;
        } else if (isWeekend(record.date)) {
          weekendHours += hours;
        } else {
          regularHours += hours;
        }

        if (hours > REGULAR_DAY_HOURS) {
          overtimeHours += hours - REGULAR_DAY_HOURS;
        }

        if (isNightShift(checkInHour)) {
          nightShiftHours += hours;
        }

        if (record.status === 'late') lateCount++;
      }

      const wagePerHour = wageConfig.baseWage / STANDARD_HOURS_PER_MONTH;
      const baseSalary = Math.round(regularHours * wagePerHour * 100) / 100;
      const overtimePay = Math.round(overtimeHours * wagePerHour * (wageConfig.overtimeRate - 1) * 100) / 100;
      const nightPay = Math.round(nightShiftHours * wagePerHour * (wageConfig.nightShiftRate - 1) * 100) / 100;
      const weekendPay = Math.round(weekendHours * wagePerHour * (wageConfig.weekendRate - 1) * 100) / 100;
      const holidayPay = Math.round(holidayHours * wagePerHour * (wageConfig.holidayRate - 1) * 100) / 100;
      const grossSalary = Math.round((baseSalary + overtimePay + nightPay + weekendPay + holidayPay + wageConfig.allowances) * 100) / 100;

      let payroll = await Payroll.findOne({ staffId: staff.id, month: Number(month), year: Number(year) });

      if (payroll) {
        Object.assign(payroll, {
          totalHoursWorked: Math.round(totalHours * 100) / 100,
          regularHours: Math.round(regularHours * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          nightShiftHours: Math.round(nightShiftHours * 100) / 100,
          weekendHours: Math.round(weekendHours * 100) / 100,
          holidayHours: Math.round(holidayHours * 100) / 100,
          totalDaysWorked: totalDays,
          lateCount,
          absentDays,
          baseWage: wageConfig.baseWage,
          overtimeRate: wageConfig.overtimeRate,
          nightShiftRate: wageConfig.nightShiftRate,
          weekendRate: wageConfig.weekendRate,
          holidayRate: wageConfig.holidayRate,
          allowances: wageConfig.allowances,
          baseSalary,
          overtimePay,
          nightShiftPay: nightPay,
          weekendPay,
          holidayPay,
          grossSalary,
          netSalary: grossSalary,
          attendanceDetails,
          status: 'calculated',
          calculatedBy: req.user.id,
          calculatedAt: new Date()
        });
        await payroll.save();
      } else {
        payroll = await Payroll.create({
          staffId: staff.id,
          staffName: staff.name,
          dept: staff.dept,
          month: Number(month),
          year: Number(year),
          baseWage: wageConfig.baseWage,
          totalHoursWorked: Math.round(totalHours * 100) / 100,
          regularHours: Math.round(regularHours * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          nightShiftHours: Math.round(nightShiftHours * 100) / 100,
          weekendHours: Math.round(weekendHours * 100) / 100,
          holidayHours: Math.round(holidayHours * 100) / 100,
          totalDaysWorked: totalDays,
          lateCount,
          absentDays,
          overtimeRate: wageConfig.overtimeRate,
          nightShiftRate: wageConfig.nightShiftRate,
          weekendRate: wageConfig.weekendRate,
          holidayRate: wageConfig.holidayRate,
          allowances: wageConfig.allowances,
          baseSalary,
          overtimePay,
          nightShiftPay: nightPay,
          weekendPay,
          holidayPay,
          grossSalary,
          netSalary: grossSalary,
          attendanceDetails,
          adjustments: [],
          adjustmentTotal: 0,
          deductions: 0,
          status: 'calculated',
          calculatedBy: req.user.id,
          calculatedAt: new Date()
        });
      }

      results.push(payroll);
    }

    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    next(error);
  }
};

// ─── Payroll CRUD ──────────────────────────────────────────────────────────────

export const getPayroll = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    let query = {};
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    if (!req.user.isAdmin) {
      query.staffId = req.user.id;
    }

    const payrolls = await Payroll.find(query)
      .sort({ year: -1, month: -1, staffName: 1 });

    res.json({ success: true, data: payrolls });
  } catch (error) {
    next(error);
  }
};

export const getPayrollByStaff = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const { month, year } = req.query;

    if (!req.user.isAdmin && req.user.id !== staffId) {
      return res.status(403).json({ success: false, message: 'Không có quyền xem lương của người khác.' });
    }

    let query = { staffId };
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    const payrolls = await Payroll.find(query)
      .sort({ year: -1, month: -1 });

    res.json({ success: true, data: payrolls });
  } catch (error) {
    next(error);
  }
};

export const getPayrollDetail = async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bảng lương.' });
    }
    if (!req.user.isAdmin && payroll.staffId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Không có quyền.' });
    }
    res.json({ success: true, data: payroll });
  } catch (error) {
    next(error);
  }
};

export const adjustPayroll = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền điều chỉnh.' });
    }

    const { id } = req.params;
    const { reason, amount, type } = req.body;

    if (!reason || amount == null) {
      return res.status(400).json({ success: false, message: 'Lý do và số tiền là bắt buộc.' });
    }

    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bảng lương.' });
    }

    if (payroll.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Không thể điều chỉnh bảng lương đã thanh toán.' });
    }

    payroll.adjustments.push({
      reason,
      amount: Number(amount),
      type: type === 'deduction' ? 'deduction' : 'bonus',
      addedBy: req.user.id,
      addedByName: req.user.name,
      createdAt: new Date()
    });

    const adjTotal = payroll.adjustments.reduce((sum, a) => {
      return sum + (a.type === 'deduction' ? -Math.abs(a.amount) : Math.abs(a.amount));
    }, 0);
    payroll.adjustmentTotal = Math.round(adjTotal * 100) / 100;
    payroll.netSalary = Math.round((payroll.grossSalary + payroll.adjustmentTotal - payroll.deductions) * 100) / 100;

    await payroll.save();
    res.json({ success: true, data: payroll });
  } catch (error) {
    next(error);
  }
};

export const removeAdjustment = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền.' });
    }
    const { id, adjId } = req.params;
    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy.' });
    }
    payroll.adjustments = payroll.adjustments.filter(a => a._id?.toString() !== adjId);
    const adjTotal = payroll.adjustments.reduce((sum, a) => {
      return sum + (a.type === 'deduction' ? -Math.abs(a.amount) : Math.abs(a.amount));
    }, 0);
    payroll.adjustmentTotal = Math.round(adjTotal * 100) / 100;
    payroll.netSalary = Math.round((payroll.grossSalary + payroll.adjustmentTotal - payroll.deductions) * 100) / 100;
    await payroll.save();
    res.json({ success: true, data: payroll });
  } catch (error) {
    next(error);
  }
};

export const updatePayrollStatus = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền.' });
    }
    const { id } = req.params;
    const { status } = req.body;
    const payroll = await Payroll.findById(id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy.' });
    }
    payroll.status = status;
    if (status === 'approved') {
      payroll.approvedBy = req.user.id;
      payroll.approvedAt = new Date();
    }
    await payroll.save();
    res.json({ success: true, data: payroll });
  } catch (error) {
    next(error);
  }
};

// ─── Reports ──────────────────────────────────────────────────────────────────

export const getPayrollReport = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền xem báo cáo.' });
    }

    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month và year là bắt buộc.' });
    }

    const payrolls = await Payroll.find({
      month: Number(month),
      year: Number(year)
    }).sort({ dept: 1, staffName: 1 });

    const totalGross = payrolls.reduce((s, p) => s + (p.grossSalary || 0), 0);
    const totalNet = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0);
    const totalOvertime = payrolls.reduce((s, p) => s + (p.overtimePay || 0), 0);
    const totalAllowances = payrolls.reduce((s, p) => s + (p.allowances || 0), 0);
    const totalAdjustments = payrolls.reduce((s, p) => s + (p.adjustmentTotal || 0), 0);
    const totalHours = payrolls.reduce((s, p) => s + (p.totalHoursWorked || 0), 0);

    const byDept = {};
    for (const p of payrolls) {
      if (!byDept[p.dept]) byDept[p.dept] = { count: 0, gross: 0, net: 0, hours: 0 };
      byDept[p.dept].count++;
      byDept[p.dept].gross += p.grossSalary || 0;
      byDept[p.dept].net += p.netSalary || 0;
      byDept[p.dept].hours += p.totalHoursWorked || 0;
    }

    res.json({
      success: true,
      data: {
        payrolls,
        summary: {
          totalEmployees: payrolls.length,
          totalGross,
          totalNet: Math.round(totalNet * 100) / 100,
          totalOvertime,
          totalAllowances,
          totalAdjustments: Math.round(totalAdjustments * 100) / 100,
          totalHours: Math.round(totalHours * 100) / 100,
          avgSalary: payrolls.length > 0 ? Math.round((totalNet / payrolls.length) * 100) / 100 : 0
        },
        byDept
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPayrollStats = async (req, res, next) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let query = { month: currentMonth, year: currentYear };
    if (!req.user.isAdmin) query.staffId = req.user.id;

    const payrolls = await Payroll.find(query);
    const [totalDraft, totalCalculated, totalApproved, totalPaid] = await Promise.all([
      Payroll.countDocuments({ ...query, status: 'draft' }),
      Payroll.countDocuments({ ...query, status: 'calculated' }),
      Payroll.countDocuments({ ...query, status: 'approved' }),
      Payroll.countDocuments({ ...query, status: 'paid' })
    ]);

    const totalNet = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0);
    const totalHours = payrolls.reduce((s, p) => s + (p.totalHoursWorked || 0), 0);
    const totalOvertimePay = payrolls.reduce((s, p) => s + (p.overtimePay || 0), 0);

    res.json({
      success: true,
      data: {
        month: currentMonth,
        year: currentYear,
        totalEmployees: payrolls.length,
        totalNet: Math.round(totalNet * 100) / 100,
        totalHours: Math.round(totalHours * 100) / 100,
        totalOvertimePay: Math.round(totalOvertimePay * 100) / 100,
        draft: totalDraft,
        calculated: totalCalculated,
        approved: totalApproved,
        paid: totalPaid
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSalarySummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    let query = {};
    if (!isAdmin) query.staffId = userId;

    const payrolls = await Payroll.find(query)
      .sort({ year: -1, month: -1 })
      .limit(12);

    const totalEarnings = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0);
    const current = payrolls[0];

    res.json({
      success: true,
      salary: current ? {
        netSalary: current.netSalary,
        grossSalary: current.grossSalary,
        month: current.month,
        year: current.year,
        status: current.status,
        baseWage: current.baseWage,
        totalHours: current.totalHoursWorked,
        overtimePay: current.overtimePay,
        allowances: current.allowances
      } : null,
      history: payrolls,
      summary: { totalEarnings: Math.round(totalEarnings * 100) / 100, count: payrolls.length }
    });
  } catch (error) {
    next(error);
  }
};

export const getSalaryHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    let query = {};
    if (!isAdmin) query.staffId = userId;

    const payrolls = await Payroll.find(query)
      .sort({ year: -1, month: -1 })
      .limit(50);

    res.json({ success: true, history: payrolls });
  } catch (error) {
    next(error);
  }
};

// ─── Attendance History for Staff (view as salary) ────────────────────────────

export const getAttendanceHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    // Get wage config for this staff
    const wageConfig = await WageConfig.findOne({ staffId: userId });
    const wagePerHour = wageConfig ? wageConfig.baseWage / STANDARD_HOURS_PER_MONTH : 0;

    // Build query for attendance
    let dateQuery = {};
    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
      dateQuery = { date: { $gte: startDate, $lte: endDate } };
    } else {
      // Default: current month
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      dateQuery = { date: { $gte: startDate, $lte: endDate } };
    }

    // Get attendance records for this user
    const attendanceRecords = await Attendance.find({
      user: userId,
      ...dateQuery
    }).sort({ date: 1 });

    // Calculate summary from attendance (recalculate hours from times if needed)
    let totalHours = 0;
    let totalDays = 0;
    let lateCount = 0;
    let overtimeHours = 0;

    attendanceRecords.forEach(record => {
      // Calculate hours from times if workingHours is not set
      let hours = record.workingHours || 0;
      if ((hours === 0) && record.checkIn && record.checkOut) {
        const checkInTime = new Date(record.checkIn);
        const checkOutTime = new Date(record.checkOut);
        if (checkOutTime > checkInTime) {
          hours = Math.round((checkOutTime - checkInTime) / (1000 * 60 * 60) * 100) / 100;
        }
      }

      if (record.status !== 'absent') {
        totalHours += hours;
        totalDays++;
      }
      if (record.status === 'late') lateCount++;
      if (hours > REGULAR_DAY_HOURS) {
        overtimeHours += hours - REGULAR_DAY_HOURS;
      }
    });

    const baseSalary = Math.round(totalHours * wagePerHour * 100) / 100;
    const overtimePay = Math.round(overtimeHours * wagePerHour * 1.5 * 100) / 100;
    const grossSalary = baseSalary + overtimePay + (wageConfig?.allowances || 0);

    res.json({
      success: true,
      data: {
        month: month ? Number(month) : new Date().getMonth() + 1,
        year: year ? Number(year) : new Date().getFullYear(),
        attendanceRecords: attendanceRecords.map(r => {
          // Calculate hours from check-in/check-out if not set
          let hours = r.workingHours;
          if ((hours == null || hours === 0) && r.checkIn && r.checkOut) {
            const checkInTime = new Date(r.checkIn);
            const checkOutTime = new Date(r.checkOut);
            if (checkOutTime > checkInTime) {
              hours = Math.round((checkOutTime - checkInTime) / (1000 * 60 * 60) * 100) / 100;
            }
          }
          return {
            date: r.date,
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            hours: hours || 0,
            status: r.status,
            shift: r.shift
          };
        }),
        summary: {
          totalDaysWorked: totalDays,
          totalHoursWorked: Math.round(totalHours * 100) / 100,
          lateCount,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          baseWage: wageConfig?.baseWage || 0,
          wagePerHour: Math.round(wagePerHour * 100) / 100,
          baseSalary,
          overtimePay,
          allowances: wageConfig?.allowances || 0,
          grossSalary: Math.round(grossSalary * 100) / 100,
          netSalary: Math.round(grossSalary * 100) / 100
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
