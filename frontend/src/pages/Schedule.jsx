import React, { useState } from 'react';

export default function Schedule() {
  const [selectedDay, setSelectedDay] = useState('Mon');
  const [swapRequest, setSwapRequest] = useState({ shiftId: '', targetStaff: '', reason: '' });
  const [showSwapModal, setShowSwapModal] = useState(false);

  const weekDays = [
    { label: 'Thứ Hai', short: 'Mon', date: '08/06', hasShift: true },
    { label: 'Thứ Ba', short: 'Tue', date: '09/06', hasShift: true },
    { label: 'Thứ Tư', short: 'Wed', date: '10/06', hasShift: false },
    { label: 'Thứ Năm', short: 'Thu', date: '11/06', hasShift: true },
    { label: 'Thứ Sáu', short: 'Fri', date: '12/06', hasShift: true },
    { label: 'Thứ Bảy', short: 'Sat', date: '13/06', hasShift: false },
    { label: 'Chủ Nhật', short: 'Sun', date: '14/06', hasShift: true }
  ];

  const shiftDetails = {
    'Mon': [{ id: 1, name: 'Ca chiều', time: '12:00 - 18:00', role: 'Quản lý bàn', branch: 'Chi nhánh 1', status: 'Đã phân công' }],
    'Tue': [{ id: 2, name: 'Ca tối', time: '18:00 - 23:30', role: 'Quản lý bàn', branch: 'Chi nhánh 1', status: 'Đã phân công' }],
    'Wed': [],
    'Thu': [{ id: 3, name: 'Ca tối', time: '18:00 - 23:30', role: 'Thu ngân', branch: 'Chi nhánh 1', status: 'Đã phân công' }],
    'Fri': [{ id: 4, name: 'Ca tối', time: '18:00 - 23:30', role: 'Quản lý bàn', branch: 'Chi nhánh 2', status: 'Đã phân công' }],
    'Sat': [],
    'Sun': [{ id: 5, name: 'Ca sáng', time: '08:00 - 14:00', role: 'Phục vụ bàn VIP', branch: 'Chi nhánh 1', status: 'Đã phân công' }]
  };

  const handleSwapSubmit = (e) => {
    e.preventDefault();
    alert(`Đã gửi yêu cầu đổi ca làm việc của bạn sang nhân viên ${swapRequest.targetStaff}. Chờ quản lý duyệt!`);
    setShowSwapModal(false);
    setSwapRequest({ shiftId: '', targetStaff: '', reason: '' });
  };

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', marginBottom: '8px' }}>
            Lịch Trực Chi Tiết
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Xem, quản lý ca trực tuần này từ 08/06 đến 14/06.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowSwapModal(true)}>
          🔄 Yêu Cầu Đổi Ca
        </button>
      </div>

      {/* Week Calendar Selector Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '12px',
        marginBottom: '24px',
        overflowX: 'auto'
      }}>
        {weekDays.map((day) => (
          <button
            key={day.short}
            onClick={() => setSelectedDay(day.short)}
            style={{
              background: selectedDay === day.short ? 'var(--primary)' : 'rgba(255, 255, 255, 0.03)',
              color: selectedDay === day.short ? 'white' : 'var(--text-primary)',
              border: selectedDay === day.short ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
              borderRadius: '12px',
              padding: '16px 8px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all var(--transition-fast)',
              minWidth: '70px'
            }}
          >
            <span style={{ fontSize: '12px', opacity: 0.7, marginBottom: '6px' }}>{day.label}</span>
            <span style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'var(--font-heading)' }}>{day.short}</span>
            <span style={{ fontSize: '11px', marginTop: '6px', opacity: 0.8 }}>{day.date}</span>
            {day.hasShift && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: selectedDay === day.short ? 'white' : 'var(--primary)',
                marginTop: '8px'
              }}></span>
            )}
          </button>
        ))}
      </div>

      {/* Selected Day Shift Info */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', marginBottom: '20px' }}>
          Ca trực của bạn - Thứ {selectedDay === 'Sun' ? 'Chủ Nhật' : weekDays.find(d => d.short === selectedDay)?.label} ({weekDays.find(d => d.short === selectedDay)?.date})
        </h3>

        {shiftDetails[selectedDay].length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            🌴 Bạn không có ca trực nào vào ngày này. Hãy nghỉ ngơi thật tốt nhé!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {shiftDetails[selectedDay].map((shift) => (
              <div key={shift.id} style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-glass)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', fontSize: '18px', color: 'var(--primary)' }}>{shift.name}</span>
                  <span className="badge badge-info">{shift.status}</span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <div>🕒 <strong>Thời gian:</strong> {shift.time}</div>
                  <div style={{ marginTop: '4px' }}>🏢 <strong>Vai trò:</strong> {shift.role}</div>
                  <div style={{ marginTop: '4px' }}>📍 <strong>Địa điểm:</strong> {shift.branch}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Swap Shift Modal overlay */}
      {showSwapModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-main)' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', marginBottom: '20px' }}>Gửi Yêu Cầu Đổi Ca</h3>
            <form onSubmit={handleSwapSubmit}>
              <div className="form-group">
                <label className="form-label">Chọn ca trực muốn đổi</label>
                <select 
                  className="form-input" 
                  value={swapRequest.shiftId}
                  onChange={(e) => setSwapRequest({ ...swapRequest, shiftId: e.target.value })}
                  style={{ background: 'var(--bg-darker)' }}
                  required
                >
                  <option value="">-- Chọn ca trực --</option>
                  <option value="1">Thứ Hai (08/06) - Ca chiều</option>
                  <option value="2">Thứ Ba (09/06) - Ca tối</option>
                  <option value="3">Thứ Năm (11/06) - Ca tối</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nhân viên muốn đổi cùng</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Nhập tên nhân viên (ví dụ: An Trần)" 
                  value={swapRequest.targetStaff}
                  onChange={(e) => setSwapRequest({ ...swapRequest, targetStaff: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lý do đổi ca</label>
                <textarea 
                  className="form-input" 
                  rows="3" 
                  placeholder="Lý do..." 
                  value={swapRequest.reason}
                  onChange={(e) => setSwapRequest({ ...swapRequest, reason: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowSwapModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Gửi yêu cầu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
