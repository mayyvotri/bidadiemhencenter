import { useState, useEffect, Fragment } from 'react';
import { api } from '../services/api';
import { onEvent, emitEvent, Events } from '../utils/events';
import { useMediaQuery } from '../hooks/useMediaQuery';

const API_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const VN_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const SHIFT_NAMES = ['Ca sáng', 'Ca tối', 'Ca khuya'];
const DEFAULT_AREAS = ['Chi nhánh 1 Nguyễn Oanh', 'Quầy bi lỗ'];

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user_info') || '{}');
  } catch {
    return {};
  }
};

// Build week dates from Monday
const getWeekDates = (baseDate, weekOffset = 0) => {
  try {
    // Support Date object or 'YYYY-MM-DD' string
    let year, month, day;
    if (typeof baseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
      [year, month, day] = baseDate.split('-').map(Number);
    } else if (baseDate instanceof Date && !Number.isNaN(baseDate.getTime())) {
      year = baseDate.getFullYear();
      month = baseDate.getMonth() + 1;
      day = baseDate.getDate();
    } else {
      return API_DAYS.map((key, i) => ({ key, label: VN_DAYS[i], dateStr: '1970-01-01' }));
    }

    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) {
      return API_DAYS.map((key, i) => ({ key, label: VN_DAYS[i], dateStr: '1970-01-01' }));
    }

    const dayOfWeek = date.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayDate = new Date(year, month - 1, day + mondayOffset + weekOffset * 7);

    return API_DAYS.map((key, i) => {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return { key, label: VN_DAYS[i], dateStr: `${y}-${m}-${dd}` };
    });
  } catch (e) {
    console.error('[getWeekDates] error:', e);
    return API_DAYS.map((key, i) => ({ key, label: VN_DAYS[i], dateStr: '1970-01-01' }));
  }
};

export default function Schedule() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [scheduleData, setScheduleData] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [workAreas, setWorkAreas] = useState(DEFAULT_AREAS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSlot, setSavingSlot] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [weekDates, setWeekDates] = useState([]);
  const [pendingChanges, setPendingChanges] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  const user = getUser();
  const isAdmin = user.isAdmin;
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    const dates = getWeekDates(new Date(), weekOffset);
    setWeekDates(dates);
  }, [weekOffset]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isAdmin) {
          const [staffRes, scheduleRes, settingsRes] = await Promise.all([
            api.get('/staff'),
            api.get(`/schedule/generator/schedule?weekOffset=${weekOffset}`),
            api.get('/system/settings')
          ]);

          if (staffRes.success) setStaffList(staffRes.data);
          if (scheduleRes.success) setScheduleData(scheduleRes.data);
          if (settingsRes.success && settingsRes.data?.workAreas?.length > 0) {
            setWorkAreas(settingsRes.data.workAreas);
          }
        } else {
          if (weekDates.length !== 7 || !weekDates[0]?.dateStr) {
            setLoading(false);
            return;
          }
          const [myAssignmentsRes] = await Promise.all([
            api.get(
              `/shift-assignments/my?startDate=${weekDates[0].dateStr}&endDate=${weekDates[6].dateStr}`
            ).catch(e => {
              if (e.message.includes('403') || e.message.includes('forbidden')) {
                console.warn('[Schedule] shift-assignments forbidden, using empty data');
                return { success: true, data: [] };
              }
              throw e;
            })
          ]);

          setWorkAreas(DEFAULT_AREAS);

          if (myAssignmentsRes?.success) {
            console.log('[Schedule] myAssignments:', myAssignmentsRes.data.map(a => ({ date: a.date, dateType: typeof a.date, shiftName: a.shift?.name })));
            setScheduleData({
              isMySchedule: true,
              myAssignments: myAssignmentsRes.data
            });
          }
        }
      } catch (e) {
        console.error('[Schedule] fetchData error:', e);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin || weekDates.length === 7) {
      fetchData();
    }
  }, [weekOffset, isAdmin, weekDates]); // weekDates triggers re-fetch once populated

  // Lắng nghe sự kiện cập nhật lịch để tự refresh
  useEffect(() => {
    const handleScheduleUpdate = () => {
      if (!isAdmin) {
        // Nhân viên: refresh lịch của mình
        const fetchMySchedule = async () => {
          try {
            const myAssignmentsRes = await api.get(
              `/shift-assignments/my?startDate=${weekDates[0]?.dateStr}&endDate=${weekDates[6]?.dateStr}`
            );
            if (myAssignmentsRes?.success) {
              setScheduleData({
                isMySchedule: true,
                myAssignments: myAssignmentsRes.data
              });
            }
          } catch (e) {
            console.error('[Schedule] handleScheduleUpdate error:', e);
          }
        };
        if (weekDates.length === 7) {
          fetchMySchedule();
        }
      }
    };

    const unsubscribe = onEvent(Events.SCHEDULE_UPDATED, handleScheduleUpdate);
    return () => unsubscribe();
  }, [isAdmin, weekDates]);

  const isMySchedule = scheduleData?.isMySchedule;
  const myAssignments = scheduleData?.myAssignments || [];

  const normalizeDateKey = (dateValue) => {
    if (!dateValue) return null;

    // If already a valid YYYY-MM-DD string
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    // Handle Date object or ISO string
    let date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      // Parse as local date (not UTC)
      const [y, m, d] = dateValue.split('T')[0].split('-');
      if (y && m && d) {
        date = new Date(Number(y), Number(m) - 1, Number(d));
      }
    }

    if (!date || Number.isNaN(date.getTime())) return null;

    // Format as YYYY-MM-DD using local time
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const buildStaffSlotMap = () => {
    const map = {};
    console.log('[buildStaffSlotMap] myAssignments:', myAssignments.map(a => ({ date: a.date, shiftName: a.shift?.name, userName: a.user?.name })));
    for (const assignment of myAssignments) {
      const dateKey = normalizeDateKey(assignment.date);
      const shiftName = assignment.shift?.name;
      if (!dateKey || !shiftName) continue;

      const key = `${dateKey}-${shiftName}`;
      console.log('[buildStaffSlotMap] adding key:', key);
      map[key] = {
        assignedStaffId: assignment.user?._id || user.id,
        assignedStaffName: assignment.user?.name || user.name,
        shiftName,
        shiftTime: assignment.shift
          ? `${assignment.shift.startTime} - ${assignment.shift.endTime}`
          : '',
        notes: assignment.notes || ''
      };
    }
    return map;
  };

  const handleGenerate = async () => {
    if (!confirm('Tạo lịch mới cho tuần này? Lịch cũ (nếu có) sẽ được thay thế.')) return;
    setLoading(true);
    try {
      const res = await api.post('/schedule/generator/generate', { weekOffset });
      if (res.success) {
        setScheduleData(res.data);
        alert('Đã tạo lịch trống cho tuần! Vui lòng gán nhân viên vào từng ca.');
      }
    } catch (e) {
      alert('Lỗi khi tạo lịch: ' + (e.message || 'Vui lòng thử lại'));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStaff = async (slotId, staffId, branch) => {
    if (!staffId) return;
    console.log('[Schedule] handleAssignStaff - slotId:', slotId, 'staffId:', staffId, 'scheduleId:', scheduleData._id);
    setSavingSlot(slotId);
    try {
      const staff = staffList.find(s => s._id === staffId);
      const res = await api.patch(`/schedule/generator/${scheduleData._id}/slot`, {
        slotId,
        addStaffId: staffId,
        addStaffName: staff?.name || null,
        branch: branch || null,
        reason: 'Phân công thủ công bởi quản lý'
      });
      console.log('[Schedule] assign result:', res);
      if (res.success) {
        setScheduleData(prev => ({
          ...prev,
          slots: prev.slots.map(s =>
            (s._id?.toString() || `${s.dayKey}-${s.shiftName}`) === slotId
              ? res.data.slots.find(rs => (rs._id?.toString() || `${rs.dayKey}-${rs.shiftName}`) === slotId) || s
              : s
          )
        }));
        // Thông báo cho tất cả staff refresh lịch
        emitEvent(Events.SCHEDULE_UPDATED, { addedStaffId: staffId });
      }
    } catch (e) {
      console.error('[Schedule] handleAssignStaff error:', e);
    } finally {
      setSavingSlot(null);
    }
  };

  const handleRemoveStaffFromSlot = async (slotId, staffId) => {
    console.log('[Schedule] handleRemoveStaffFromSlot - slotId:', slotId, 'staffId:', staffId, 'scheduleId:', scheduleData._id);
    setSavingSlot(slotId);
    try {
      const res = await api.patch(`/schedule/generator/${scheduleData._id}/slot`, {
        slotId,
        removeStaffId: staffId,
        reason: 'Xóa phân công thủ công bởi quản lý'
      });
      console.log('[Schedule] remove result:', res);
      if (res.success) {
        // Update local state with the returned schedule data
        setScheduleData(prev => ({
          ...prev,
          slots: res.data.slots || prev.slots
        }));
        // Refresh all assignments from server to ensure consistency
        const weekStart = weekDates[0]?.dateStr;
        const weekEnd = weekDates[6]?.dateStr;
        if (weekStart && weekEnd) {
          const refreshRes = await api.get(`/schedule/generator/schedule?weekOffset=${weekOffset}`);
          if (refreshRes.success && refreshRes.data) {
            setScheduleData(refreshRes.data);
          }
        }
        // Thông báo cho tất cả staff refresh lịch
        emitEvent(Events.SCHEDULE_UPDATED, { removedStaffId: staffId });
      }
    } catch (e) {
      console.error('[Schedule] handleRemoveStaffFromSlot error:', e);
      alert('Lỗi khi xóa: ' + (e.message || 'Vui lòng thử lại'));
    } finally {
      setSavingSlot(null);
    }
  };

  const handleSaveSchedule = async () => {
    if (!confirm('Lưu và xuất bản lịch tuần? Nhân viên sẽ nhìn thấy lịch của mình.')) return;
    setSaving(true);
    try {
      // Publish the schedule
      const res = await api.patch(`/schedule/generator/${scheduleData._id}/publish`);
      if (res.success) {
        setScheduleData(prev => ({ ...prev, status: 'published' }));
        setPendingChanges({});
        setHasChanges(false);
        alert('Đã lưu và xuất bản lịch tuần! Nhân viên sẽ nhận được thông báo.');
      }
    } catch (e) {
      alert('Lỗi khi lưu lịch: ' + (e.message || 'Vui lòng thử lại'));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Xuất bản lịch? Nhân viên sẽ nhận được thông báo.')) return;
    setPublishing(true);
    try {
      const res = await api.patch(`/schedule/generator/${scheduleData._id}/publish`);
      if (res.success) setScheduleData(prev => ({ ...prev, status: 'published' }));
    } catch (e) {
      alert('Lỗi khi xuất bản');
    } finally {
      setPublishing(false);
    }
  };

  const handlePrevWeek = () => setWeekOffset(w => w - 1);
  const handleNextWeek = () => setWeekOffset(w => w + 1);
  const handleThisWeek = () => setWeekOffset(0);

  // Build grid: [day][shift] => slot
  const slotMap = isMySchedule ? buildStaffSlotMap() : {};
  if (!isMySchedule && scheduleData?.slots) {
    for (const s of scheduleData.slots) {
      const key = `${s.dayKey}-${s.shiftName}`;
      slotMap[key] = s;
    }
  }

  const formatDateVN = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  };
  const formatDateRangeVN = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const dateRange = weekDates.length
    ? `${formatDateVN(weekDates[0].dateStr)} – ${formatDateRangeVN(weekDates[6].dateStr)}`
    : '';

  const today = new Date();

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Đang tải lịch làm việc...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff' }}>
            Lịch Làm Việc
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {isAdmin ? 'Quản lý tạo lịch cho nhân viên' : 'Xem lịch làm việc của bạn'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAdmin && (
            <>
              <button className="btn-secondary" style={{ padding: '8px 16px' }} onClick={handleGenerate}>
                Tạo lịch tuần
              </button>
              {scheduleData && (
                <>
                  <button
                    className="btn-primary"
                    style={{ padding: '8px 16px', background: hasChanges ? '#f59e0b' : undefined }}
                    onClick={handleSaveSchedule}
                    disabled={saving}
                  >
                    {saving ? 'Đang lưu...' : hasChanges ? '💾 Lưu bảng lịch' : '✓ Đã lưu'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Week Navigation */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '8px' : '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
          <button className="btn-secondary" style={{ padding: isMobile ? '10px 16px' : '6px 12px', minHeight: isMobile ? '44px' : 'auto', minWidth: isMobile ? '44px' : 'auto' }} onClick={handlePrevWeek}>‹</button>
          {isMobile && (
            <button className="btn-secondary" style={{ padding: '10px 16px', minHeight: '44px', minWidth: '44px' }} onClick={handleNextWeek}>›</button>
          )}
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: isMobile ? '14px' : '15px', fontWeight: '600', color: '#fff' }}>
          Tuần {weekOffset === 0 ? 'này' : weekOffset === 1 ? 'tới' : weekOffset === -1 ? 'trước' : `+${weekOffset}`}
        </div>
        <div style={{ flex: 2, textAlign: 'center', fontSize: isMobile ? '12px' : '13px', color: 'var(--text-secondary)' }}>{dateRange}</div>
        {!isMobile && (
          <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={handleNextWeek}>›</button>
        )}
        {weekOffset !== 0 && (
          <button className="btn-secondary" style={{ padding: isMobile ? '10px 16px' : '6px 12px', fontSize: '12px', minHeight: isMobile ? '44px' : 'auto' }} onClick={handleThisWeek}>
            Tuần này
          </button>
        )}
      </div>

      {/* Schedule Grid */}
      {!scheduleData ? (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Chưa có lịch cho tuần này
          </div>
          {isAdmin && (
            <button className="btn-primary" style={{ padding: '10px 24px' }} onClick={handleGenerate}>
              Tạo lịch tuần này
            </button>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
          <div className="glass-card" style={{ padding: '16px', display: 'inline-block', minWidth: '100%' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '70px repeat(7, minmax(110px, 1fr))' : '80px repeat(7, minmax(120px, 1fr))', gap: '8px', minWidth: isMobile ? '840px' : '920px' }}>
            {/* Header Row */}
            <div></div>
            {weekDates.map((day, i) => {
              const isToday = day.dateStr === today.toLocaleDateString('en-CA');
              return (
                <div key={day.key} style={{
                  textAlign: 'center',
                  padding: '8px 4px',
                  background: isToday ? 'rgba(225, 29, 72, 0.15)' : 'transparent',
                  borderRadius: '6px',
                  border: isToday ? '1px solid var(--primary)' : '1px solid transparent'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{day.label}</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: isToday ? 'var(--primary)' : '#fff' }}>{day.dateStr.split('-')[2]}</div>
                </div>
              );
            })}

            {/* Shift Rows */}
            {SHIFT_NAMES.map(shiftName => (
              <Fragment key={shiftName}>
                {/* Shift Label */}
                <div style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  padding: '8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600'
                }}>
                  <div>{shiftName}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '400' }}>
                    {shiftName === 'Ca sáng' && '08:00 - 16:00'}
                    {shiftName === 'Ca tối' && '16:00 - 21:00'}
                    {shiftName === 'Ca khuya' && '21:00 - 23:59'}
                  </div>
                </div>

                {/* Cells for each day */}
                {weekDates.map(day => {
                  const key = `${day.key}-${shiftName}`;
                  const staffKey = `${day.dateStr}-${shiftName}`;
                  const slot = isMySchedule ? slotMap[staffKey] : slotMap[key];
                  const isToday = day.dateStr === today.toLocaleDateString('en-CA');
                  const hasStaff = !!(slot?.assignedStaff && slot.assignedStaff.length > 0);
                  const isSaving = savingSlot === (slot?._id?.toString() || key);

                  return (
                    <div key={key} style={{
                      padding: '8px',
                      background: isToday
                        ? hasStaff
                          ? 'rgba(16, 185, 129, 0.08)'
                          : 'rgba(225, 29, 72, 0.05)'
                        : hasStaff
                          ? 'rgba(255,255,255,0.03)'
                          : 'rgba(255,255,255,0.02)',
                      border: isToday
                        ? hasStaff
                          ? '1px solid rgba(16, 185, 129, 0.3)'
                          : '1px solid rgba(225, 29, 72, 0.2)'
                        : hasStaff
                          ? '1px solid var(--border-glass)'
                          : '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '8px',
                      minHeight: '100px',
                      position: 'relative'
                    }}>
                      {isAdmin ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {/* Staff chips */}
                          {(slot?.assignedStaff || []).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                              {slot.assignedStaff.map(a => (
                                <span key={a.id} style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  padding: '2px 6px', borderRadius: '4px',
                                  background: 'rgba(16, 185, 129, 0.15)', fontSize: '10px', color: '#10b981'
                                }}>
                                  {a.name}
                                  <button
                                    onClick={() => handleRemoveStaffFromSlot(slot?._id?.toString() || key, a.id)}
                                    disabled={saving}
                                    style={{
                                      background: 'none', border: 'none', color: '#10b981',
                                      cursor: 'pointer', padding: '0', fontSize: '12px', lineHeight: 1
                                    }}
                                  >×</button>
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Add staff dropdown */}
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignStaff(slot?._id?.toString() || key, e.target.value, slot?.branch || '');
                                e.target.value = '';
                              }
                            }}
                            disabled={saving}
                            style={{
                              width: '100%',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid var(--border-glass)',
                              borderRadius: '4px',
                              color: 'var(--text-muted)',
                              fontSize: '11px',
                              padding: '4px 6px',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">+ Thêm nhân viên</option>
                            {staffList
                              .filter(s => s.role === 'staff' && !(slot?.assignedStaff || []).some(a => a.id === s._id))
                              .map(s => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                              ))}
                          </select>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px', gap: '2px' }}>
                          {slot?.assignedStaffId === user.id ? (
                            <div style={{
                              fontSize: '12px',
                              color: '#10b981',
                              fontWeight: '600',
                              textAlign: 'center',
                              padding: '4px 8px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              borderRadius: '4px'
                            }}>
                              ✓ Ca của bạn
                            </div>
                          ) : (
                            <div style={{
                              fontSize: '12px',
                              color: 'var(--text-muted)',
                              fontWeight: '400',
                              textAlign: 'center'
                            }}>
                              {slot?.assignedStaffName || '—'}
                            </div>
                          )}
                        </div>
                      )}
                      {isSaving && (
                        <div style={{
                          position: 'absolute', top: '4px', right: '4px',
                          fontSize: '9px', color: 'var(--primary)'
                        }}>...</div>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
            </div>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <div style={{ width: '12px', height: '12px', background: 'rgba(16, 185, 129, 0.3)', border: '1px solid rgba(16, 185, 129, 0.5)', borderRadius: '3px' }} />
            Đã phân công
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <div style={{ width: '12px', height: '12px', background: 'rgba(225, 29, 72, 0.1)', border: '1px solid rgba(225, 29, 72, 0.3)', borderRadius: '3px' }} />
            Trống / Hôm nay
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <div style={{ width: '12px', height: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: '3px' }} />
              Chọn nhân viên từ danh sách
            </div>
          )}
        </div>
      </div>
      )}

      {/* Staff list reference for admin */}
      {isAdmin && staffList.length > 0 && (
        <div className="glass-card" style={{ padding: '16px', marginTop: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Danh sách nhân viên ({staffList.filter(s => s.role === 'staff').length} người)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {staffList.filter(s => s.role === 'staff').map(s => (
              <span key={s._id} style={{
                padding: '4px 10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: '4px',
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}>
                {s.name} {s.position ? `· ${s.position}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}