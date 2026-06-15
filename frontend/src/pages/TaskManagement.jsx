import { useState, useEffect, useCallback } from 'react';
import { api, getTaskId } from '../services/api';
import { onEvent, Events } from '../utils/events';
import { useMediaQuery } from '../hooks/useMediaQuery';

const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user_info') || '{}'); } catch { return {}; }
};

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_CONFIG = {
  pending:    { label: 'Chưa thực hiện', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  in_progress:{ label: 'Đang thực hiện', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  completed:  { label: 'Hoàn thành',     color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  cancelled:  { label: 'Đã hủy',         color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};
const PRIORITY_CONFIG = {
  urgent: { label: 'Khẩn cấp', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  high:   { label: 'Cao',       color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  medium: { label: 'Trung bình',color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  low:    { label: 'Thấp',      color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};
const CATEGORIES = ['Phục vụ', 'Thu ngân', 'Vệ sinh', 'Bảo dưỡng', 'Hành chính', 'Khác'];
const SHIFT_NAMES = ['Ca sáng', 'Ca tối', 'Ca khuya'];
const API_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const VN_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function TaskManagement() {
  const user = getUser();
  const isAdmin = user.isAdmin;
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [activeTab, setActiveTab] = useState('pool');
  const [taskPool, setTaskPool] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekDates, setWeekDates] = useState([]);
  const [showAddPoolModal, setShowAddPoolModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPoolTask, setSelectedPoolTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const [newPoolTask, setNewPoolTask] = useState({
    title: '', description: '', category: 'Khác', priority: 'medium'
  });

  const [assignForm, setAssignForm] = useState({
    dayKey: '', shiftName: '', staffId: '', staffName: ''
  });

  useEffect(() => {
    const dates = API_DAYS.map((key, i) => {
      const date = new Date();
      const dayOfWeek = date.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const mondayDate = new Date(date);
      mondayDate.setDate(date.getDate() + mondayOffset + weekOffset * 7);
      mondayDate.setDate(mondayDate.getDate() + i);
      const y = mondayDate.getFullYear();
      const m = String(mondayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(mondayDate.getDate()).padStart(2, '0');
      return { key, label: VN_DAYS[i], dateStr: `${y}-${m}-${dd}` };
    });
    setWeekDates(dates);
  }, [weekOffset]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [poolRes, assignedRes, staffRes, scheduleRes] = await Promise.all([
        api.get('/task-pool'),
        api.get(`/tasks/assigned?weekOffset=${weekOffset}`),
        api.get('/staff'),
        api.get(`/schedule/generator/schedule?weekOffset=${weekOffset}`)
      ]);
      if (poolRes.success) setTaskPool(poolRes.data);
      if (assignedRes.success) setAssignedTasks(assignedRes.data);
      if (staffRes.success) setStaffList(staffRes.data);
      if (scheduleRes.success) setScheduleData(scheduleRes.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [weekOffset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const unsub = onEvent(Events.SCHEDULE_UPDATED, () => fetchData());
    return unsub;
  }, [fetchData]);

  const getStaffForSlot = (dayKey, shiftName) => {
    const slot = scheduleData?.slots?.find(s => s.dayKey === dayKey && s.shiftName === shiftName);
    console.log('[getStaffForSlot]', { dayKey, shiftName, slot, slots: scheduleData?.slots });
    return slot?.assignedStaff || [];
  };

  const getTasksForSlot = (dayKey, shiftName) => {
    return assignedTasks.filter(t => t.dayKey === dayKey && t.shiftName === shiftName);
  };

  const getTasksForStaff = (staffId) => {
    return assignedTasks.filter(t => t.assignedToId === staffId || t.assignedToId === String(staffId));
  };

  // Tạo nhiệm vụ mới vào pool
  const handleAddPoolTask = async () => {
    if (!newPoolTask.title.trim()) {
      alert('Vui lòng nhập tiêu đề nhiệm vụ');
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.post('/task-pool', newPoolTask);
      if (data.success) {
        setTaskPool([data.data, ...taskPool]);
        setShowAddPoolModal(false);
        setNewPoolTask({ title: '', description: '', category: 'Khác', priority: 'medium' });
      }
    } catch (err) {
      alert(err.message || 'Không thể thêm nhiệm vụ');
    } finally {
      setSubmitting(false);
    }
  };

  // Xóa nhiệm vụ khỏi pool
  const handleDeletePoolTask = async (task) => {
    if (!confirm('Xóa nhiệm vụ này khỏi danh sách?')) return;
    try {
      const data = await api.delete(`/task-pool/${getTaskId(task)}`);
      if (data.success) {
        setTaskPool(taskPool.filter(t => getTaskId(t) !== getTaskId(task)));
      }
    } catch (err) {
      alert(err.message || 'Không thể xóa');
    }
  };

  // Phân công nhiệm vụ cho nhân viên
  const handleAssignTask = async () => {
    if (!assignForm.dayKey || !assignForm.shiftName || !assignForm.staffId) {
      alert('Vui lòng chọn đầy đủ ngày, ca và nhân viên');
      return;
    }
    setSubmitting(true);
    try {
      const staffInSlot = getStaffForSlot(assignForm.dayKey, assignForm.shiftName);
      const staff = staffInSlot.find(s => (s._id || s.id) === assignForm.staffId);
      if (!staff) {
        alert('Không tìm thấy nhân viên');
        setSubmitting(false);
        return;
      }
      const dateInfo = weekDates.find(d => d.key === assignForm.dayKey);
      const deadlineTime = assignForm.shiftName === 'Ca sáng' ? '12:00' : assignForm.shiftName === 'Ca tối' ? '22:00' : '06:00';
      const deadlineDate = dateInfo ? `${dateInfo.dateStr}T${deadlineTime}:00` : null;

      const data = await api.post('/task-pool/assign', {
        poolTaskId: selectedPoolTask._id,
        assignedTo: staff.name || staff.userName || 'Nhân viên',
        assignedToId: staff._id?.toString() || staff.id?.toString(),
        dayKey: assignForm.dayKey,
        shiftName: assignForm.shiftName,
        deadlineDate: deadlineDate,
        deadline: deadlineTime
      });

      if (data.success) {
        setAssignedTasks([...assignedTasks, data.data]);
        setShowAssignModal(false);
        setSelectedPoolTask(null);
        setAssignForm({ dayKey: '', shiftName: '', staffId: '', staffName: '' });
      }
    } catch (err) {
      alert(err.message || 'Không thể phân công');
    } finally {
      setSubmitting(false);
    }
  };

  // Cập nhật trạng thái nhiệm vụ đã phân
  const handleUpdateStatus = async (task, newStatus) => {
    try {
      const data = await api.patch(`/tasks/${getTaskId(task)}/status`, { status: newStatus });
      if (data.success) {
        setAssignedTasks(assignedTasks.map(t => getTaskId(t) === getTaskId(task) ? data.data : t));
      }
    } catch (err) {
      alert(err.message || 'Không thể cập nhật');
    }
  };

  // Xóa nhiệm vụ đã phân
  const handleDeleteAssigned = async (task) => {
    if (!confirm('Xóa nhiệm vụ đã phân công?')) return;
    try {
      const data = await api.delete(`/tasks/${getTaskId(task)}`);
      if (data.success) {
        setAssignedTasks(assignedTasks.filter(t => getTaskId(t) !== getTaskId(task)));
      }
    } catch (err) {
      alert(err.message || 'Không thể xóa');
    }
  };

  const openAssignModal = (poolTask) => {
    setSelectedPoolTask(poolTask);
    setShowAssignModal(true);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        <div>Đang tải dữ liệu...</div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff', margin: 0 }}>
            📋 Phân nhiệm vụ
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tạo nhiệm vụ và phân công cho nhân viên theo lịch ca
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isAdmin && activeTab === 'pool' && (
            <button className="btn-primary" onClick={() => setShowAddPoolModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '14px' }}>
              <span style={{ fontSize: '16px' }}>➕</span> Thêm nhiệm vụ
            </button>
          )}
        </div>
      </div>

      {/* Tab Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { key: 'pool', label: '📋 Danh sách nhiệm vụ', icon: '📋' },
          { key: 'schedule', label: '📅 Phân công theo ca', icon: '📅' },
          { key: 'staff', label: '👥 Theo nhân viên', icon: '👥' }
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
              background: activeTab === tab.key ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: DANH SÁCH NHIỆM VỤ */}
      {activeTab === 'pool' && (
        <div>
          <div className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#fff' }}>Danh sách nhiệm vụ mẫu</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{taskPool.length} nhiệm vụ</span>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Tạo các nhiệm vụ mẫu, sau đó phân công cho nhân viên theo lịch ca
            </p>
          </div>

          {taskPool.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
              <div>Chưa có nhiệm vụ nào</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>Nhấn "Thêm nhiệm vụ" để tạo mới</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {taskPool.map(task => {
                const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;
                return (
                  <div key={getTaskId(task)} className="glass-card"
                    style={{ border: '1px solid var(--border-glass)', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span style={{ padding: '2px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', color: pCfg.color, background: pCfg.bg }}>
                        {pCfg.label}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', background: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)' }}>
                        {task.category}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', margin: '0 0 8px 0' }}>
                      {task.title}
                    </h4>
                    {task.description && (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                        {task.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <button onClick={() => openAssignModal(task)}
                        style={{ flex: 1, padding: '8px', fontSize: '12px', background: 'var(--primary)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>
                        📅 Phân công
                      </button>
                      <button onClick={() => handleDeletePoolTask(task)}
                        style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: PHÂN CÔNG THEO CA */}
      {activeTab === 'schedule' && (
        <div>
          {/* Week Navigator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>
              ← Tuần trước
            </button>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
              {weekDates[0]?.dateStr ? new Date(weekDates[0].dateStr).toLocaleDateString('vi-VN') : '...'} - {weekDates[6]?.dateStr ? new Date(weekDates[6].dateStr).toLocaleDateString('vi-VN') : '...'}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>
              Tuần sau →
            </button>
          </div>

          {/* Schedule Grid */}
          <div className="glass-card" style={{ padding: '16px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.1)', width: '80px' }}>Ca</th>
                  {weekDates.map(d => (
                    <th key={d.key} style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <div>{d.label}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '400' }}>{d.dateStr?.slice(5)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SHIFT_NAMES.map(shiftName => (
                  <tr key={shiftName}>
                    <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--primary)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                      {shiftName}
                    </td>
                    {weekDates.map(d => {
                      const slotTasks = getTasksForSlot(d.key, shiftName);
                      return (
                        <td key={`${d.key}-${shiftName}`} style={{ padding: '8px', verticalAlign: 'top', borderRight: '1px solid rgba(255,255,255,0.05)', minHeight: '120px' }}>
                          {/* Tasks */}
                          {slotTasks.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {slotTasks.map(task => {
                                const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;
                                const sCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                                return (
                                  <div key={getTaskId(task)}
                                    style={{
                                      padding: '6px 8px', borderRadius: '6px', fontSize: '10px',
                                      background: 'rgba(0,0,0,0.3)', border: `1px solid ${pCfg.color}40`,
                                      opacity: task.status === 'completed' ? '0.5' : '1'
                                    }}>
                                    <div style={{ color: pCfg.color, fontWeight: '600', marginBottom: '2px' }}>
                                      {task.title}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>👤 {task.assignedTo}</div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button onClick={() => handleUpdateStatus(task, task.status === 'completed' ? 'pending' : 'completed')}
                                        style={{ flex: 1, padding: '2px 4px', fontSize: '9px', background: sCfg.bg, border: 'none', borderRadius: '3px', color: sCfg.color, cursor: 'pointer' }}>
                                        {task.status === 'completed' ? '↩️' : '✓'}
                                      </button>
                                      <button onClick={() => handleDeleteAssigned(task)}
                                        style={{ padding: '2px 4px', fontSize: '9px', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '3px', color: '#ef4444', cursor: 'pointer' }}>
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text-muted)', fontSize: '10px' }}>
                              Chưa có nhiệm vụ
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: THEO NHÂN VIÊN */}
      {activeTab === 'staff' && (
        <div>
          <div className="glass-card" style={{ padding: '16px', overflowX: 'auto' }}>
            {assignedTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
                <div>Chưa có nhiệm vụ nào được phân công</div>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Nhiệm vụ</th>
                    <th>Ca/Ngày</th>
                    <th>Ưu tiên</th>
                    <th>Trạng thái</th>
                    <th style={{ width: '100px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Group tasks by assignedTo
                    const grouped = {};
                    assignedTasks.forEach(task => {
                      const key = task.assignedTo || 'Không xác định';
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(task);
                    });
                    return Object.entries(grouped).map(([staffName, tasks]) => (
                      tasks.map(task => {
                        const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;
                        const sCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                        return (
                          <tr key={getTaskId(task)} style={{ opacity: task.status === 'completed' ? '0.6' : '1' }}>
                            <td style={{ fontWeight: '600' }}>👤 {staffName}</td>
                            <td style={{ maxWidth: '200px' }}>
                              <div style={{ fontWeight: '500' }}>{task.title}</div>
                            </td>
                            <td>
                              <div style={{ fontSize: '12px' }}>{task.shiftName}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{task.dayKey}</div>
                            </td>
                            <td>
                              <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', color: pCfg.color, background: pCfg.bg }}>
                                {pCfg.label}
                              </span>
                            </td>
                            <td>
                              <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '600', color: sCfg.color, background: sCfg.bg }}>
                                {sCfg.label}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => handleUpdateStatus(task, task.status === 'completed' ? 'pending' : 'completed')}
                                  style={{ padding: '4px 8px', fontSize: '11px', background: sCfg.bg, border: 'none', borderRadius: '4px', color: sCfg.color, cursor: 'pointer' }}>
                                  {task.status === 'completed' ? '↩️' : '✓'}
                                </button>
                                <button onClick={() => handleDeleteAssigned(task)}
                                  style={{ padding: '4px 6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px', color: '#ef4444', cursor: 'pointer' }}>
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ));
                  })()}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Thêm nhiệm vụ vào pool */}
      {showAddPoolModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: isMobile ? '0' : '16px', padding: isMobile ? '20px' : '28px', width: '100%', maxWidth: isMobile ? '100%' : '480px', maxHeight: isMobile ? '100vh' : '90vh', height: isMobile ? '100vh' : 'auto', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: '700', color: '#fff', margin: 0 }}>
                Thêm nhiệm vụ mới
              </h2>
              <button onClick={() => setShowAddPoolModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Tiêu đề nhiệm vụ *</label>
                <input type="text" className="form-input" placeholder="VD: Dọn bàn, phục vụ khách..." style={{ padding: '10px 14px', fontSize: '14px' }}
                  value={newPoolTask.title} onChange={e => setNewPoolTask({ ...newPoolTask, title: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea className="form-input" rows="3" style={{ padding: '10px 14px', fontSize: '13px', resize: 'vertical' }}
                  value={newPoolTask.description} onChange={e => setNewPoolTask({ ...newPoolTask, description: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Mức ưu tiên</label>
                  <select className="form-input" style={{ padding: '10px 14px', fontSize: '13px', background: 'var(--bg-darker)' }}
                    value={newPoolTask.priority} onChange={e => setNewPoolTask({ ...newPoolTask, priority: e.target.value })}>
                    <option value="low">⬜ Thấp</option>
                    <option value="medium">🟡 Trung bình</option>
                    <option value="high">🟠 Cao</option>
                    <option value="urgent">🔴 Khẩn cấp</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Danh mục</label>
                  <select className="form-input" style={{ padding: '10px 14px', fontSize: '13px', background: 'var(--bg-darker)' }}
                    value={newPoolTask.category} onChange={e => setNewPoolTask({ ...newPoolTask, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '12px', fontSize: '14px' }} onClick={() => setShowAddPoolModal(false)}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '14px' }} onClick={handleAddPoolTask} disabled={submitting}>
                {submitting ? '⏳ Đang thêm...' : '✅ Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Phân công nhiệm vụ */}
      {showAssignModal && selectedPoolTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: isMobile ? '0' : '16px', padding: isMobile ? '20px' : '28px', width: '100%', maxWidth: isMobile ? '100%' : '480px', maxHeight: isMobile ? '100vh' : '90vh', height: isMobile ? '100vh' : 'auto', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: '700', color: '#fff', margin: 0 }}>
                Phân công nhiệm vụ
              </h2>
              <button onClick={() => { setShowAssignModal(false); setSelectedPoolTask(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Nhiệm vụ</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{selectedPoolTask.title}</div>
              {selectedPoolTask.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{selectedPoolTask.description}</div>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Ngày *</label>
                  <select className="form-input" style={{ padding: '10px 14px', fontSize: '13px', background: 'var(--bg-darker)' }}
                    value={assignForm.dayKey} onChange={e => setAssignForm({ ...assignForm, dayKey: e.target.value, staffId: '', staffName: '' })}>
                    <option value="">— Chọn ngày —</option>
                    {weekDates.map(d => <option key={d.key} value={d.key}>{d.label} ({d.dateStr})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ca *</label>
                  <select className="form-input" style={{ padding: '10px 14px', fontSize: '13px', background: 'var(--bg-darker)' }}
                    value={assignForm.shiftName} onChange={e => setAssignForm({ ...assignForm, shiftName: e.target.value, staffId: '', staffName: '' })}>
                    <option value="">— Chọn ca —</option>
                    {SHIFT_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Danh sách nhân viên có ca trong ngày đã chọn */}
              {assignForm.dayKey && assignForm.shiftName && (
                <div className="form-group">
                  <label className="form-label">Nhân viên *</label>
                  {(() => {
                    const staffInSlot = getStaffForSlot(assignForm.dayKey, assignForm.shiftName);
                    if (staffInSlot.length === 0) {
                      return (
                        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#ef4444' }}>Không có nhân viên nào có ca trong ngày này.</div>
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                        {staffInSlot.map((s, idx) => {
                          const staffId = String(s._id || s.id || '');
                          const staffName = s.name || s.userName || 'NV';
                          const isSelected = String(assignForm.staffId) === staffId;
                          return (
                            <div key={staffId || idx}
                              onClick={() => setAssignForm({ ...assignForm, staffId, staffName })}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: `2px solid ${isSelected ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                                background: isSelected ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.2s'
                              }}>
                              <div style={{
                                width: '20px', height: '20px', borderRadius: '50%',
                                border: `2px solid ${isSelected ? '#10b981' : 'rgba(255,255,255,0.3)'}`,
                                background: isSelected ? '#10b981' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                              </div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{staffName}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {!assignForm.dayKey && !assignForm.shiftName && (
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Vui lòng chọn ngày và ca để xem nhân viên có mặt</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '12px', fontSize: '14px' }}
                onClick={() => { setShowAssignModal(false); setSelectedPoolTask(null); }}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '14px' }} onClick={handleAssignTask} disabled={submitting}>
                {submitting ? '⏳ Đang phân công...' : '✅ Phân công'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
