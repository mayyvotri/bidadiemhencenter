import Report from '../models/Report.js';
import Attendance from '../models/Attendance.js';
import Staff from '../models/Staff.js';
import Payroll from '../models/Payroll.js';
import ScheduleGenerator from '../models/ScheduleGenerator.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Task from '../models/Task.js';
import WageConfig from '../models/WageConfig.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'reports');

// ─── Helpers ───────────────────────────────────────────────────────────────────

const parseMonthYear = (month, year) => {
  const m = month !== undefined ? parseInt(month) : new Date().getMonth() + 1;
  const y = year !== undefined ? parseInt(year) : new Date().getFullYear();
  return { month: m, year: y };
};

const getMonthDateRange = (month, year) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

const fmt = (n, decimals = 0) => {
  if (n == null) return '0';
  return Number(n).toLocaleString('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('vi-VN');
};

// ─── Attendance Report ─────────────────────────────────────────────────────────

const generateAttendanceReport = async ({ month, year, dept, staffId }) => {
  const { start, end } = getMonthDateRange(month, year);
  const { month: m, year: y } = parseMonthYear(month, year);
  const periodStr = `Tháng ${m}/${y}`;

  let matchQuery = { date: { $gte: start, $lte: end } };
  if (staffId) matchQuery.user = staffId;

  const attendance = await Attendance.find(matchQuery)
    .populate('user', 'name email role position')
    .sort({ date: 1 });

  const totalDays = new Date(y, m, 0).getDate();
  const workingDays = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(y, m - 1, i + 1);
    const day = d.getDay();
    return { date: d, isWorkday: day !== 0 };
  }).filter(d => d.isWorkday);

  const totalWorkDays = workingDays.length;

  const stats = {
    totalDays,
    workDays: totalWorkDays,
    totalRecords: attendance.length,
    onTime: attendance.filter(a => a.status === 'on_time').length,
    late: attendance.filter(a => a.status === 'late').length,
    earlyLeave: attendance.filter(a => a.status === 'early_leave').length,
    absent: attendance.filter(a => a.status === 'absent').length
  };

  const byStaff = {};
  attendance.forEach(a => {
    const uid = a.user?._id?.toString() || 'unknown';
    if (!byStaff[uid]) {
      byStaff[uid] = {
        staffId: uid,
        name: a.user?.name || 'Unknown',
        role: a.user?.role || '',
        records: [],
        totalHours: 0,
        lateCount: 0,
        onTimeCount: 0,
        absentDays: 0
      };
    }
    byStaff[uid].records.push({
      date: a.date,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      hours: a.workingHours,
      status: a.status,
      notes: a.notes
    });
    byStaff[uid].totalHours += a.workingHours || 0;
    if (a.status === 'late') byStaff[uid].lateCount++;
    if (a.status === 'on_time') byStaff[uid].onTimeCount++;
    if (a.status === 'absent') byStaff[uid].absentDays++;
  });

  const staffList = Object.values(byStaff).map(s => ({
    ...s,
    totalHours: Math.round(s.totalHours * 100) / 100,
    attendanceRate: s.records.length > 0 ? Math.round((s.onTimeCount / Math.max(s.records.length, 1)) * 100) : 0
  }));

  const deptBreakdown = {};
  staffList.forEach(s => {
    const d = s.role || 'Khác';
    if (!deptBreakdown[d]) deptBreakdown[d] = { dept: d, count: 0, totalHours: 0, lateCount: 0 };
    deptBreakdown[d].count++;
    deptBreakdown[d].totalHours += s.totalHours;
    deptBreakdown[d].lateCount += s.lateCount;
  });

  const summary = {
    totalRecords: stats.totalRecords,
    totalHours: Math.round(staffList.reduce((s, st) => s + st.totalHours, 0)),
    avgHoursPerStaff: staffList.length > 0 ? Math.round(staffList.reduce((s, st) => s + st.totalHours, 0) / staffList.length) : 0,
    onTimeRate: stats.totalRecords > 0 ? Math.round((stats.onTime / stats.totalRecords) * 100) : 0,
    lateRate: stats.totalRecords > 0 ? Math.round((stats.late / stats.totalRecords) * 100) : 0,
    attendanceRate: Math.round((stats.totalRecords / (staffList.length * totalWorkDays)) * 100) || 0
  };

  return {
    type: 'attendance',
    title: `Báo cáo chấm công - ${periodStr}`,
    description: `Báo cáo chấm công chi tiết tháng ${m}/${y}`,
    period: periodStr,
    periodStart: start,
    periodEnd: end,
    stats,
    summary,
    byStaff: staffList.sort((a, b) => a.name.localeCompare(b.name)),
    deptBreakdown: Object.values(deptBreakdown),
    workingDays: totalWorkDays,
    chartData: {
      attendanceRate: [
        { name: 'Đúng giờ', value: stats.onTime, color: '#10b981' },
        { name: 'Muộn', value: stats.late, color: '#f59e0b' },
        { name: 'Về sớm', value: stats.earlyLeave, color: '#6366f1' },
        { name: 'Nghỉ', value: stats.absent, color: '#ef4444' }
      ],
      hoursByDept: Object.values(deptBreakdown).map(d => ({
        name: d.dept,
        hours: Math.round(d.totalHours),
        color: ['Quản lý', 'Thu ngân', 'Phục vụ', 'Bảo vệ', 'Vệ sinh', 'Khác'].indexOf(d.dept)
      }))
    }
  };
};

// ─── Payroll Report ─────────────────────────────────────────────────────────────

const generatePayrollReport = async ({ month, year, dept }) => {
  const { month: m, year: y } = parseMonthYear(month, year);
  const periodStr = `Tháng ${m}/${y}`;

  let query = { month: m, year: y };
  if (dept) query.dept = dept;

  const payrolls = await Payroll.find(query)
    .sort({ dept: 1, staffName: 1 });

  const totalGross = payrolls.reduce((s, p) => s + (p.grossSalary || 0), 0);
  const totalNet = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0);
  const totalDeductions = payrolls.reduce((s, p) => s + (p.deductions || 0), 0);
  const totalOvertime = payrolls.reduce((s, p) => s + (p.overtimePay || 0), 0);
  const totalAllowances = payrolls.reduce((s, p) => s + (p.allowances || 0), 0);

  const byDept = {};
  payrolls.forEach(p => {
    const d = p.dept || 'Khác';
    if (!byDept[d]) byDept[d] = { dept: d, count: 0, gross: 0, net: 0, deductions: 0, allowances: 0, overtime: 0, totalHours: 0 };
    byDept[d].count++;
    byDept[d].gross += p.grossSalary || 0;
    byDept[d].net += p.netSalary || 0;
    byDept[d].deductions += p.deductions || 0;
    byDept[d].allowances += p.allowances || 0;
    byDept[d].overtime += p.overtimePay || 0;
    byDept[d].totalHours += p.totalHoursWorked || 0;
  });

  const summary = {
    totalRecords: payrolls.length,
    totalGross,
    totalNet,
    totalDeductions,
    totalOvertime,
    totalAllowances,
    avgNetSalary: payrolls.length > 0 ? Math.round(totalNet / payrolls.length) : 0,
    avgGrossSalary: payrolls.length > 0 ? Math.round(totalGross / payrolls.length) : 0,
    totalHours: payrolls.reduce((s, p) => s + (p.totalHoursWorked || 0), 0),
    totalOvertimeHours: payrolls.reduce((s, p) => s + (p.overtimeHours || 0), 0)
  };

  return {
    type: 'payroll',
    title: `Báo cáo lương - ${periodStr}`,
    description: `Báo cáo lương chi tiết tháng ${m}/${y}`,
    period: periodStr,
    periodStart: new Date(y, m - 1, 1),
    periodEnd: new Date(y, m, 0, 23, 59, 59, 999),
    payrolls: payrolls.map(p => ({
      staffId: p.staffId,
      staffName: p.staffName,
      dept: p.dept,
      baseWage: p.baseWage,
      totalHoursWorked: p.totalHoursWorked,
      regularHours: p.regularHours,
      overtimeHours: p.overtimeHours,
      nightShiftHours: p.nightShiftHours,
      weekendHours: p.weekendHours,
      holidayHours: p.holidayHours,
      lateCount: p.lateCount,
      absentDays: p.absentDays,
      baseSalary: p.baseSalary,
      overtimePay: p.overtimePay,
      nightShiftPay: p.nightShiftPay,
      weekendPay: p.weekendPay,
      holidayPay: p.holidayPay,
      allowances: p.allowances,
      grossSalary: p.grossSalary,
      deductions: p.deductions,
      adjustments: p.adjustments,
      netSalary: p.netSalary,
      status: p.status
    })),
    summary,
    byDept: Object.values(byDept),
    chartData: {
      salaryByDept: Object.values(byDept).map(d => ({ name: d.dept, gross: Math.round(d.gross), net: Math.round(d.net) })),
      topSalaries: payrolls.sort((a, b) => (b.netSalary || 0) - (a.netSalary || 0)).slice(0, 10).map(p => ({
        name: p.staffName,
        net: Math.round(p.netSalary || 0)
      }))
    }
  };
};

// ─── Performance Report ─────────────────────────────────────────────────────────

const generatePerformanceReport = async ({ month, year, dept }) => {
  const { month: m, year: y } = parseMonthYear(month, year);
  const { start, end } = getMonthDateRange(month, year);
  const periodStr = `Tháng ${m}/${y}`;

  const [attendance, tasks, leaveRequests] = await Promise.all([
    Attendance.find({ date: { $gte: start, $lte: end } }).populate('user', 'name role position'),
    Task.find({ createdAt: { $gte: start, $lte: end } }),
    LeaveRequest.find({ createdAt: { $gte: start, $lte: end } })
  ]);

  const staffAttendance = {};
  attendance.forEach(a => {
    const uid = a.user?._id?.toString();
    if (!uid) return;
    if (!staffAttendance[uid]) {
      staffAttendance[uid] = { name: a.user?.name || '', role: a.user?.role || '', hours: 0, onTime: 0, late: 0, absent: 0, total: 0 };
    }
    staffAttendance[uid].hours += a.workingHours || 0;
    staffAttendance[uid].total++;
    if (a.status === 'on_time') staffAttendance[uid].onTime++;
    if (a.status === 'late') staffAttendance[uid].late++;
    if (a.status === 'absent') staffAttendance[uid].absent++;
  });

  const taskStats = {};
  tasks.forEach(t => {
    const uid = t.assignedToId;
    if (!uid) return;
    if (!taskStats[uid]) {
      taskStats[uid] = { name: t.assignedTo || '', total: 0, completed: 0, pending: 0, inProgress: 0, overdue: 0 };
    }
    taskStats[uid].total++;
    if (t.status === 'completed') taskStats[uid].completed++;
    else if (t.status === 'in_progress') taskStats[uid].inProgress++;
    else taskStats[uid].pending++;
    if (t.deadlineDate && new Date(t.deadlineDate) < new Date() && t.status !== 'completed') {
      taskStats[uid].overdue++;
    }
  });

  const staffIds = [...new Set([...Object.keys(staffAttendance), ...Object.keys(taskStats)])];
  const performance = staffIds.map(uid => {
    const att = staffAttendance[uid] || { name: '', role: '', hours: 0, onTime: 0, late: 0, absent: 0, total: 0 };
    const tsk = taskStats[uid] || { name: att.name, total: 0, completed: 0, pending: 0, inProgress: 0, overdue: 0 };
    const name = tsk.name || att.name;
    const attendanceRate = att.total > 0 ? Math.round((att.onTime / att.total) * 100) : 0;
    const taskCompletionRate = tsk.total > 0 ? Math.round((tsk.completed / tsk.total) * 100) : 0;
    const performanceScore = Math.round((attendanceRate * 0.4 + taskCompletionRate * 0.4 + Math.max(0, 100 - tsk.overdue * 10) * 0.2));

    return {
      staffId: uid,
      name,
      role: att.role,
      attendanceRate,
      onTimeCount: att.onTime,
      lateCount: att.late,
      absentDays: att.absent,
      totalHours: Math.round(att.hours * 10) / 10,
      taskCompletionRate,
      taskCompleted: tsk.completed,
      taskPending: tsk.pending,
      taskInProgress: tsk.inProgress,
      taskOverdue: tsk.overdue,
      performanceScore,
      rating: performanceScore >= 90 ? 'Xuất sắc' : performanceScore >= 75 ? 'Tốt' : performanceScore >= 60 ? 'Trung bình' : 'Cần cải thiện'
    };
  });

  const summary = {
    totalStaff: performance.length,
    avgScore: performance.length > 0 ? Math.round(performance.reduce((s, p) => s + p.performanceScore, 0) / performance.length) : 0,
    avgAttendanceRate: performance.length > 0 ? Math.round(performance.reduce((s, p) => s + p.attendanceRate, 0) / performance.length) : 0,
    avgTaskRate: performance.length > 0 ? Math.round(performance.reduce((s, p) => s + p.taskCompletionRate, 0) / performance.length) : 0,
    excellentCount: performance.filter(p => p.performanceScore >= 90).length,
    goodCount: performance.filter(p => p.performanceScore >= 75 && p.performanceScore < 90).length,
    averageCount: performance.filter(p => p.performanceScore >= 60 && p.performanceScore < 75).length,
    needsImprovement: performance.filter(p => p.performanceScore < 60).length,
    totalTasksCreated: tasks.length,
    totalTasksCompleted: tasks.filter(t => t.status === 'completed').length,
    totalTasksOverdue: tasks.filter(t => t.deadlineDate && new Date(t.deadlineDate) < new Date() && t.status !== 'completed').length
  };

  return {
    type: 'performance',
    title: `Báo cáo hiệu suất - ${periodStr}`,
    description: `Báo cáo hiệu suất nhân viên tháng ${m}/${y}`,
    period: periodStr,
    periodStart: start,
    periodEnd: end,
    performance: performance.sort((a, b) => b.performanceScore - a.performanceScore),
    summary,
    chartData: {
      performanceDistribution: [
        { name: 'Xuất sắc (90+)', count: summary.excellentCount, color: '#10b981' },
        { name: 'Tốt (75-89)', count: summary.goodCount, color: '#3b82f6' },
        { name: 'Trung bình (60-74)', count: summary.averageCount, color: '#f59e0b' },
        { name: 'Cần cải thiện (<60)', count: summary.needsImprovement, color: '#ef4444' }
      ],
      topPerformers: performance.slice(0, 10).map(p => ({
        name: p.name,
        score: p.performanceScore,
        attendance: p.attendanceRate,
        tasks: p.taskCompletionRate
      })),
      taskStatus: [
        { name: 'Hoàn thành', count: tasks.filter(t => t.status === 'completed').length, color: '#10b981' },
        { name: 'Đang làm', count: tasks.filter(t => t.status === 'in_progress').length, color: '#3b82f6' },
        { name: 'Chưa làm', count: tasks.filter(t => t.status === 'pending').length, color: '#f59e0b' },
        { name: 'Quá hạn', count: tasks.filter(t => t.deadlineDate && new Date(t.deadlineDate) < new Date() && t.status !== 'completed').length, color: '#ef4444' }
      ]
    }
  };
};

// ─── Coverage Report ───────────────────────────────────────────────────────────

const generateCoverageReport = async ({ month, year }) => {
  const { month: m, year: y } = parseMonthYear(month, year);
  const { start, end } = getMonthDateRange(month, year);
  const periodStr = `Tháng ${m}/${y}`;

  const [schedules, attendance, activeStaff] = await Promise.all([
    ScheduleGenerator.find({ weekStart: { $gte: start, $lte: end } }),
    Attendance.find({ date: { $gte: start, $lte: end } }),
    Staff.find({ status: 'Đang làm' })
  ]);

  const allSlots = schedules.flatMap(s => s.slots || []);
  const totalSlots = allSlots.length;
  const filledSlots = allSlots.filter(s => s.assignedStaffId).length;
  const emptySlots = totalSlots - filledSlots;

  const byDay = {};
  allSlots.forEach(slot => {
    if (!byDay[slot.dayKey]) byDay[slot.dayKey] = { day: slot.dayLabel, total: 0, filled: 0, empty: 0 };
    byDay[slot.dayKey].total++;
    if (slot.assignedStaffId) byDay[slot.dayKey].filled++;
    else byDay[slot.dayKey].empty++;
  });

  const byShift = {};
  allSlots.forEach(slot => {
    if (!byShift[slot.shiftName]) byShift[slot.shiftName] = { shift: slot.shiftName, total: 0, filled: 0, empty: 0 };
    byShift[slot.shiftName].total++;
    if (slot.assignedStaffId) byShift[slot.shiftName].filled++;
    else byShift[slot.shiftName].empty++;
  });

  const byBranch = {};
  allSlots.forEach(slot => {
    const branch = slot.branch || 'Không xác định';
    if (!byBranch[branch]) byBranch[branch] = { branch, total: 0, filled: 0, empty: 0 };
    byBranch[branch].total++;
    if (slot.assignedStaffId) byBranch[branch].filled++;
    else byBranch[branch].empty++;
  });

  const weeklyStats = schedules.map(s => ({
    weekStart: s.weekStart,
    weekEnd: s.weekEnd,
    coverage: s.coverageStats?.coveragePercent || 0,
    total: s.coverageStats?.totalSlots || 0,
    filled: s.coverageStats?.filledSlots || 0,
    empty: s.coverageStats?.emptySlots || 0,
    employeeCount: s.employeeStats?.length || 0
  }));

  const summary = {
    totalSlots,
    filledSlots,
    emptySlots,
    coveragePercent: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0,
    totalWeeks: schedules.length,
    totalStaff: activeStaff.length,
    totalAttendance: attendance.length,
    attendanceRate: attendance.length > 0 ? Math.round((attendance.filter(a => a.status !== 'absent').length / attendance.length) * 100) : 0
  };

  return {
    type: 'coverage',
    title: `Báo cáo phủ sóng ca - ${periodStr}`,
    description: `Báo cáo phủ sóng ca làm việc tháng ${m}/${y}`,
    period: periodStr,
    periodStart: start,
    periodEnd: end,
    summary,
    byDay: Object.values(byDay),
    byShift: Object.values(byShift),
    byBranch: Object.values(byBranch),
    weeklyStats,
    chartData: {
      coverageTrend: weeklyStats.map(w => ({
        week: `Tuần ${new Date(w.weekStart).getDate()}/${new Date(w.weekStart).getMonth() + 1}`,
        coverage: w.coverage
      })),
      coverageByDay: Object.values(byDay).map(d => ({
        name: d.day,
        filled: d.filled,
        empty: d.empty
      })),
      coverageByShift: Object.values(byShift).map(s => ({
        name: s.shift,
        filled: s.filled,
        empty: s.empty
      }))
    }
  };
};

// ─── Summary Dashboard Report ──────────────────────────────────────────────────

const generateSummaryReport = async ({ month, year }) => {
  const { month: m, year: y } = parseMonthYear(month, year);
  const { start, end } = getMonthDateRange(month, year);
  const periodStr = `Tháng ${m}/${y}`;

  const [attendance, payrolls, tasks, leaves, schedules] = await Promise.all([
    Attendance.find({ date: { $gte: start, $lte: end } }).populate('user', 'name role'),
    Payroll.find({ month: m, year: y }),
    Task.find({ createdAt: { $gte: start, $lte: end } }),
    LeaveRequest.find({ startDate: { $gte: start, $lte: end }, status: 'approved' }),
    ScheduleGenerator.find({ weekStart: { $gte: start, $lte: end } })
  ]);

  const allSlots = schedules.flatMap(s => s.slots || []);
  const coveragePercent = allSlots.length > 0
    ? Math.round((allSlots.filter(s => s.assignedStaffId).length / allSlots.length) * 100)
    : 0;

  const totalSalary = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0);
  const totalHours = attendance.reduce((s, a) => s + (a.workingHours || 0), 0);

  return {
    type: 'summary',
    title: `Báo cáo tổng hợp - ${periodStr}`,
    description: `Báo cáo tổng hợp toàn diện tháng ${m}/${y}`,
    period: periodStr,
    periodStart: start,
    periodEnd: end,
    summary: {
      attendance: {
        totalRecords: attendance.length,
        totalHours: Math.round(totalHours),
        onTimeRate: attendance.length > 0 ? Math.round((attendance.filter(a => a.status === 'on_time').length / attendance.length) * 100) : 0,
        lateCount: attendance.filter(a => a.status === 'late').length,
        absentCount: attendance.filter(a => a.status === 'absent').length
      },
      payroll: {
        totalStaff: payrolls.length,
        totalSalary: Math.round(totalSalary),
        avgSalary: payrolls.length > 0 ? Math.round(totalSalary / payrolls.length) : 0,
        totalOvertime: payrolls.reduce((s, p) => s + (p.overtimePay || 0), 0),
        totalAllowances: payrolls.reduce((s, p) => s + (p.allowances || 0), 0)
      },
      tasks: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        overdue: tasks.filter(t => t.deadlineDate && new Date(t.deadlineDate) < new Date() && t.status !== 'completed').length
      },
      leave: {
        totalApproved: leaves.length,
        totalDays: leaves.reduce((s, l) => s + (l.days || 0), 0)
      },
      schedule: {
        coveragePercent,
        totalSlots: allSlots.length,
        filledSlots: allSlots.filter(s => s.assignedStaffId).length
      }
    },
    chartData: {
      attendanceByDay: Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => {
        const day = i + 1;
        const dayRecords = attendance.filter(a => new Date(a.date).getDate() === day);
        return {
          day,
          hours: Math.round(dayRecords.reduce((s, a) => s + (a.workingHours || 0), 0)),
          count: dayRecords.length
        };
      }),
      taskOverview: [
        { name: 'Hoàn thành', value: tasks.filter(t => t.status === 'completed').length, color: '#10b981' },
        { name: 'Đang làm', value: tasks.filter(t => t.status === 'in_progress').length, color: '#3b82f6' },
        { name: 'Chưa làm', value: tasks.filter(t => t.status === 'pending').length, color: '#f59e0b' },
        { name: 'Quá hạn', value: tasks.filter(t => t.deadlineDate && new Date(t.deadlineDate) < new Date() && t.status !== 'completed').length, color: '#ef4444' }
      ]
    }
  };
};

// ─── PDF Export ────────────────────────────────────────────────────────────────

const generatePDFContent = (reportData) => {
  const { title, period, summary, byStaff, byDept, payrolls, performance, byDay, byShift } = reportData;
  const lines = [];

  const addLine = (text, style = 'normal') => lines.push({ text, style });
  const addSpace = () => lines.push({ text: '', style: 'normal' });

  addLine('══════════════════════════════════════════════════════', 'header');
  addLine(title.toUpperCase(), 'header');
  addLine(`Kỳ báo cáo: ${period}`, 'subheader');
  addLine(`Ngày xuất: ${fmtDate(new Date())}`, 'subheader');
  addLine('══════════════════════════════════════════════════════', 'header');
  addSpace();

  if (summary) {
    addLine('── TÓM TẮT ──', 'section');
    if (reportData.type === 'attendance' && summary.totalRecords !== undefined) {
      addLine(`  • Tổng bản ghi: ${summary.totalRecords}`);
      addLine(`  • Tổng giờ làm: ${summary.totalHours || 0}h`);
      addLine(`  • Giờ TB/nhân viên: ${summary.avgHoursPerStaff || 0}h`);
      addLine(`  • Tỷ lệ đúng giờ: ${summary.onTimeRate || 0}%`);
      addLine(`  • Tỷ lệ muộn: ${summary.lateRate || 0}%`);
      addLine(`  • Tỷ lệ chấm công: ${summary.attendanceRate || 0}%`);
    } else if (reportData.type === 'payroll' && summary.totalNet !== undefined) {
      addLine(`  • Tổng nhân viên: ${summary.totalRecords || 0}`);
      addLine(`  • Tổng lương gross: ${fmt(Math.round(summary.totalGross))} VND`);
      addLine(`  • Tổng lương net: ${fmt(Math.round(summary.totalNet))} VND`);
      addLine(`  • Tổng khấu trừ: ${fmt(Math.round(summary.totalDeductions))} VND`);
      addLine(`  • Lương TB: ${fmt(Math.round(summary.avgNetSalary))} VND`);
      addLine(`  • Tổng giờ tăng ca: ${summary.totalOvertimeHours || 0}h`);
      addLine(`  • Tổng phụ cấp: ${fmt(Math.round(summary.totalAllowances))} VND`);
    } else if (reportData.type === 'performance' && summary.avgScore !== undefined) {
      addLine(`  • Tổng nhân viên: ${summary.totalStaff || 0}`);
      addLine(`  • Điểm TB: ${summary.avgScore}/100`);
      addLine(`  • Tỷ lệ chấm công TB: ${summary.avgAttendanceRate || 0}%`);
      addLine(`  • Tỷ lệ hoàn thành task TB: ${summary.avgTaskRate || 0}%`);
      addLine(`  • Xuất sắc: ${summary.excellentCount || 0} | Tốt: ${summary.goodCount || 0}`);
      addLine(`  • Trung bình: ${summary.averageCount || 0} | Cần cải thiện: ${summary.needsImprovement || 0}`);
    } else if (reportData.type === 'coverage' && summary.coveragePercent !== undefined) {
      addLine(`  • Tổng ca: ${summary.totalSlots || 0}`);
      addLine(`  • Ca đã phân: ${summary.filledSlots || 0}`);
      addLine(`  • Ca trống: ${summary.emptySlots || 0}`);
      addLine(`  • Coverage: ${summary.coveragePercent}%`);
      addLine(`  • Tổng tuần: ${summary.totalWeeks || 0}`);
      addLine(`  • Nhân viên: ${summary.totalStaff || 0}`);
    }
    addSpace();
  }

  if (byDept && byDept.length > 0) {
    addLine('── THEO BỘ PHẬN ──', 'section');
    byDept.forEach(d => {
      addLine(`  ${d.dept}: ${d.count} NV | ${d.totalHours || d.gross ? fmt(Math.round(d.totalHours || d.gross)) : ''} ${d.totalHours ? 'h' : 'VND'}`);
    });
    addSpace();
  }

  if (byDay && byDay.length > 0) {
    addLine('── THEO NGÀY ──', 'section');
    byDay.forEach(d => {
      const rate = d.total > 0 ? Math.round((d.filled / d.total) * 100) : 0;
      addLine(`  ${d.day}: ${d.filled}/${d.total} ca (${rate}%)`);
    });
    addSpace();
  }

  if (byShift && byShift.length > 0) {
    addLine('── THEO CA ──', 'section');
    byShift.forEach(s => {
      const rate = s.total > 0 ? Math.round((s.filled / s.total) * 100) : 0;
      addLine(`  ${s.shift}: ${s.filled}/${s.total} ca (${rate}%)`);
    });
    addSpace();
  }

  if (byStaff && byStaff.length > 0) {
    addLine('── CHI TIẾT NHÂN VIÊN ──', 'section');
    byStaff.slice(0, 30).forEach(s => {
      addLine(`  ${s.name}: ${s.totalHours || s.netSalary ? (s.totalHours ? `${s.totalHours}h` : fmt(Math.round(s.netSalary)) + 'đ') : `${s.performanceScore || 0}đ`}`);
    });
    if (byStaff.length > 30) addLine(`  ... và ${byStaff.length - 30} nhân viên khác`);
  }

  addSpace();
  addLine('══════════════════════════════════════════════════════', 'header');
  addLine('BIDA Center - Management System', 'footer');
  addLine(`Generated at ${new Date().toLocaleString('vi-VN')}`, 'footer');

  return lines;
};

// ─── Excel Export ──────────────────────────────────────────────────────────────

const generateExcelData = (reportData) => {
  const { type, title, period, summary, byStaff, byDept, payrolls, performance, byDay, byShift, byBranch, weeklyStats, chartData } = reportData;

  const sheets = [];

  if (type === 'attendance' && byStaff) {
    sheets.push({
      name: 'Chi tiết chấm công',
      headers: ['STT', 'Nhân viên', 'Vai trò', 'Giờ làm', 'Đúng giờ', 'Muộn', 'Nghỉ', 'Tỷ lệ'],
      rows: byStaff.map((s, i) => [i + 1, s.name, s.role || '', s.totalHours, s.onTimeCount, s.lateCount, s.absentDays, `${s.attendanceRate}%`])
    });
    if (byDept && byDept.length > 0) {
      sheets.push({
        name: 'Theo bộ phận',
        headers: ['Bộ phận', 'Số nhân viên', 'Tổng giờ', 'Số muộn'],
        rows: byDept.map(d => [d.dept, d.count, Math.round(d.totalHours), d.lateCount])
      });
    }
  }

  if (type === 'payroll' && payrolls) {
    sheets.push({
      name: 'Chi tiết lương',
      headers: ['STT', 'Mã NV', 'Tên', 'Bộ phận', 'Lương cơ bản', 'Giờ làm', 'Tăng ca', 'Phụ cấp', 'Gross', 'Khấu trừ', 'Net', 'Trạng thái'],
      rows: payrolls.map((p, i) => [
        i + 1, p.staffId, p.staffName, p.dept, fmt(p.baseWage), p.totalHoursWorked,
        fmt(p.overtimeHours), fmt(p.allowances), fmt(Math.round(p.grossSalary)),
        fmt(Math.round(p.deductions)), fmt(Math.round(p.netSalary)), p.status
      ])
    });
    if (byDept && byDept.length > 0) {
      sheets.push({
        name: 'Tổng theo bộ phận',
        headers: ['Bộ phận', 'Số NV', 'Gross', 'Net', 'Khấu trừ', 'Phụ cấp'],
        rows: byDept.map(d => [d.dept, d.count, fmt(Math.round(d.gross)), fmt(Math.round(d.net)), fmt(Math.round(d.deductions)), fmt(Math.round(d.allowances))])
      });
    }
  }

  if (type === 'performance' && performance) {
    sheets.push({
      name: 'Hiệu suất',
      headers: ['STT', 'Nhân viên', 'Vai trò', 'Điểm', 'Xếp loại', 'Chấm công', 'Task hoàn thành', 'Quá hạn'],
      rows: performance.map((p, i) => [
        i + 1, p.name, p.role || '', p.performanceScore, p.rating,
        `${p.attendanceRate}%`, `${p.taskCompletionRate}%`, p.taskOverdue
      ])
    });
  }

  if (type === 'coverage') {
    if (byDay && byDay.length > 0) {
      sheets.push({
        name: 'Theo ngày',
        headers: ['Ngày', 'Tổng ca', 'Đã phân', 'Trống', 'Coverage'],
        rows: byDay.map(d => [d.day, d.total, d.filled, d.empty, `${d.total > 0 ? Math.round((d.filled / d.total) * 100) : 0}%`])
      });
    }
    if (byShift && byShift.length > 0) {
      sheets.push({
        name: 'Theo ca',
        headers: ['Ca', 'Tổng', 'Đã phân', 'Trống', 'Coverage'],
        rows: byShift.map(s => [s.shift, s.total, s.filled, s.empty, `${s.total > 0 ? Math.round((s.filled / s.total) * 100) : 0}%`])
      });
    }
    if (byBranch && byBranch.length > 0) {
      sheets.push({
        name: 'Theo chi nhánh',
        headers: ['Chi nhánh', 'Tổng', 'Đã phân', 'Trống', 'Coverage'],
        rows: byBranch.map(b => [b.branch, b.total, b.filled, b.empty, `${b.total > 0 ? Math.round((b.filled / b.total) * 100) : 0}%`])
      });
    }
    if (weeklyStats && weeklyStats.length > 0) {
      sheets.push({
        name: 'Theo tuần',
        headers: ['Tuần bắt đầu', 'Tuần kết thúc', 'Coverage', 'Tổng ca', 'Đã phân', 'Trống'],
        rows: weeklyStats.map(w => [
          fmtDate(w.weekStart), fmtDate(w.weekEnd), `${w.coverage}%`, w.total, w.filled, w.empty
        ])
      });
    }
  }

  return { title: `${title} - ${period}`, sheets };
};

// ─── Controller Actions ────────────────────────────────────────────────────────

export const getReportTypes = async (req, res) => {
  const types = [
    { key: 'attendance', label: 'Báo cáo chấm công', icon: '🕐', description: 'Chi tiết chấm công, giờ làm, tỷ lệ đúng giờ theo nhân viên và bộ phận', color: '#3b82f6' },
    { key: 'payroll', label: 'Báo cáo lương', icon: '💰', description: 'Tổng hợp lương, tăng ca, phụ cấp, khấu trừ theo tháng', color: '#10b981' },
    { key: 'performance', label: 'Báo cáo hiệu suất', icon: '📊', description: 'Đánh giá hiệu suất nhân viên dựa trên chấm công và task', color: '#8b5cf6' },
    { key: 'coverage', label: 'Báo cáo phủ sóng ca', icon: '📅', description: 'Coverage ca làm việc, ca trống, phân bổ theo ngày/ca/chi nhánh', color: '#f59e0b' },
    { key: 'summary', label: 'Báo cáo tổng hợp', icon: '📋', description: 'Tóm tắt toàn diện: chấm công, lương, task, lịch trong 1 trang', color: '#ef4444' }
  ];
  res.json({ success: true, data: types });
};

export const generateReport = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền.' });
    }

    const { type, month, year, dept, staffId, format } = req.body;

    if (!type) {
      return res.status(400).json({ success: false, message: 'Loại báo cáo là bắt buộc.' });
    }

    let reportData;
    switch (type) {
      case 'attendance':
        reportData = await generateAttendanceReport({ month, year, dept, staffId });
        break;
      case 'payroll':
        reportData = await generatePayrollReport({ month, year, dept });
        break;
      case 'performance':
        reportData = await generatePerformanceReport({ month, year, dept });
        break;
      case 'coverage':
        reportData = await generateCoverageReport({ month, year });
        break;
      case 'summary':
        reportData = await generateSummaryReport({ month, year });
        break;
      default:
        return res.status(400).json({ success: false, message: 'Loại báo cáo không hợp lệ.' });
    }

    const report = await Report.create({
      type,
      title: reportData.title,
      description: reportData.description,
      period: reportData.period,
      periodStart: reportData.periodStart,
      periodEnd: reportData.periodEnd,
      generatedBy: req.user.id,
      generatedByName: req.user.name,
      generatedAt: new Date(),
      format: format || 'screen',
      summary: {
        totalRecords: reportData.summary?.totalRecords || reportData.summary?.totalStaff || reportData.summary?.totalSlots || 0,
        totalValue: reportData.summary?.totalNet || reportData.summary?.totalGross || reportData.summary?.totalHours || 0,
        averageValue: reportData.summary?.avgNetSalary || reportData.summary?.avgHoursPerStaff || 0,
        customMetrics: new Map(reportData.summary || {})
      },
      data: reportData,
      filters: { dept: dept || '', staffId: staffId || '' }
    });

    res.json({ success: true, data: { report: report.toSafeObject(), reportData } });
  } catch (error) {
    next(error);
  }
};

export const getReportData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo.' });
    }
    res.json({ success: true, data: { meta: report.toSafeObject(), reportData: report.data } });
  } catch (error) {
    next(error);
  }
};

export const exportReport = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền.' });
    }

    const { id } = req.params;
    const { format } = req.params;

    if (!['pdf', 'excel'].includes(format)) {
      return res.status(400).json({ success: false, message: 'Format phải là pdf hoặc excel.' });
    }

    const report = await Report.findById(id);
    if (!report || !report.data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo.' });
    }

    report.exportCount = (report.exportCount || 0) + 1;
    report.lastExportedAt = new Date();
    report.lastExportedBy = req.user.id;
    report.lastExportedFormat = format;
    report.status = 'exported';
    await report.save();

    if (format === 'pdf') {
      const lines = generatePDFContent(report.data);
      const content = lines.map(l => l.text).join('\n');

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${report.title.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_')}.txt"`);
      return res.send(content);
    }

    if (format === 'excel') {
      const excelData = generateExcelData(report.data);
      res.json({
        success: true,
        data: {
          exportMeta: {
            reportId: id,
            format: 'excel',
            exportedAt: new Date(),
            exportedBy: req.user.name
          },
          sheets: excelData.sheets,
          filename: excelData.title
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getReportHistory = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền.' });
    }

    const { type, month, year, page = 1, limit = 20 } = req.query;

    let query = {};
    if (type) query.type = type;
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      query.periodStart = { $gte: start, $lte: end };
    }

    const [reports, total] = await Promise.all([
      Report.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit)),
      Report.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        reports: reports.map(r => r.toSafeObject()),
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReport = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền.' });
    }

    const { id } = req.params;
    const report = await Report.findByIdAndDelete(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo.' });
    }

    res.json({ success: true, message: 'Đã xóa báo cáo.' });
  } catch (error) {
    next(error);
  }
};

export const getDashboardData = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền.' });
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const { start: monthStart, end: monthEnd } = getMonthDateRange(currentMonth, currentYear);

    const [attendance, payrolls, schedules, tasks, leaves, recentReports] = await Promise.all([
      Attendance.find({ date: { $gte: monthStart, $lte: monthEnd } }).populate('user', 'name'),
      Payroll.find({ month: currentMonth, year: currentYear }),
      ScheduleGenerator.find({ weekStart: { $gte: monthStart, $lte: monthEnd } }),
      Task.find({ createdAt: { $gte: monthStart, $lte: monthEnd } }),
      LeaveRequest.find({ startDate: { $gte: monthStart, $lte: monthEnd }, status: 'approved' }),
      Report.find().sort({ createdAt: -1 }).limit(5)
    ]);

    const allSlots = schedules.flatMap(s => s.slots || []);
    const totalHours = attendance.reduce((s, a) => s + (a.workingHours || 0), 0);
    const totalSalary = payrolls.reduce((s, p) => s + (p.netSalary || 0), 0);

    const dailyHours = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monthStart);
      d.setDate(d.getDate() + i * 4);
      const dayRecords = attendance.filter(a => {
        const ad = new Date(a.date);
        return ad >= d && ad < new Date(d.getTime() + 4 * 86400000);
      });
      return {
        label: `T${i + 2}`,
        hours: Math.round(dayRecords.reduce((s, a) => s + (a.workingHours || 0), 0))
      };
    });

    const totalSlots = allSlots.length;
    const coveragePercent = totalSlots > 0 ? Math.round((allSlots.filter(s => s.assignedStaffId).length / totalSlots) * 100) : 0;

    res.json({
      success: true,
      data: {
        period: { month: currentMonth, year: currentYear, label: `Tháng ${currentMonth}/${currentYear}` },
        kpis: {
          totalAttendance: attendance.length,
          totalHours: Math.round(totalHours),
          onTimeRate: attendance.length > 0 ? Math.round((attendance.filter(a => a.status === 'on_time').length / attendance.length) * 100) : 0,
          totalSalary: Math.round(totalSalary),
          totalSalaryFmt: fmt(Math.round(totalSalary)),
          avgSalary: payrolls.length > 0 ? fmt(Math.round(totalSalary / payrolls.length)) : '0',
          staffPaid: payrolls.length,
          totalTasks: tasks.length,
          taskCompleted: tasks.filter(t => t.status === 'completed').length,
          taskOverdue: tasks.filter(t => t.deadlineDate && new Date(t.deadlineDate) < now && t.status !== 'completed').length,
          totalLeaves: leaves.length,
          coveragePercent,
          totalSlots,
          filledSlots: allSlots.filter(s => s.assignedStaffId).length,
          weeklySchedules: schedules.length
        },
        charts: {
          dailyHours,
          taskStatus: [
            { name: 'Hoàn thành', value: tasks.filter(t => t.status === 'completed').length, color: '#10b981' },
            { name: 'Đang làm', value: tasks.filter(t => t.status === 'in_progress').length, color: '#3b82f6' },
            { name: 'Chưa làm', value: tasks.filter(t => t.status === 'pending').length, color: '#f59e0b' },
            { name: 'Quá hạn', value: tasks.filter(t => t.deadlineDate && new Date(t.deadlineDate) < now && t.status !== 'completed').length, color: '#ef4444' }
          ],
          attendanceRate: [
            { name: 'Đúng giờ', value: attendance.filter(a => a.status === 'on_time').length, color: '#10b981' },
            { name: 'Muộn', value: attendance.filter(a => a.status === 'late').length, color: '#f59e0b' },
            { name: 'Về sớm', value: attendance.filter(a => a.status === 'early_leave').length, color: '#6366f1' },
            { name: 'Nghỉ', value: attendance.filter(a => a.status === 'absent').length, color: '#ef4444' }
          ],
          topEarners: payrolls.sort((a, b) => (b.netSalary || 0) - (a.netSalary || 0)).slice(0, 8).map(p => ({
            name: p.staffName,
            salary: Math.round(p.netSalary || 0)
          })),
          coverageByWeek: schedules.map(s => ({
            week: `T${new Date(s.weekStart).getDate()}/${new Date(s.weekStart).getMonth() + 1}`,
            coverage: s.coverageStats?.coveragePercent || 0
          }))
        },
        recentReports: recentReports.map(r => r.toSafeObject())
      }
    });
  } catch (error) {
    next(error);
  }
};
