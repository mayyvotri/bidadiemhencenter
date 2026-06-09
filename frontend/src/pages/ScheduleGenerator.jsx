import { useState, useEffect, useCallback } from 'react';
import { scheduleGeneratorApi, api } from '../services/api';

const getUser = () => { try { return JSON.parse(localStorage.getItem('user_info') || '{}'); } catch { return {}; } };

const VN_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const fmt = (n) => n == null ? '0' : new Intl.NumberFormat('vi-VN').format(Math.round(n));

const REC_BADGE = {
  info: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', label: 'ℹ️ Thông tin' },
  suggestion: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: '💡 Gợi ý' },
  warning: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', label: '⚠️ Cảnh báo' },
  conflict: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: '🚨 Xung đột' }
};

export default function ScheduleGenerator() {
  const user = getUser();
  const isAdmin = user.isAdmin;

  const [weekOffset, setWeekOffset] = useState(0);
  const [weekLabel, setWeekLabel] = useState('');
  const [schedule, setSchedule] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [config, setConfig] = useState({
    minHoursPerWeek: 20,
    maxHoursPerWeek: 48,
    maxConsecutiveDays: 6,
    targetHoursPerEmployee: 40,
    coverWeekends: true,
    preferWeekendRotation: true
  });
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [editingSlot, setEditingSlot] = useState(null);
  const [editForm, setEditForm] = useState({ assignedStaffId: '', reason: '' });
  const [historySchedules, setHistorySchedules] = useState([]);

  const computeWeekLabel = (offset) => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day) + offset * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${monday.getDate()}/${monday.getMonth() + 1} - ${sunday.getDate()}/${sunday.getMonth() + 1}/${sunday.getFullYear()}`;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedData, availData, staffData] = await Promise.all([
        scheduleGeneratorApi.getSchedule(weekOffset),
        isAdmin ? scheduleGeneratorApi.getAvailability(weekOffset) : Promise.resolve({ success: true, data: null }),
        api.get('/staff')
      ]);
      if (staffData.success) setStaffList(staffData.data);
      if (schedData.success) setSchedule(schedData.data);
      if (availData.success) setAvailability(availData.data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [weekOffset, isAdmin]);

  useEffect(() => {
    setWeekLabel(computeWeekLabel(weekOffset));
    fetchData();
  }, [weekOffset, fetchData]);

  const handleGenerate = async () => {
    if (!confirm(`Tạo lịch cho tuần ${weekLabel}?\n\nCấu hình:\n• Mục tiêu: ${config.targetHoursPerEmployee}h/nhân viên\n• Tối đa: ${config.maxHoursPerWeek}h\n• Tối thiểu: ${config.minHoursPerWeek}h\n• Cuối tuần luân phiên: ${config.preferWeekendRotation ? 'Có' : 'Không'}`)) return;

    setGenLoading(true);
    try {
      const data = await scheduleGeneratorApi.generate({ weekOffset, config });
      if (data.success) {
        setSchedule(data.data);
        alert(`Đã tạo lịch! Coverage: ${data.data.coverageStats.coveragePercent}%`);
      }
    } catch (err) { alert(err.message || 'Lỗi khi tạo lịch'); }
    finally { setGenLoading(false); }
  };

  const handlePublish = async () => {
    if (!schedule?._id) return;
    if (!confirm('Công bố lịch biểu? Nhân viên sẽ nhận thông báo.')) return;
    try {
      const data = await scheduleGeneratorApi.publish(schedule._id);
      if (data.success) { setSchedule({ ...schedule, status: 'published' }); alert('Đã công bố lịch biểu!'); }
    } catch (err) { alert(err.message || 'Lỗi'); }
  };

  const handleSlotEdit = (slot) => {
    setEditingSlot(slot);
    setEditForm({ assignedStaffId: slot.assignedStaffId || '', reason: '' });
  };

  const handleSlotSave = async () => {
    if (!editingSlot || !schedule?._id) return;
    const staff = staffList.find(s => s.id === editForm.assignedStaffId);
    try {
      const data = await scheduleGeneratorApi.updateSlot(schedule._id, {
        slotId: editingSlot._id || `${editingSlot.dayKey}-${editingSlot.shiftName}`,
        assignedStaffId: editForm.assignedStaffId,
        assignedStaffName: staff?.name || '',
        reason: editForm.reason || 'Chỉnh sửa thủ công'
      });
      if (data.success) setSchedule(data.data);
      setEditingSlot(null);
    } catch (err) { alert(err.message || 'Lỗi khi lưu'); }
  };

  const groupedSlots = schedule?.slots
    ? DAY_KEYS.map(dayKey => ({
        dayKey,
        dayLabel: VN_DAYS[DAY_KEYS.indexOf(dayKey)],
        slots: schedule.slots.filter(s => s.dayKey === dayKey)
      }))
    : [];

  const getStaffByDept = (dept) => staffList.filter(s => s.status === 'Đang làm' && s.dept === dept);
  const depts = [...new Set(staffList.map(s => s.dept).filter(Boolean))];

  if (!isAdmin) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'left' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>AI Tạo Lịch</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>Chức năng chỉ dành cho quản lý.</p>
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Bạn không có quyền truy cập trang này.
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff' }}>
            🤖 AI Tạo Lịch
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Tự động tạo lịch biểu thông minh dựa trên dữ liệu thực tế
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Week Navigator */}
          <button onClick={() => setWeekOffset(w => w - 1)} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)',
            color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px'
          }}>◀</button>
          <div style={{
            padding: '8px 16px', background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)',
            borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#fff', minWidth: '180px', textAlign: 'center'
          }}>
            {weekLabel}
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)',
            color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px'
          }}>▶</button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} style={{
              background: 'var(--primary)', border: 'none', color: '#fff',
              padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
            }}>Tuần này</button>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-primary" onClick={handleGenerate} disabled={genLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {genLoading ? '⏳ Đang tạo...' : '⚡ Tạo lịch AI'}
        </button>

        <div style={{ height: '24px', width: '1px', background: 'var(--border-glass)' }} />

        {depts.map(dept => (
          <div key={dept} style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'center' }}>{dept}:</span>
            {getStaffByDept(dept).slice(0, 3).map(s => (
              <span key={s.id} style={{
                fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-glass)'
              }}>{s.name.split(' ').slice(-1)[0]}</span>
            ))}
            {getStaffByDept(dept).length > 3 && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>+{getStaffByDept(dept).length - 3}</span>
            )}
          </div>
        ))}

        {schedule && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            {schedule.status === 'draft' && (
              <button className="btn-primary" onClick={handlePublish} style={{ background: 'rgba(16,185,129,0.2)', borderColor: 'var(--success)' }}>
                📢 Công bố lịch
              </button>
            )}
            <span className={`badge ${schedule.status === 'published' ? 'badge-success' : 'badge-muted'}`}>
              {schedule.status === 'published' ? 'Đã công bố' : 'Bản nháp'}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {[
          { key: 'schedule', label: '📅 Lịch biểu' },
          { key: 'staff', label: '👥 Nhân viên' },
          { key: 'config', label: '⚙️ Cấu hình' },
          { key: 'history', label: '📜 Lịch sử' }
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600',
              background: activeTab === t.key ? 'var(--primary)' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--text-secondary)'
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Schedule */}
      {activeTab === 'schedule' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Đang tải lịch biểu...</div>
          ) : !schedule ? (
            <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📅</div>
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>Chưa có lịch biểu cho tuần này</div>
              <div style={{ fontSize: '13px' }}>Nhấn <strong style={{ color: 'var(--primary)' }}>Tạo lịch AI</strong> để bắt đầu</div>
            </div>
          ) : (
            <>
              {/* Coverage + Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Tổng ca', value: schedule.coverageStats?.totalSlots || 0 },
                  { label: 'Đã phân', value: schedule.coverageStats?.filledSlots || 0 },
                  { label: 'Chưa phân', value: schedule.coverageStats?.emptySlots || 0 },
                  { label: 'Coverage', value: (schedule.coverageStats?.coveragePercent || 0) + '%', color: (schedule.coverageStats?.coveragePercent || 0) >= 80 ? 'var(--success)' : 'var(--primary)' },
                  { label: 'Nhân viên', value: schedule.employeeStats?.length || 0 }
                ].map(s => (
                  <div className="glass-card" key={s.label} style={{ padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: s.color || '#fff' }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>
                {/* Schedule Grid */}
                <div className="glass-card" style={{ padding: '20px', overflowX: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Lịch biểu tuần {weekLabel}</h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      ● Tự động &nbsp; ● Thủ công &nbsp; ○ Trống
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px 6px', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-glass)' }}>Ngày</th>
                        {['Ca sáng\n08-14h', 'Ca chiều\n14-20h', 'Ca tối\n18-23h'].map((s, i) => (
                          <th key={i} style={{ padding: '8px 6px', color: 'var(--text-muted)', textAlign: 'center', borderBottom: '1px solid var(--border-glass)' }}>{s}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedSlots.map(({ dayKey, dayLabel, slots }) => {
                        const dateStr = slots[0]?.date || '';
                        const isWeekend = ['Sat', 'Sun'].includes(dayKey);
                        return (
                          <tr key={dayKey} style={{ background: isWeekend ? 'rgba(225,29,72,0.02)' : 'transparent' }}>
                            <td style={{ padding: '10px 6px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <div style={{ fontWeight: '700', color: isWeekend ? 'var(--primary)' : '#fff' }}>{dayLabel}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{dateStr}</div>
                            </td>
                            {[0, 1, 2].map(idx => {
                              const slot = slots[idx];
                              if (!slot) return <td key={idx} style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }} />;
                              const hasStaff = !!slot.assignedStaffId;
                              const isAuto = slot.status === 'auto';
                              return (
                                <td key={idx} style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'top' }}>
                                  <div onClick={() => handleSlotEdit(slot)} style={{
                                    padding: '8px',
                                    background: hasStaff
                                      ? isAuto ? 'rgba(59,130,246,0.08)' : 'rgba(16,185,129,0.08)'
                                      : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${hasStaff ? (isAuto ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)') : 'rgba(255,255,255,0.06)'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    minHeight: '72px',
                                    transition: 'all 0.15s'
                                  }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                      {slot.status === 'auto' ? '●' : slot.status === 'manual' ? '✏️' : '○'}
                                    </div>
                                    {hasStaff ? (
                                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>{slot.assignedStaffName}</div>
                                    ) : (
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Trống</div>
                                    )}
                                    {hasStaff && (
                                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{slot.reason?.slice(0, 20) || ''}</div>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Recommendations Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Coverage */}
                  <div className="glass-card" style={{ padding: '16px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>📊 Coverage</h4>
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Đã phân công</span>
                        <span style={{ color: '#fff', fontWeight: '600' }}>{schedule.coverageStats?.coveragePercent || 0}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${schedule.coverageStats?.coveragePercent || 0}%`,
                          height: '100%',
                          background: (schedule.coverageStats?.coveragePercent || 0) >= 80 ? 'var(--success)' : 'var(--primary)',
                          transition: 'width 0.5s'
                        }} />
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                      {schedule.coverageStats?.filledSlots || 0}/{schedule.coverageStats?.totalSlots || 0} ca đã phân
                      {(schedule.coverageStats?.emptySlots || 0) > 0 && (
                        <span style={{ color: 'var(--primary)' }}> · Còn {(schedule.coverageStats?.emptySlots)} ca trống</span>
                      )}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="glass-card" style={{ padding: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>💡 AI Recommendations</h4>
                    {(!schedule.recommendations || schedule.recommendations.length === 0) ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                        Không có vấn đề gì được phát hiện ✨
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {schedule.recommendations.map((rec, i) => {
                          const cfg = REC_BADGE[rec.type] || REC_BADGE.info;
                          return (
                            <div key={i} style={{ padding: '10px', background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '11px', color: cfg.color, fontWeight: '600' }}>{cfg.label}</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>P{rec.priority}</span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#fff', lineHeight: '1.4', marginBottom: rec.suggestedFix ? '4px' : 0 }}>
                                {rec.message}
                              </div>
                              {rec.suggestedFix && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                                  → {rec.suggestedFix}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Employee Fairness */}
                  <div className="glass-card" style={{ padding: '16px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>⚖️ Phân bổ giờ làm</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {schedule.employeeStats?.map(st => (
                        <div key={st.staffId} style={{ fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ color: '#fff' }}>{st.staffName}</span>
                            <span style={{ color: st.totalHours > config.maxHoursPerWeek ? 'var(--danger)' : '#fff' }}>
                              {st.totalHours}h / {st.daysWorked} ca
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, (st.totalHours / config.targetHoursPerEmployee) * 100)}%`,
                              height: '100%',
                              background: st.fairnessScore >= 70 ? 'var(--success)' : st.fairnessScore >= 50 ? '#f59e0b' : 'var(--danger)',
                              transition: 'width 0.3s'
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* TAB: Staff */}
      {activeTab === 'staff' && (
        <>
          {availability ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                {[
                  { label: 'Tổng nhân viên', value: availability.summary.totalStaff },
                  { label: 'Khả dụng', value: availability.summary.available, color: 'var(--success)' },
                  { label: 'Đang nghỉ phép', value: availability.summary.onLeave, color: availability.summary.onLeave > 0 ? 'var(--primary)' : 'var(--text-secondary)' }
                ].map(s => (
                  <div className="glass-card" key={s.label} style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: s.color || '#fff' }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>NHÂN VIÊN</th>
                      <th>BỘ PHẬN</th>
                      <th>TRẠNG THÁI</th>
                      <th>GIỜ GẦN ĐÂY</th>
                      <th>NGÀY GẦN ĐÂY</th>
                      <th>GHI CHÚ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availability.analysis.map(st => (
                      <tr key={st.staffId}>
                        <td style={{ fontWeight: '600', color: '#fff' }}>{st.staffName}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{st.dept}</td>
                        <td>
                          <span className={`badge ${st.status === 'available' ? 'badge-success' : 'badge-warning'}`}>
                            {st.status === 'available' ? '✓ Khả dụng' : '🛏 Nghỉ phép'}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#fff' }}>{st.recentHours?.toFixed(1) || 0}h</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{st.recentDays || 0}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {st.leaveInfo ? `${st.leaveInfo.leaveType} (${new Date(st.leaveInfo.startDate).toLocaleDateString('vi-VN')} - ${new Date(st.leaveInfo.endDate).toLocaleDateString('vi-VN')})` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Nhấn "Tạo lịch AI" trước để xem phân tích nhân viên
            </div>
          )}
        </>
      )}

      {/* TAB: Config */}
      {activeTab === 'config' && (
        <div className="glass-card" style={{ padding: '24px', maxWidth: '600px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>⚙️ Cấu hình AI</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { field: 'targetHoursPerEmployee', label: 'Giờ mục tiêu / nhân viên', suffix: 'h', min: 20, max: 60 },
              { field: 'minHoursPerWeek', label: 'Số giờ tối thiểu', suffix: 'h', min: 0, max: 40 },
              { field: 'maxHoursPerWeek', label: 'Số giờ tối đa', suffix: 'h', min: 40, max: 72 },
              { field: 'maxConsecutiveDays', label: 'Ngày làm liên tiếp tối đa', suffix: ' ngày', min: 3, max: 7 },
            ].map(item => (
              <div key={item.field} className="form-group">
                <label className="form-label">{item.label}</label>
                <input type="number" className="form-input"
                  min={item.min} max={item.max}
                  value={config[item.field]}
                  onChange={e => setConfig({ ...config, [item.field]: Number(e.target.value) })} />
              </div>
            ))}
            {[
              { field: 'coverWeekends', label: 'Đảm bảo phủ ca cuối tuần' },
              { field: 'preferWeekendRotation', label: 'Luân phiên ca cuối tuần giữa nhân viên' },
            ].map(item => (
              <div key={item.field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#fff' }}>{item.label}</span>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }}
                    checked={config[item.field]} onChange={e => setConfig({ ...config, [item.field]: e.target.checked })} />
                  <span style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: config[item.field] ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                    borderRadius: '24px', transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute', content: '', height: '18px', width: '18px',
                      left: config[item.field] ? '24px' : '3px', bottom: '3px',
                      background: '#fff', borderRadius: '50%', transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: History */}
      {activeTab === 'history' && (
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>TUẦN</th>
                <th>TRẠNG THÁI</th>
                <th>COVERAGE</th>
                <th>NHÂN VIÊN</th>
                <th>NGƯỜI TẠO</th>
                <th>NGÀY TẠO</th>
              </tr>
            </thead>
            <tbody>
              {historySchedules.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Chưa có lịch sử lịch biểu
                </td></tr>
              ) : historySchedules.map(s => (
                <tr key={s._id}>
                  <td style={{ fontWeight: '600', color: '#fff' }}>
                    {new Date(s.weekStart).toLocaleDateString('vi-VN')} - {new Date(s.weekEnd).toLocaleDateString('vi-VN')}
                  </td>
                  <td><span className={`badge ${s.status === 'published' ? 'badge-success' : s.status === 'archived' ? 'badge-muted' : 'badge-warning'}`}>{s.status}</span></td>
                  <td style={{ color: '#fff' }}>{s.coverageStats?.coveragePercent || 0}%</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.employeeStats?.length || 0}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.generatedByName || '—'}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {s.generatedAt ? new Date(s.generatedAt).toLocaleDateString('vi-VN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slot Edit Modal */}
      {editingSlot && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ padding: '24px', width: '100%', maxWidth: '480px', background: '#0d111a' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>Phân công ca</h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {editingSlot.dayLabel} - {editingSlot.date} · {editingSlot.shiftName} ({editingSlot.shiftTime})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Nhân viên</label>
                <select className="form-input" style={{ background: 'var(--bg-darker)' }}
                  value={editForm.assignedStaffId} onChange={e => setEditForm({ ...editForm, assignedStaffId: e.target.value })}>
                  <option value="">— Để trống —</option>
                  {staffList.filter(s => s.status === 'Đang làm').map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.dept})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú</label>
                <input type="text" className="form-input"
                  placeholder="VD: Thay đổi theo yêu cầu nhân viên"
                  value={editForm.reason} onChange={e => setEditForm({ ...editForm, reason: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setEditingSlot(null)}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1, padding: '10px' }} onClick={handleSlotSave}>Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
