import { useState, useEffect, useCallback } from 'react';
import { gpsVerificationApi } from '../services/api';

const formatDate = (date) => {
  if (!date) return '--/--/----';
  return new Date(date).toLocaleDateString('vi-VN');
};

const formatTime = (date) => {
  if (!date) return '--:--';
  return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const VERIFICATION_TYPE_LABELS = {
  checkin: 'Check-in',
  checkout: 'Check-out'
};

const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
};

export default function GPSVerificationLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterSuccess, setFilterSuccess] = useState('');
  const [filterUserId, setFilterUserId] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType) params.verificationType = filterType;
      if (filterSuccess !== '') params.success = filterSuccess;
      if (filterUserId) params.userId = filterUserId;

      const data = await gpsVerificationApi.getLogs(params);
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải logs xác thực GPS');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterSuccess, filterUserId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Đang tải...</div>;
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: '#fff', marginBottom: '8px' }}>
        Logs Xác Thực GPS
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Xem lịch sử xác thực GPS của nhân viên.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: '#ef4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Loại xác thực</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            >
              <option value="">Tất cả</option>
              <option value="checkin">Check-in</option>
              <option value="checkout">Check-out</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Kết quả</label>
            <select
              value={filterSuccess}
              onChange={(e) => setFilterSuccess(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            >
              <option value="">Tất cả</option>
              <option value="true">Thành công</option>
              <option value="false">Thất bại</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>ID nhân viên</label>
            <input
              type="text"
              placeholder="ID nhân viên"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ngày</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Giờ</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Nhân viên</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Loại</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Kết quả</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Khoảng cách</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Bán kính cho phép</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  Không có dữ liệu logs
                </td>
              </tr>
            ) : logs.map((log) => (
              <tr key={log._id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{formatDate(log.createdAt)}</td>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{formatTime(log.createdAt)}</td>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{log.user?.name || 'N/A'}</td>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{VERIFICATION_TYPE_LABELS[log.verificationType] || log.verificationType}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    background: log.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: log.success ? '#22c55e' : '#ef4444'
                  }}>
                    {log.success ? 'Thành công' : 'Thất bại'}
                  </span>
                </td>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{formatDistance(log.distance)}</td>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{formatDistance(log.allowedRadius)}</td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>{log.ipAddress || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
