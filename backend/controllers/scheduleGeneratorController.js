import ScheduleGenerator from '../models/ScheduleGenerator.js';
import Staff from '../models/Staff.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Attendance from '../models/Attendance.js';
import Notification from '../models/Notification.js';
import SystemSettings from '../models/SystemSettings.js';
import Shift from '../models/Shift.js';
import ShiftAssignment from '../models/ShiftAssignment.js';

const API_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const VN_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const SHIFT_TEMPLATES = [
  { name: 'Ca sáng', time: '08:00 - 16:00', hours: 8, role: 'Phục vụ' },
  { name: 'Ca tối', time: '16:00 - 21:00', hours: 5, role: 'Phục vụ' },
  { name: 'Ca khuya', time: '21:00 - 23:59', hours: 3, role: 'Phục vụ' },
];

const DEPT_ROLES = {
  'Quản lý': ['Quản lý'],
  'Thu ngân': ['Thu ngân', 'Phục vụ'],
  'Phục vụ': ['Phục vụ'],
  'Bảo vệ': ['Bảo vệ'],
  'Vệ sinh': ['Vệ sinh']
};

const getWeekDates = (weekStart) => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const parseHours = (timeStr) => {
  if (!timeStr) return 6;
  const match = timeStr.match(/(\d+):(\d+)\s*-\s*(\d+):(\d+)/);
  if (!match) return 6;
  let [, sh, sm, eh, em] = match.map(Number);
  if (eh < sh) eh += 24;
  return Math.max(0, (eh + em / 60) - (sh + sm / 60));
};

const getMonday = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ─── AI Engine ─────────────────────────────────────────────────────────────────

const aiEngine = {
  async buildContext(weekStart, config = {}) {
    const monday = new Date(weekStart);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const [activeStaff, approvedLeaves, recentAttendance] = await Promise.all([
      Staff.find({ status: { $ne: 'Nghỉ' } }),
      LeaveRequest.find({
        status: 'approved',
        startDate: { $lte: sunday },
        endDate: { $gte: monday }
      }),
      Attendance.find({
        date: { $gte: monday, $lte: sunday }
      }).select('user workingHours')
    ]);

    const staffOnLeave = new Set();
    approvedLeaves.forEach(lr => {
      const uid = lr.user.toString();
      staffOnLeave.add(uid);
    });

    const staffHoursMap = {};
    recentAttendance.forEach(a => {
      const uid = a.user.toString();
      if (!staffHoursMap[uid]) staffHoursMap[uid] = 0;
      staffHoursMap[uid] += a.workingHours || 0;
    });

    // Lọc chỉ role staff (không gán manager/admin vào ca)
    const availableStaff = activeStaff
      .filter(s => !staffOnLeave.has(s.id) && s.role === 'staff')
      .map(s => ({
        id: s.id,
        name: s.name,
        dept: s.dept,
        preferredShift: null,
        currentHours: staffHoursMap[s.id] || 0,
        assignedSlots: [],
        consecutiveDays: 0,
        lastDayAssigned: null,
        weekendCount: 0
      }));

    return {
      weekStart: monday,
      weekEnd: sunday,
      availableStaff,
      staffOnLeave,
      config: {
        minHours: config.minHoursPerWeek || 20,
        maxHours: config.maxHoursPerWeek || 48,
        maxConsecutive: config.maxConsecutiveDays || 6,
        targetHours: config.targetHoursPerEmployee || 40,
        preferRotation: config.preferWeekendRotation !== false,
        coverWeekends: config.coverWeekends !== false
      }
    };
  },

  generateScheduleTemplate(ctx, existingSchedule = null) {
    const slots = [];
    const dates = getWeekDates(ctx.weekStart);

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const date = dates[dayIdx];
      const dayKey = API_DAYS[dayIdx];
      const dayLabel = VN_DAYS[dayIdx];
      const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      const weekend = isWeekend(date);

      const shiftsForDay = weekend
        ? [SHIFT_TEMPLATES[0], SHIFT_TEMPLATES[1], SHIFT_TEMPLATES[2]]
        : [SHIFT_TEMPLATES[0], SHIFT_TEMPLATES[1], SHIFT_TEMPLATES[2]];

      for (const shift of shiftsForDay) {
        const slotId = `${dayKey}-${shift.name.replace(/\s/g, '')}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        let assigned = null;
        let reason = '';
        let status = 'empty';

        if (existingSchedule) {
          const existing = existingSchedule.find(s => s.dayKey === dayKey && s.shiftName === shift.name);
          if (existing?.assignedStaff?.length > 0) {
            assigned = ctx.availableStaff.find(st => st.id === existing.assignedStaff[0].id);
            reason = 'Giữ nguyên lịch cũ';
            status = 'manual';
          }
        }

        slots.push({
          dayKey,
          dayLabel,
          date: dateStr,
          shiftName: shift.name,
          shiftTime: shift.time,
          role: shift.role,
          branch: 'Chi nhánh 1 Nguyễn Oanh',
          assignedStaff: assigned ? [{ id: assigned.id, name: assigned.name }] : [],
          assignedStaffId: assigned?.id || null,
          assignedStaffName: assigned?.name || null,
          status,
          reason
        });
      }
    }

    return slots;
  },

  assignStaffToSlots(ctx, slots) {
    const assigned = slots.map(slot => ({ ...slot }));
    const sortedSlots = assigned
      .filter(s => s.status === 'empty')
      .sort((a, b) => {
        const aWe = isWeekend(new Date(a.date.split('/').reverse().join('-')));
        const bWe = isWeekend(new Date(b.date.split('/').reverse().join('-')));
        if (aWe !== bWe) return aWe ? -1 : 1;
        const aStaff = ctx.availableStaff.find(st => st.assignedSlots.length === 0);
        const bStaff = ctx.availableStaff.find(st => st.assignedSlots.length === 0);
        return (aStaff?.currentHours || 0) - (bStaff?.currentHours || 0);
      });

    for (const slot of sortedSlots) {
      const slotDate = new Date(slot.date.split('/').reverse().join('-'));
      const isWeekendSlot = isWeekend(slotDate);
      const slotHours = parseHours(slot.shiftTime);

      const candidates = ctx.availableStaff
        .filter(st => {
          if (st.assignedSlots.some(s => s.dayKey === slot.dayKey)) return false;
          if (isWeekendSlot && ctx.config.preferRotation && st.weekendCount >= 2) return false;
          const projectedHours = st.currentHours + slotHours;
          if (projectedHours > ctx.config.maxHours) return false;
          if (slotHours + st.currentHours > ctx.config.targetHours * 1.3) return false;
          return true;
        })
        .sort((a, b) => {
          const aScore = (ctx.config.targetHours - a.currentHours) + (isWeekendSlot ? (3 - a.weekendCount) * 2 : 0) - a.consecutiveDays;
          const bScore = (ctx.config.targetHours - b.currentHours) + (isWeekendSlot ? (3 - b.weekendCount) * 2 : 0) - b.consecutiveDays;
          return bScore - aScore;
        });

      if (candidates.length > 0) {
        const chosen = candidates[0];
        const existingSlot = assigned.find(s => s.dayKey === slot.dayKey && s.shiftName === slot.shiftName);
        if (existingSlot) {
          existingSlot.assignedStaff = [{ id: chosen.id, name: chosen.name }];
          existingSlot.assignedStaffId = chosen.id;
          existingSlot.assignedStaffName = chosen.name;
          existingSlot.status = 'auto';
          existingSlot.reason = 'AI tự động phân công';

          chosen.assignedSlots.push(existingSlot);
          chosen.currentHours += slotHours;

          if (chosen.lastDayAssigned !== null) {
            const lastDate = new Date(chosen.lastDayAssigned.split('/').reverse().join('-'));
            const diff = Math.abs((slotDate - lastDate) / (1000 * 60 * 60 * 24));
            if (diff === 1) {
              chosen.consecutiveDays++;
            } else {
              chosen.consecutiveDays = 1;
            }
          } else {
            chosen.consecutiveDays = 1;
          }
          chosen.lastDayAssigned = slot.date;

          if (isWeekendSlot) chosen.weekendCount++;
        }
      }
    }

    return assigned;
  },

  analyzeFairness(ctx, slots) {
    // Filter out null staff entries
    const validStaff = ctx.availableStaff.filter(st => st.id && st.name);
    
    const stats = validStaff.map(st => {
      const staffSlots = slots.filter(s => s.assignedStaff && s.assignedStaff.some(a => a.id === st.id));
      const totalHours = staffSlots.reduce((sum, s) => sum + parseHours(s.shiftTime), 0);
      const weekendShifts = staffSlots.filter(s => {
        const d = new Date(s.date.split('/').reverse().join('-'));
        return isWeekend(d);
      }).length;

      const target = ctx.config.targetHours || 40;
      const diff = Math.abs(totalHours - target);
      let fairnessScore = Math.max(0, 100 - diff * 2);

      if (st.consecutiveDays > (ctx.config.maxConsecutive || 6)) {
        fairnessScore -= 20;
      }

      return {
        staffId: st.id,
        staffName: st.name,
        dept: st.dept || '',
        totalHours: Math.round(totalHours * 10) / 10,
        daysWorked: staffSlots.length,
        weekendShifts,
        fairnessScore: isNaN(fairnessScore) ? 0 : Math.round(fairnessScore)
      };
    });

    return stats.sort((a, b) => (a.staffName || '').localeCompare(b.staffName || ''));
  },

  generateRecommendations(ctx, slots) {
    const recs = [];
    const stats = ctx.availableStaff.map(st => ({
      ...st,
      slotCount: slots.filter(s => s.assignedStaff && s.assignedStaff.some(a => a.id === st.id)).length,
      hours: slots.filter(s => s.assignedStaff && s.assignedStaff.some(a => a.id === st.id)).reduce((sum, s) => sum + parseHours(s.shiftTime), 0)
    }));

    const emptySlots = slots.filter(s => !s.assignedStaff || s.assignedStaff.length === 0);
    if (emptySlots.length > 0) {
      recs.push({
        type: 'warning',
        priority: 2,
        message: `Còn ${emptySlots.length} ca chưa có người phụ trách (${emptySlots[0].shiftName} và ${emptySlots.length > 1 ? `${emptySlots.length - 1} ca khác` : ''}). Cần phân công thêm nhân viên.`,
        affectedSlots: emptySlots.slice(0, 5).map(s => `${s.dayLabel} - ${s.shiftName}`),
        suggestedFix: 'Kiểm tra danh sách nhân viên nghỉ phép hoặc tăng ca nhân viên.'
      });
    }

    const lowHoursStaff = stats.filter(s => s.hours < ctx.config.minHours && s.slotCount > 0);
    if (lowHoursStaff.length > 0) {
      recs.push({
        type: 'suggestion',
        priority: 1,
        message: `${lowHoursStaff.map(s => s.name).join(', ')} có số giờ thấp hơn mức tối thiểu (${ctx.config.minHours}h). Cân nhắc thêm ca cho họ.`,
        affectedSlots: [],
        suggestedFix: 'Phân thêm ca hoặc giảm tải cho nhân viên có giờ cao hơn.'
      });
    }

    const highHoursStaff = stats.filter(s => s.hours > ctx.config.maxHours);
    if (highHoursStaff.length > 0) {
      recs.push({
        type: 'conflict',
        priority: 3,
        message: `${highHoursStaff.map(s => `${s.name} (${s.hours}h)`).join(', ')} vượt quá giới hạn ${ctx.config.maxHours}h/tuần.`,
        affectedSlots: [],
        suggestedFix: 'Giảm số ca cho nhân viên bị quá tải.'
      });
    }

    const underbalanced = stats.filter(s => s.fairnessScore < 70 && s.slotCount > 0);
    if (underbalanced.length > 0) {
      recs.push({
        type: 'suggestion',
        priority: 1,
        message: `Phân bổ chưa đều cho: ${underbalanced.map(s => `${s.name} (${s.hours}h, score: ${s.fairnessScore})`).join(', ')}.`,
        affectedSlots: [],
        suggestedFix: 'Điều chỉnh phân bổ để công bằng hơn giữa các nhân viên.'
      });
    }

    const staffOnLeave = [...ctx.staffOnLeave];
    if (staffOnLeave.length > 0) {
      recs.push({
        type: 'info',
        priority: 0,
        message: `${staffOnLeave.length} nhân viên đang nghỉ phép trong tuần này. ${staffOnLeave.length >= ctx.availableStaff.length * 0.3 ? 'Tỷ lệ nghỉ cao, cần tuyển dụng thêm.' : ''}`,
        affectedSlots: [],
        suggestedFix: 'Theo dõi và cập nhật lịch khi có nhân viên quay lại.'
      });
    }

    return recs.sort((a, b) => b.priority - a.priority);
  },

  computeCoverage(slots) {
    const total = slots.length;
    const filled = slots.filter(s => s.assignedStaff && s.assignedStaff.length > 0).length;
    return {
      totalSlots: total,
      filledSlots: filled,
      emptySlots: total - filled,
      coveragePercent: total > 0 ? Math.round((filled / total) * 100) : 0
    };
  }
};

// ─── Controller ────────────────────────────────────────────────────────────────

export const getGeneratorSettings = async (req, res, next) => {
  try {
    const latest = await ScheduleGenerator.findOne()
      .sort({ createdAt: -1 })
      .select('config');

    const config = latest?.config || {
      minHoursPerWeek: 20,
      maxHoursPerWeek: 48,
      maxConsecutiveDays: 6,
      targetHoursPerEmployee: 40,
      coverWeekends: true,
      preferWeekendRotation: true
    };

    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};

export const updateGeneratorSettings = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền.' });
    }
    const { minHoursPerWeek, maxHoursPerWeek, maxConsecutiveDays, targetHoursPerEmployee, coverWeekends, preferWeekendRotation } = req.body;
    res.json({ success: true, data: { minHoursPerWeek, maxHoursPerWeek, maxConsecutiveDays, targetHoursPerEmployee, coverWeekends, preferWeekendRotation } });
  } catch (error) {
    next(error);
  }
};

export const generateSchedule = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền tạo lịch.' });
    }

    const { weekOffset = 0, config = {} } = req.body;
    console.log('[generateSchedule] weekOffset:', weekOffset, 'config:', config);

    const baseMonday = getMonday();
    const monday = new Date(baseMonday);
    monday.setDate(monday.getDate() + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    console.log('[generateSchedule] monday:', monday.toISOString());

    const existing = await ScheduleGenerator.findOne({
      weekStart: monday,
      status: { $in: ['draft', 'published'] }
    });
    console.log('[generateSchedule] existing:', existing?._id);

    // Tạo slots trống cho tuần (không tự động gán nhân viên)
    const API_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const VN_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const SHIFT_DATA = [
      { name: 'Ca sáng', time: '08:00 - 16:00' },
      { name: 'Ca tối', time: '16:00 - 21:00' },
      { name: 'Ca khuya', time: '21:00 - 23:59' }
    ];
    
    const slots = [];
    
    for (let day = 0; day < 7; day++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];
      
      for (const shift of SHIFT_DATA) {
        slots.push({
          dayKey: API_DAYS[day],
          dayLabel: VN_DAYS[day],
          date: dateStr,
          shiftName: shift.name,
          shiftTime: shift.time,
          role: 'Phục vụ',
          branch: 'Chi nhánh 1 Nguyễn Oanh',
          assignedStaffId: null,
          assignedStaffName: null,
          status: 'empty',
          reason: ''
        });
      }
    }
    
    console.log('[generateSchedule] created empty slots count:', slots.length);

    const coverageStats = {
      totalSlots: slots.length,
      filledSlots: 0,
      emptySlots: slots.length,
      coveragePercent: 0
    };

    const employeeStats = [];

    let saved;
    if (existing) {
      existing.slots = slots;
      existing.recommendations = [];
      existing.coverageStats = coverageStats;
      existing.employeeStats = employeeStats;
      existing.config = { ...existing.config, ...config };
      existing.generatedBy = req.user.id;
      existing.generatedByName = req.user.name;
      existing.generatedAt = new Date();
      saved = await existing.save();
      console.log('[generateSchedule] updated existing, id:', saved._id);
    } else {
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      console.log('[generateSchedule] creating new, weekStart:', monday, 'weekEnd:', sunday);

      saved = await ScheduleGenerator.create({
        weekStart: monday,
        weekEnd: sunday,
        slots,
        recommendations: [],
        coverageStats,
        employeeStats,
        config: {
          minHoursPerWeek: config.minHoursPerWeek || 20,
          maxHoursPerWeek: config.maxHoursPerWeek || 48,
          maxConsecutiveDays: config.maxConsecutiveDays || 6,
          targetHoursPerEmployee: config.targetHoursPerEmployee || 40,
          coverWeekends: config.coverWeekends !== false,
          preferWeekendRotation: config.preferWeekendRotation !== false
        },
        generatedBy: req.user.id,
        generatedByName: req.user.name,
        generatedAt: new Date()
      });
      console.log('[generateSchedule] created new, id:', saved._id);
    }

    console.log('[generateSchedule] returning success with _id:', saved._id);

    res.json({
      success: true,
      data: {
        _id: saved._id,
        weekStart: monday.toISOString(),
        weekEnd: new Date(monday.getTime() + 6 * 86400000).toISOString(),
        status: saved.status,
        slots,
        recommendations: saved?.recommendations || [],
        coverageStats: saved?.coverageStats || null,
        employeeStats: saved?.employeeStats || null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getGeneratedSchedule = async (req, res, next) => {
  try {
    const { weekOffset = 0 } = req.query;

    const baseMonday = getMonday();
    const monday = new Date(baseMonday);
    monday.setDate(monday.getDate() + parseInt(weekOffset) * 7);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const schedule = await ScheduleGenerator.findOne({
      weekStart: monday
    });

    res.json({
      success: true,
      data: schedule ? {
        _id: schedule._id,
        weekStart: schedule.weekStart,
        weekEnd: schedule.weekEnd,
        status: schedule.status,
        slots: schedule.slots,
        recommendations: schedule.recommendations,
        coverageStats: schedule.coverageStats,
        employeeStats: schedule.employeeStats,
        config: schedule.config
      } : null
    });
  } catch (error) {
    next(error);
  }
};

export const updateSlot = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền chỉnh sửa.' });
    }

    const { id } = req.params;
    const { slotId, addStaffId, addStaffName, removeStaffId, branch, reason } = req.body;

    const schedule = await ScheduleGenerator.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch biểu.' });
    }

    const slot = schedule.slots.find(s => (s._id?.toString() || s.dayKey + s.shiftName) === slotId);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca.' });
    }

    if (!slot.assignedStaff) slot.assignedStaff = [];

    // Initialize array fields
    if (addStaffId) {
      const exists = slot.assignedStaff.some(a => a.id === addStaffId);
      if (!exists) {
        slot.assignedStaff.push({ id: addStaffId, name: addStaffName || addStaffId });
      }
    }

    if (removeStaffId) {
      slot.assignedStaff = slot.assignedStaff.filter(a => a.id !== removeStaffId);
    }

    // Sync scalar fallback fields (first staff as primary)
    const first = slot.assignedStaff[0] || {};
    slot.assignedStaffId = first.id || null;
    slot.assignedStaffName = first.name || null;
    slot.branch = branch || slot.branch || null;
    slot.status = slot.assignedStaff.length > 0 ? 'manual' : 'empty';
    slot.reason = reason || 'Chỉnh sửa thủ công bởi quản lý';

    // Find or create Shift
    let shift = await Shift.findOne({ name: slot.shiftName });
    if (!shift) {
      const shiftTimeMap = {
        'Ca sáng': { startTime: '08:00', endTime: '16:00' },
        'Ca tối': { startTime: '16:00', endTime: '21:00' },
        'Ca khuya': { startTime: '21:00', endTime: '23:59' }
      };
      const times = shiftTimeMap[slot.shiftName] || { startTime: '08:00', endTime: '16:00' };
      shift = await Shift.create({
        name: slot.shiftName,
        startTime: times.startTime,
        endTime: times.endTime,
        isActive: true
      });
    }

    // Parse date from slot
    const [day, month, year] = slot.date.split('/');
    const assignmentDate = new Date(`${year}-${month}-${day}`);
    assignmentDate.setHours(0, 0, 0, 0);

    // Sync ShiftAssignment: replace all with current assignedStaff
    await ShiftAssignment.deleteMany({ shift: shift._id, date: assignmentDate });
    for (const staff of slot.assignedStaff) {
      await ShiftAssignment.findOneAndUpdate(
        { user: staff.id, shift: shift._id, date: assignmentDate },
        {
          user: staff.id,
          shift: shift._id,
          date: assignmentDate,
          assignedBy: req.user.id,
          notes: reason || 'Phân công từ lịch tuần'
        },
        { upsert: true, new: true }
      );
    }

    schedule.coverageStats = aiEngine.computeCoverage(schedule.slots);
    schedule.employeeStats = aiEngine.analyzeFairness(
      { availableStaff: schedule.slots.flatMap(s => (s.assignedStaff || []).map(a => ({ id: a.id, name: a.name, dept: '', assignedSlots: [], currentHours: 0, consecutiveDays: 0, lastDayAssigned: null, weekendCount: 0 }))), config: schedule.config },
      schedule.slots
    );

    await schedule.save();
    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
};

export const batchUpdateSlots = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền.' });
    }

    const { id } = req.params;
    const { changes } = req.body;

    const schedule = await ScheduleGenerator.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch biểu.' });
    }

    for (const change of changes) {
      const slot = schedule.slots.find(s => (s._id?.toString() || '') === change.slotId);
      if (slot) {
        if (!slot.assignedStaff) slot.assignedStaff = [];
        if (change.addStaffId) {
          const exists = slot.assignedStaff.some(a => a.id === change.addStaffId);
          if (!exists) {
            slot.assignedStaff.push({ id: change.addStaffId, name: change.addStaffName || change.addStaffId });
          }
        }
        if (change.removeStaffId) {
          slot.assignedStaff = slot.assignedStaff.filter(a => a.id !== change.removeStaffId);
        }
        const first = slot.assignedStaff[0] || {};
        slot.assignedStaffId = first.id || null;
        slot.assignedStaffName = first.name || null;
        slot.branch = change.branch || null;
        slot.status = slot.assignedStaff.length > 0 ? 'manual' : 'empty';
        slot.reason = change.reason || 'Chỉnh sửa thủ công';
      }
    }

    schedule.coverageStats = aiEngine.computeCoverage(schedule.slots);
    await schedule.save();

    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
};

export const publishSchedule = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền.' });
    }

    const { id } = req.params;
    const schedule = await ScheduleGenerator.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch biểu.' });
    }

    const shiftTimeMap = {
      'Ca sáng': { startTime: '08:00', endTime: '16:00' },
      'Ca tối': { startTime: '16:00', endTime: '21:00' },
      'Ca khuya': { startTime: '21:00', endTime: '23:59' }
    };

    const assignedSlots = schedule.slots.filter(slot => slot.assignedStaff && slot.assignedStaff.length > 0);
    const shiftCache = new Map();

    for (const slot of assignedSlots) {
      let shift = shiftCache.get(slot.shiftName);
      if (!shift) {
        shift = await Shift.findOne({ name: slot.shiftName });
        if (!shift) {
          const times = shiftTimeMap[slot.shiftName] || { startTime: '08:00', endTime: '16:00' };
          shift = await Shift.create({
            name: slot.shiftName,
            startTime: times.startTime,
            endTime: times.endTime,
            isActive: true
          });
        }
        shiftCache.set(slot.shiftName, shift);
      }

      const assignmentDate = new Date(slot.date);
      assignmentDate.setHours(0, 0, 0, 0);

      // Create one ShiftAssignment per staff member
      for (const staff of slot.assignedStaff) {
        await ShiftAssignment.findOneAndUpdate(
          {
            user: staff.id,
            shift: shift._id,
            date: assignmentDate
          },
          {
            user: staff.id,
            shift: shift._id,
            date: assignmentDate,
            assignedBy: req.user.id,
            notes: slot.reason || 'Phân công từ lịch tuần đã xuất bản'
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
          }
        );
      }
    }

    schedule.status = 'published';
    schedule.publishedAt = new Date();
    schedule.publishedBy = req.user.id;
    await schedule.save();

    const staffAssigned = [...new Set(assignedSlots.flatMap(s => (s.assignedStaff || []).map(a => a.id)))];
    const notifications = staffAssigned.map(staffId => {
      const staffSlots = assignedSlots.filter(s => s.assignedStaff && s.assignedStaff.some(a => a.id === staffId));
      const staffNames = staffSlots.map(s => `${s.dayLabel} - ${s.shiftName}`).join(', ');
      const staffObj = assignedSlots.flatMap(s => s.assignedStaff || []).find(a => a.id === staffId);
      return {
        recipientId: staffId,
        recipientName: staffObj?.name || 'Nhân viên',
        type: 'schedule_change',
        title: 'Lịch làm việc tuần mới được công bố',
        message: `Lịch làm việc tuần ${schedule.weekStart.toLocaleDateString('vi-VN')} - ${schedule.weekEnd.toLocaleDateString('vi-VN')} đã được công bố. Các ca của bạn: ${staffNames || 'Chưa có ca'}.`,
        data: { scheduleId: schedule._id.toString() },
        priority: 'normal',
        actionUrl: '/schedule'
      };
    });

    if (notifications.length > 0) {
      await Notification.sendBulk(notifications);
    }

    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
};

export const archiveSchedule = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền.' });
    }

    const { id } = req.params;
    const schedule = await ScheduleGenerator.findById(id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy.' });
    }

    schedule.status = 'archived';
    await schedule.save();
    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
};

export const getScheduleHistory = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) query.status = status;

    const schedules = await ScheduleGenerator.find(query)
      .sort({ weekStart: -1 })
      .limit(20)
      .select('weekStart weekEnd status coverageStats employeeStats generatedByName generatedAt publishedAt');

    res.json({ success: true, data: schedules });
  } catch (error) {
    next(error);
  }
};

export const getAvailabilityAnalysis = async (req, res, next) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Chỉ quản lý mới có quyền.' });
    }

    const { weekOffset = 0 } = req.query;

    const baseMonday = getMonday();
    const monday = new Date(baseMonday);
    monday.setDate(monday.getDate() + parseInt(weekOffset) * 7);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const [activeStaff, approvedLeaves, recentAttendance] = await Promise.all([
      Staff.find({ status: { $ne: 'Nghỉ' } }),
      LeaveRequest.find({
        status: 'approved',
        startDate: { $lte: sunday },
        endDate: { $gte: monday }
      }).populate('user', 'name'),
      Attendance.aggregate([
        {
          $match: {
            date: { $gte: monday, $lte: sunday }
          }
        },
        {
          $group: {
            _id: '$user',
            totalHours: { $sum: '$workingHours' },
            totalDays: { $sum: 1 }
          }
        }
      ])
    ]);

    const staffOnLeave = new Set();
    const leaveDetails = [];
    approvedLeaves.forEach(lr => {
      staffOnLeave.add(lr.user._id.toString());
      leaveDetails.push({
        staffId: lr.user._id.toString(),
        staffName: lr.user.name,
        leaveType: lr.leaveType,
        startDate: lr.startDate,
        endDate: lr.endDate
      });
    });

    const attendanceMap = {};
    recentAttendance.forEach(a => {
      attendanceMap[a._id.toString()] = a;
    });

    const analysis = activeStaff.map(staff => {
      const attendance = attendanceMap[staff.id];
      return {
        staffId: staff.id,
        staffName: staff.name,
        dept: staff.dept,
        status: staffOnLeave.has(staff.id) ? 'on_leave' : 'available',
        leaveInfo: leaveDetails.find(l => l.staffId === staff.id) || null,
        recentHours: attendance?.totalHours || 0,
        recentDays: attendance?.totalDays || 0
      };
    });

    const available = analysis.filter(a => a.status === 'available');
    const onLeave = analysis.filter(a => a.status === 'on_leave');

    res.json({
      success: true,
      data: {
        analysis,
        summary: {
          totalStaff: analysis.length,
          available: available.length,
          onLeave: onLeave.length,
          avgRecentHours: available.length > 0
            ? Math.round(available.reduce((s, a) => s + a.recentHours, 0) / available.length)
            : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
