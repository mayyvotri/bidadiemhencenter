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
      date: date.getDate(),
      shift: shift?.name || null,
      time: shift?.time || null,
      status: isToday && shift ? 'ĐANG LÀM' : shift ? 'Đã phân công' : 'Nghỉ',
      shiftId: shift?.id
    };
  });
};

export default function Schedule() {
  const [viewMode, setViewMode] = useState('week');
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [availableShifts] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [swapForm, setSwapForm] = useState({ shiftId: '', targetStaff: '', reason: '' });
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const monthLabel = `Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const data = await api.get('/schedule');
        if (data.success) {
          const schedule = buildWeeklySchedule(data.shifts);
          setWeeklySchedule(schedule);
          const upcoming = [];
          API_DAYS.forEach((key, i) => {
            (data.shifts[key] || []).forEach(s => {
              upcoming.push({
                id: s.id,
                date: VN_DAYS[i],
                shift: s.name,
                time: s.time,
                day: i === 1 ? 'NGÀY MAI' : VN_DAYS[i],
                branch: s.branch
              });
            });
          });
          setUpcomingShifts(upcoming);
        }
      } catch {
        setWeeklySchedule(buildWeeklySchedule({}));
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, []);

  const handleSwapSubmit = async () => {
    if (!swapForm.shiftId || !swapForm.targetStaff || !swapForm.reason) {
      alert('Vui lòng điền đầy đủ thông tin đổi ca');
      return;
    }
    try {
      const data = await api.post('/schedule/swap', {
        shiftId: Number(swapForm.shiftId),
        targetStaff: swapForm.targetStaff,
        reason: swapForm.reason
      });
      if (data.success) {
        setSwapRequests([data.request, ...swapRequests]);
        setShowSwapModal(false);
        setSwapForm({ shiftId: '', targetStaff: '', reason: '' });
      }
    } catch (err) {
      alert(err.message || 'Không thể gửi yêu cầu đổi ca');
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Đang tải lịch làm việc...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff' }}>
            Lịch Làm Việc
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Quản lý ca làm việc và đăng ký ca trống
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            type="text" 
            placeholder="Tìm kiếm ca làm..." 
            className="form-input" 
            style={{ width: '220px', padding: '8px 12px', fontSize: '13px', background: 'rgba(0,0,0,0.15)' }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Tổng giờ làm tuần này
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>0</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Giờ</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Đổi ca chờ duyệt
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>0</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Yêu cầu</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Lương dự kiến (Tạm tính)
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>0₫</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Tháng này</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Ca làm hoàn thành
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>0 <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/ 0</span></div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Ca</div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2.5fr 1.3fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Work Schedule */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff' }}>
                Lịch Làm Việc
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {monthLabel}
              </div>
            </div>

            {/* View Mode Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <button 
                onClick={() => setViewMode('week')}
                style={{
                  padding: '8px 16px',
                  background: viewMode === 'week' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'week' ? '#fff' : 'var(--text-secondary)',
                  border: viewMode === 'week' ? 'none' : '1px solid var(--border-glass)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Tuần
              </button>
              <button 
                onClick={() => setViewMode('month')}
                style={{
                  padding: '8px 16px',
                  background: viewMode === 'month' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'month' ? '#fff' : 'var(--text-secondary)',
                  border: viewMode === 'month' ? 'none' : '1px solid var(--border-glass)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Tháng
              </button>
            </div>

            {/* Weekly Schedule Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '12px'
            }}>
              {weeklySchedule.map((day, index) => (
                <div 
                  key={index}
                  style={{
                    background: day.status === 'ĐANG LÀM' ? 'rgba(225, 29, 72, 0.1)' : 'rgba(255,255,255,0.02)',
                    border: day.status === 'ĐANG LÀM' ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                    minHeight: '100px'
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    {day.day}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
                    {day.date}
                  </div>
                  {day.shift ? (
                    <div>
                      <div style={{ fontSize: '12px', color: day.status === 'ĐANG LÀM' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: '600' }}>
                        {day.shift}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {day.time}
                      </div>
                      <div style={{ 
                        fontSize: '10px', 
                        color: day.status === 'ĐANG LÀM' ? 'var(--primary)' : day.status === 'Đã xong' ? 'var(--success)' : 'var(--text-muted)',
                        marginTop: '4px',
                        fontWeight: '600'
                      }}>
                        {day.status}
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="btn-secondary"
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '10px', 
                        marginTop: '8px',
                        background: day.status === 'Đăng ký ca' ? 'var(--primary)' : ''
                      }}
                      onClick={() => alert(`Đăng ký ca cho ${day.day}`)}
                    >
                      {day.status === 'Đăng ký ca' ? 'Đăng ký ca' : 'Nghỉ'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Available Shifts */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff' }}>
                Ca trống có sẵn
              </h3>
              <span className="badge badge-warning">Sắp hết chỗ</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {availableShifts.map((shift, index) => (
                <div 
                  key={index}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{shift.date}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{shift.shift} ({shift.time})</div>
                  </div>
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    Đăng ký
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Promotional Section */}
          <div className="glass-card" style={{
            background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.1), rgba(15, 18, 29, 0.9))',
            border: '1px solid rgba(225, 29, 72, 0.2)',
            padding: '24px',
            borderRadius: '12px'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
              Cần thêm thu nhập?
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Đăng ký ca đêm cuối tuần để nhận hệ số lương 1.5x
            </p>
            <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              Xem thêm ca thường
            </button>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Upcoming Shifts */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
              Ca làm sắp tới
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcomingShifts.map((shift, index) => (
                <div 
                  key={index}
                  style={{ 
                    padding: '12px',
                    background: shift.day === 'NGÀY MAI' ? 'rgba(225, 29, 72, 0.05)' : 'rgba(255,255,255,0.02)',
                    border: shift.day === 'NGÀY MAI' ? '1px solid rgba(225, 29, 72, 0.2)' : '1px solid var(--border-glass)',
                    borderRadius: '8px'
                  }}
                >
                  {shift.day === 'NGÀY MAI' && (
                    <span className="badge badge-danger" style={{ fontSize: '10px', marginBottom: '8px' }}>NGÀY MAI</span>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {shift.date}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                    {shift.shift}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {shift.time}
                  </div>
                  {shift.day === 'NGÀY MAI' && (
                    <button 
                      className="btn-secondary" 
                      style={{ marginTop: '8px', padding: '4px 10px', fontSize: '11px', width: '100%' }}
                      onClick={() => setShowSwapModal(true)}
                    >
                      Yêu cầu đổi
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button className="btn-secondary" style={{ width: '100%', marginTop: '16px', padding: '8px', fontSize: '12px' }}>
              Xem tất cả lịch trình
            </button>
          </div>

          {/* Shift Change Requests */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
              Yêu cầu đổi ca
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {swapRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Chưa có yêu cầu đổi ca
                </div>
              ) : swapRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    padding: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Yêu cầu của bạn
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                    Đang gửi cho: {request.targetStaff}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    &quot;{request.reason}&quot;
                  </div>
                  <span className="badge badge-warning" style={{ fontSize: '10px' }}>{request.status}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Swap Modal */}
      {showSwapModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{ padding: '24px', width: '100%', maxWidth: '450px', background: '#0d111a' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>
              Yêu cầu đổi ca
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Mã ca</label>
                <select className="form-input" style={{ background: 'var(--bg-darker)' }}
                  value={swapForm.shiftId}
                  onChange={(e) => setSwapForm({ ...swapForm, shiftId: e.target.value })}>
                  <option value="">Chọn ca...</option>
                  {upcomingShifts.map(s => (
                    <option key={s.id} value={s.id}>{s.shift} - {s.date} ({s.time})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Chọn nhân viên muốn đổi</label>
                <input type="text" className="form-input" placeholder="Tên nhân viên..."
                  value={swapForm.targetStaff}
                  onChange={(e) => setSwapForm({ ...swapForm, targetStaff: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Lý do</label>
                <textarea className="form-input" rows="3" placeholder="Nhập lý do đổi ca..."
                  value={swapForm.reason}
                  onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setShowSwapModal(false)}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1, padding: '10px' }} onClick={handleSwapSubmit}>Gửi yêu cầu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
