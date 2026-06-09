import { useState, useEffect } from 'react';
import { api } from '../services/api';

const API_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const VN_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const buildWeeklySchedule = (shifts) => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return API_DAYS.map((key, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dayShifts = shifts?.[key] || [];
    const shift = dayShifts[0];
    const isToday = date.toDateString() === today.toDateString();

    return {
      day: VN_DAYS[i],
      dayKey: key,
      date: date.getDate(),
      shift: shift?.name || null,
      time: shift?.time || null,
      role: shift?.role || null,
      branch: shift?.branch || null,
      assignedTo: shift?.assignedTo || null,
      shiftId: shift?.id || null,
      status: isToday && shift ? 'ĐANG LÀM' : shift ? 'Đã phân công' : 'Nghỉ',
      isToday
    };
  });
};

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user_info') || '{}');
  } catch {
    return {};
  }
};

export default function Schedule() {
  const [viewMode, setViewMode] = useState('week');
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [allShifts, setAllShifts] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [swapForm, setSwapForm] = useState({
    requesterShiftId: '',
    requesterShiftName: '',
    requesterShiftTime: '',
    requesterShiftDay: '',
    targetStaffId: '',
    targetStaffName: '',
    targetShiftId: '',
    targetShiftName: '',
    targetShiftTime: '',
    targetShiftDay: '',
    reason: ''
  });
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [swapLoading, setSwapLoading] = useState(false);

  const user = getUser();
  const isAdmin = user.isAdmin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [scheduleData, swapsData, staffData] = await Promise.all([
          api.get('/schedule'),
          api.get('/schedule/swaps'),
          api.get('/staff')
        ]);
        if (scheduleData.success) {
          setWeeklySchedule(buildWeeklySchedule(scheduleData.shifts));
          const flat = [];
          API_DAYS.forEach((key, i) => {
            (scheduleData.shifts[key] || []).forEach(s => {
              flat.push({ ...s, dayKey: key, dayLabel: VN_DAYS[i] });
            });
          });
          setAllShifts(flat);
        }
        if (swapsData.success) {
          setSwapRequests(swapsData.requests);
          setPendingCount(swapsData.pendingCount || 0);
        }
        if (staffData.success) setStaffList(staffData.data);
      } catch {
        setWeeklySchedule(buildWeeklySchedule({}));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSwapSubmit = async () => {
    if (!swapForm.requesterShiftId || !swapForm.targetStaffId || !swapForm.reason) {
      alert('Vui lòng điền đầy đủ thông tin đổi ca');
      return;
    }
    setSwapLoading(true);
    try {
      const data = await api.post('/schedule/swap', swapForm);
      if (data.success) {
        setSwapRequests([data.request, ...swapRequests]);
        setShowSwapModal(false);
        setSwapForm({
          requesterShiftId: '', requesterShiftName: '', requesterShiftTime: '', requesterShiftDay: '',
          targetStaffId: '', targetStaffName: '', targetShiftId: '',
          targetShiftName: '', targetShiftTime: '', targetShiftDay: '', reason: ''
        });
      }
    } catch (err) {
      alert(err.message || 'Không thể gửi yêu cầu đổi ca');
    } finally {
      setSwapLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!confirm('Duyệt yêu cầu đổi ca này?')) return;
    try {
      const data = await api.patch(`/schedule/swaps/${id}/approve`);
      if (data.success) {
        setSwapRequests(swapRequests.map(r => r._id === id ? data.request : r));
        setPendingCount(Math.max(0, pendingCount - 1));
      }
    } catch (err) {
      alert(err.message || 'Không thể duyệt yêu cầu');
    }
  };

  const handleReject = async (id) => {
    if (!confirm('Từ chối yêu cầu đổi ca này?')) return;
    try {
      const data = await api.patch(`/schedule/swaps/${id}/reject`);
      if (data.success) {
        setSwapRequests(swapRequests.map(r => r._id === id ? data.request : r));
        setPendingCount(Math.max(0, pendingCount - 1));
      }
    } catch (err) {
      alert(err.message || 'Không thể từ chối yêu cầu');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Hủy yêu cầu đổi ca này?')) return;
    try {
      const data = await api.patch(`/schedule/swaps/${id}/cancel`);
      if (data.success) {
        setSwapRequests(swapRequests.map(r => r._id === id ? data.request : r));
      }
    } catch (err) {
      alert(err.message || 'Không thể hủy yêu cầu');
    }
  };

  const openSwapModal = (shift) => {
    if (!shift.shiftId) return;
    setSwapForm({
      requesterShiftId: shift.shiftId,
      requesterShiftName: shift.shift,
      requesterShiftTime: shift.time,
      requesterShiftDay: `${shift.day} - ${shift.date}`,
      targetStaffId: '',
      targetStaffName: '',
      targetShiftId: '',
      targetShiftName: '',
      targetShiftTime: '',
      targetShiftDay: '',
      reason: ''
    });
    setShowSwapModal(true);
  };

  const handleTargetStaffChange = (staffId) => {
    const staff = staffList.find(s => s.id === staffId);
    const staffShifts = allShifts.filter(s => s.assignedTo === staff?.name);
    setSwapForm(prev => ({
      ...prev,
      targetStaffId: staffId,
      targetStaffName: staff?.name || '',
      targetShiftId: '',
      targetShiftName: '',
      targetShiftTime: '',
      targetShiftDay: ''
    }));
  };

  const handleTargetShiftChange = (shiftId) => {
    const shift = allShifts.find(s => s.id === shiftId);
    if (!shift) return;
    setSwapForm(prev => ({
      ...prev,
      targetShiftId: shift.id,
      targetShiftName: shift.name,
      targetShiftTime: shift.time,
      targetShiftDay: `${shift.dayLabel} - ${shift.date}`
    }));
  };

  const myShifts = allShifts.filter(s => s.assignedTo === user.name);
  const targetStaff = staffList.find(s => s.id === swapForm.targetStaffId);
  const targetShifts = allShifts.filter(s => s.assignedTo === targetStaff?.name);
  const now = new Date();
  const monthLabel = `Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <span className="badge badge-success">Đã duyệt</span>;
      case 'rejected': return <span className="badge badge-danger">Từ chối</span>;
      case 'cancelled': return <span className="badge badge-muted">Đã hủy</span>;
      default: return <span className="badge badge-warning">Chờ duyệt</span>;
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Đang tải lịch làm việc...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff' }}>
            Lịch Làm Việc
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Quản lý ca làm việc và đăng ký đổi ca
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {isAdmin && pendingCount > 0 && (
            <span style={{
              background: 'var(--primary)', color: '#fff', padding: '6px 14px', borderRadius: '8px',
              fontSize: '12px', fontWeight: '600'
            }}>
              {pendingCount} yêu cầu đổi ca chờ duyệt
            </span>
          )}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Ca của tôi tuần này
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>{myShifts.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Ca</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Đổi ca chờ duyệt
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: pendingCount > 0 ? 'var(--primary)' : '#fff' }}>{pendingCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Yêu cầu</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Tổng ca tuần này
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>{allShifts.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Ca</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Nhân viên có mặt
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>
            {[...new Set(allShifts.map(s => s.assignedTo))].length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Người</div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isAdmin ? '1.8fr 1.4fr' : '2.5fr 1.3fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Work Schedule */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff' }}>
                Lịch Làm Việc
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{monthLabel}</div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {['week', 'month'].map(mode => (
                <button key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '8px 16px',
                    background: viewMode === mode ? 'var(--primary)' : 'transparent',
                    color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
                    border: viewMode === mode ? 'none' : '1px solid var(--border-glass)',
                    borderRadius: '6px', fontSize: '13px', cursor: 'pointer'
                  }}>
                  {mode === 'week' ? 'Tuần' : 'Tháng'}
                </button>
              ))}
            </div>

            {viewMode === 'week' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
                {weeklySchedule.map((day) => (
                  <div key={day.dayKey}
                    style={{
                      background: day.isToday ? 'rgba(225, 29, 72, 0.1)' : 'rgba(255,255,255,0.02)',
                      border: day.isToday ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                      borderRadius: '8px', padding: '12px', textAlign: 'center', minHeight: '120px'
                    }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{day.day}</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: day.isToday ? 'var(--primary)' : '#fff', marginBottom: '8px' }}>{day.date}</div>
                    {day.shift ? (
                      <div>
                        <div style={{ fontSize: '11px', color: day.isToday ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: '600' }}>{day.shift}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{day.time}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{day.assignedTo}</div>
                        <div style={{ fontSize: '9px', color: day.isToday ? 'var(--primary)' : 'var(--success)', fontWeight: '600', marginTop: '4px' }}>{day.status}</div>
                        {day.assignedTo === user.name && day.shiftId && (
                          <button className="btn-secondary"
                            style={{ marginTop: '6px', padding: '3px 6px', fontSize: '9px', width: '100%' }}
                            onClick={() => openSwapModal(day)}>
                            Đổi ca
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>Nghỉ</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'month' && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Chế độ tháng - cần dữ liệu thực tế
              </div>
            )}
          </div>

          {/* Available Shifts */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff' }}>
                Tất cả ca tuần này
              </h3>
              <span className="badge badge-muted">{allShifts.length} ca</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {allShifts.map((shift) => (
                <div key={shift.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px', background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-glass)', borderRadius: '8px'
                  }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                      {shift.dayLabel} - {shift.date} · {shift.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {shift.time} · {shift.role} · {shift.assignedTo}
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{shift.branch}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Upcoming Shifts - My Shifts */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
              Ca của tôi
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myShifts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Bạn chưa có ca được phân công tuần này
                </div>
              ) : myShifts.map((shift) => (
                <div key={shift.id}
                  style={{
                    padding: '12px',
                    background: 'rgba(225, 29, 72, 0.05)',
                    border: '1px solid rgba(225, 29, 72, 0.2)',
                    borderRadius: '8px'
                  }}>
                  <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {shift.dayLabel} - {shift.date}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>{shift.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{shift.time} · {shift.role}</div>
                  <button className="btn-secondary"
                    style={{ width: '100%', padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => openSwapModal({ day: shift.dayLabel, date: shift.date, shift: shift.name, time: shift.time, shiftId: shift.id })}>
                    Yêu cầu đổi ca
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Swap Requests */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
              Yêu cầu đổi ca
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
              {swapRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Chưa có yêu cầu đổi ca
                </div>
              ) : swapRequests.map((req) => (
                <div key={req._id}
                  style={{
                    padding: '12px',
                    background: req.status === 'pending' && isAdmin ? 'rgba(225, 29, 72, 0.05)' : 'rgba(255,255,255,0.02)',
                    border: req.status === 'pending' && isAdmin ? '1px solid rgba(225, 29, 72, 0.2)' : '1px solid var(--border-glass)',
                    borderRadius: '8px'
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {req.requesterName}
                    </div>
                    {getStatusBadge(req.status)}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Từ ca</div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#fff' }}>{req.requesterShiftName}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{req.requesterShiftTime}</div>
                    </div>
                    <div style={{ color: 'var(--primary)', fontSize: '16px' }}>⇄</div>
                    <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Sang ca</div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#fff' }}>{req.targetShiftName || req.targetStaffName}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{req.targetShiftTime || 'Chưa chọn'}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Lý do: &quot;{req.reason}&quot;
                  </div>

                  {isAdmin && req.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-primary" style={{ flex: 1, padding: '6px', fontSize: '11px' }}
                        onClick={() => handleApprove(req._id)}>
                        Duyệt
                      </button>
                      <button className="btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '11px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        onClick={() => handleReject(req._id)}>
                        Từ chối
                      </button>
                    </div>
                  )}

                  {!isAdmin && req.status === 'pending' && req.requesterId === user.id && (
                    <button className="btn-secondary"
                      style={{ width: '100%', padding: '6px', fontSize: '11px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => handleCancel(req._id)}>
                      Hủy yêu cầu
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Swap Modal */}
      {showSwapModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ padding: '24px', width: '100%', maxWidth: '500px', background: '#0d111a' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>
              Yêu cầu đổi ca
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(225, 29, 72, 0.05)', border: '1px solid rgba(225, 29, 72, 0.2)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Ca muốn đổi</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{swapForm.requesterShiftName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{swapForm.requesterShiftTime} · {swapForm.requesterShiftDay}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Chọn nhân viên đổi ca</label>
                <select className="form-input" style={{ background: 'var(--bg-darker)' }}
                  value={swapForm.targetStaffId}
                  onChange={(e) => handleTargetStaffChange(e.target.value)}>
                  <option value="">Chọn nhân viên...</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - {s.dept}</option>
                  ))}
                </select>
              </div>

              {swapForm.targetStaffId && (
                <div className="form-group">
                  <label className="form-label">Chọn ca của nhân viên đổi (tùy chọn)</label>
                  <select className="form-input" style={{ background: 'var(--bg-darker)' }}
                    value={swapForm.targetShiftId}
                    onChange={(e) => handleTargetShiftChange(e.target.value)}>
                    <option value="">Đổi ca bất kỳ</option>
                    {targetShifts.map(s => (
                      <option key={s.id} value={s.id}>{s.dayLabel} - {s.date} · {s.name} ({s.time})</option>
                    ))}
                  </select>
                </div>
              )}

              {swapForm.targetShiftId && (
                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Ca nhận đổi</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{swapForm.targetShiftName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{swapForm.targetShiftTime} · {swapForm.targetShiftDay}</div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Lý do đổi ca *</label>
                <textarea className="form-input" rows="3" placeholder="Nhập lý do đổi ca..."
                  value={swapForm.reason}
                  onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px' }}
                onClick={() => setShowSwapModal(false)} disabled={swapLoading}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1, padding: '10px' }}
                onClick={handleSwapSubmit} disabled={swapLoading}>
                {swapLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
