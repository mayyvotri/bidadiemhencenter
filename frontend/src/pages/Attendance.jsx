import React, { useState, useEffect } from 'react';

export default function Attendance() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [session, setSession] = useState(null);
  const [timeStr, setTimeStr] = useState('');
  const [logs, setLogs] = useState([
    { date: '07/06/2026', shift: 'Ca chiều', checkIn: '12:02', checkOut: '18:05', duration: '6h 3m', status: 'Đúng giờ', type: 'success' },
    { date: '06/06/2026', shift: 'Ca tối', checkIn: '18:15', checkOut: '23:31', duration: '5h 16m', status: 'Trễ check-in', type: 'warning' },
    { date: '05/06/2026', shift: 'Ca tối', checkIn: '17:55', checkOut: '23:35', duration: '5h 40m', status: 'Đúng giờ', type: 'success' },
    { date: '04/06/2026', shift: 'Ca chiều', checkIn: '11:58', checkOut: '18:02', duration: '6h 4m', status: 'Đúng giờ', type: 'success' }
  ]);

  // Current timer for check-in time
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString('vi-VN'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckIn = () => {
    const now = new Date();
    setIsCheckedIn(true);
    setSession({
      time: now.toLocaleTimeString('vi-VN'),
      date: now.toLocaleDateString('vi-VN'),
      shift: 'Ca tối (18:00 - 23:30)',
      location: 'Chi nhánh 1 - Nguyễn Oanh'
    });
  };

  const handleCheckOut = () => {
    if (!session) return;
    const now = new Date();
    const checkOutTime = now.toLocaleTimeString('vi-VN');
    
    // Add current session to logs
    const newLog = {
      date: session.date,
      shift: 'Ca tối',
      checkIn: session.time.substring(0, 5),
      checkOut: checkOutTime.substring(0, 5),
      duration: '5h 30m (Ước tính)',
      status: 'Đúng giờ',
      type: 'success'
    };

    setLogs([newLog, ...logs]);
    setIsCheckedIn(false);
    setSession(null);
  };

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', marginBottom: '8px' }}>
        Điểm Danh & Ghi Nhận Công
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Ghi nhận thời gian đến và về tại chi nhánh hoạt động.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Main Check-in Action Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Giờ Hệ Thống
          </div>
          <div style={{ fontSize: '42px', fontWeight: '700', fontFamily: 'var(--font-heading)', color: 'var(--primary)', marginBottom: '24px' }}>
            {timeStr || '--:--:--'}
          </div>

          {!isCheckedIn ? (
            <div style={{ width: '100%' }}>
              <div style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '28px',
                fontSize: '14px',
                color: 'var(--warning)',
                textAlign: 'left'
              }}>
                📌 <strong>Ca tiếp theo:</strong> Ca tối (18:00 - 23:30) tại Nguyễn Oanh. Hệ thống tự động phát hiện vị trí của bạn hợp lệ.
              </div>
              <button className="btn-primary" onClick={handleCheckIn} style={{ padding: '16px 40px', fontSize: '16px', width: '100%' }}>
                🟢 Check-in Vào Ca
              </button>
            </div>
          ) : (
            <div style={{ width: '100%' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '28px',
                fontSize: '14px',
                color: 'var(--success)',
                textAlign: 'left'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>✓ Đã Check-in Thành Công</div>
                <div><strong>Giờ vào:</strong> {session?.time}</div>
                <div><strong>Ca trực:</strong> {session?.shift}</div>
                <div><strong>Địa điểm:</strong> {session?.location}</div>
              </div>
              <button className="btn-secondary" onClick={handleCheckOut} style={{ padding: '16px 40px', fontSize: '16px', width: '100%', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
                🔴 Check-out Ra Ca
              </button>
            </div>
          )}
        </div>

        {/* Attendance logs history */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', marginBottom: '20px' }}>
            Lịch sử công tháng này
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Ca</th>
                  <th>Giờ vào/ra</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: '500' }}>{log.date}</td>
                    <td>{log.shift}</td>
                    <td>{log.checkIn} - {log.checkOut}</td>
                    <td>
                      <span className={`badge badge-${log.type}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
