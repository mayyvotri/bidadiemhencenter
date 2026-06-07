import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user_info') || '{"name": "Phú Nguyễn", "role": "Quản lý Ca"}');

  const stats = [
    { label: 'Giờ làm tháng này', value: '142.5 hrs', change: '+12.4% so với tháng trước', color: 'var(--info)' },
    { label: 'Số ca đã trực', value: '18 ca', change: 'Đúng giờ: 95%', color: 'var(--success)' },
    { label: 'Hệ số lương', value: '1.25x', change: 'Ca tối & Cuối tuần', color: 'var(--warning)' },
    { label: 'Ước tính lương tạm tính', value: '8,950,000 đ', change: 'Đã cập nhật hôm nay', color: 'var(--primary)' }
  ];

  const upcomingShifts = [
    { date: 'Hôm nay - Ca tối', time: '18:00 - 23:30', role: 'Quản lý bàn', status: 'Sắp diễn ra', type: 'warning' },
    { date: 'Ngày mai - Ca chiều', time: '12:00 - 18:00', role: 'Quản lý bàn', status: 'Đã xác nhận', type: 'info' },
    { date: 'Thứ Tư - Ca tối', time: '18:00 - 23:30', role: 'Thu ngân chính', status: 'Đã xác nhận', type: 'info' }
  ];

  const recentLogs = [
    { time: '08:45', action: 'Bạn đã đăng ký trực thành công ca chiều 10/06' },
    { time: 'Hôm qua', action: 'Admin duyệt bảng lương tháng 5 cho bạn' },
    { time: '05/06', action: 'Bạn đã check-out trễ ca tối 04/06 (15 phút)' }
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '32px',
            margin: 0,
            textAlign: 'left'
          }}>
            Tổng quan công việc
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'left' }}>
            Chào mừng trở lại, <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{user.name}</span> ({user.role})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => navigate('/attendance')}>
            🕒 Check-in / Out
          </button>
          <button className="btn-primary" onClick={() => navigate('/schedule')}>
            📅 Lịch Trực
          </button>
        </div>
      </div>

      {/* Grid Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {stats.map((stat, i) => (
          <div key={i} className="glass-card" style={{ padding: '20px', textAlign: 'left' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {stat.label}
            </span>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              fontFamily: 'var(--font-heading)',
              color: stat.color,
              margin: '8px 0 4px'
            }}>
              {stat.value}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {stat.change}
            </span>
          </div>
        ))}
      </div>

      {/* Tables and Activity Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '24px'
      }}>
        {/* Upcoming Shifts Card */}
        <div className="glass-card" style={{ padding: '24px', textAlign: 'left' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', marginBottom: '20px', color: 'var(--text-primary)' }}>
            Ca trực tiếp theo
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {upcomingShifts.map((shift, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '16px',
                borderBottom: i < upcomingShifts.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
              }}>
                <div>
                  <div style={{ fontWeight: '500', fontSize: '15px' }}>{shift.date}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {shift.time} • <span style={{ color: 'var(--primary)' }}>{shift.role}</span>
                  </div>
                </div>
                <span className={`badge badge-${shift.type}`}>
                  {shift.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity log / Quick Actions Card */}
        <div className="glass-card" style={{ padding: '24px', textAlign: 'left' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', marginBottom: '20px', color: 'var(--text-primary)' }}>
            Thông báo & Hoạt động gần đây
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {recentLogs.map((log, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '70px', fontWeight: '500' }}>
                  {log.time}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                  {log.action}
                </span>
              </div>
            ))}
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--border-glass)'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Chỉ dẫn ca làm việc:</h4>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <li>Luôn check-in trước giờ bắt đầu ca tối thiểu 10 phút.</li>
              <li>Kiểm tra số lượng bóng bida và độ phẳng mặt bàn trước khi giao bàn cho khách.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
