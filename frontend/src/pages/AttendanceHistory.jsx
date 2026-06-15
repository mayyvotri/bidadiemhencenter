import { useState, useEffect, useCallback } from 'react';
import { attendanceApi } from '../services/api';

const formatTime = (date) => {
  if (!date) return '--:--';
  return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date) => {
  if (!date) return '--/--/----';
  return new Date(date).toLocaleDateString('vi-VN');
};

const formatWorkingHours = (hours) => {
  if (!hours) return '0h';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

const getStatusLabel = (status) => {
  const labels = {
    on_time: 'Đúng giờ',
    late: 'Đến muộn',
    early_leave: 'Về sớm',
    absent: 'Vắng mặt'
  };
  return labels[status] || status;
};

const getStatusColor = (status) => {
  const colors = {
    on_time: '#22c55e',
    late: '#eab308',
    early_leave: '#f97316',
    absent: '#ef4444'
  };
  return colors[status] || '#6b7280';
};

const getShiftName = (hour) => {
  if (hour >= 6 && hour < 12) return 'Ca sáng';
  if (hour >= 12 && hour < 18) return 'Ca chiều';
  return 'Ca tối';
};

export default function AttendanceHistory() {
  const [logs, setLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const fetchAttendanceData = useCallback(async () => {
    try {
      setLoading(true);
      const [logsData, statsData] = await Promise.all([
        attendanceApi.getLogs({
          startDate: `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`,
          endDate: `${filterYear}-${String(filterMonth).padStart(2, '0')}-31`,
          limit: 100
        }),
        attendanceApi.getStatistics({
          month: filterMonth,
          year: filterYear
        })
      ]);

      if (logsData.success) {
        setLogs(logsData.data);
      }

      if (statsData.success) {
        setStatistics(statsData.data);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu điểm danh');
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Đang tải...</div>;
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: '#fff', marginBottom: '8px' }}>
        Lịch Sử Điểm Danh
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Xem lịch sử điểm danh và thống kê công việc của bạn.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: '#ef4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Tháng</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(parseInt(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Năm</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, marginBottom: '8px' }}>Tổng ngày làm</p>
            <p style={{ color: '#fff', fontSize: '28px', fontWeight: '700', margin: 0 }}>{statistics.totalDays}</p>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, marginBottom: '8px' }}>Tổng giờ làm</p>
            <p style={{ color: '#fff', fontSize: '28px', fontWeight: '700', margin: 0 }}>{formatWorkingHours(statistics.totalWorkingHours)}</p>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, marginBottom: '8px' }}>Đúng giờ</p>
            <p style={{ color: '#22c55e', fontSize: '28px', fontWeight: '700', margin: 0 }}>{statistics.onTime}</p>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, marginBottom: '8px' }}>Đến muộn</p>
            <p style={{ color: '#eab308', fontSize: '28px', fontWeight: '700', margin: 0 }}>{statistics.late}</p>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, marginBottom: '8px' }}>Trung bình/ngày</p>
            <p style={{ color: '#fff', fontSize: '28px', fontWeight: '700', margin: 0 }}>{formatWorkingHours(statistics.averageWorkingHours)}</p>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ngày</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ca</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Giờ vào</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Giờ ra</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Giờ làm</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  Không có dữ liệu điểm danh
                </td>
              </tr>
            ) : logs.map((log) => (
              <tr key={log._id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{formatDate(log.date)}</td>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{getShiftName(new Date(log.checkIn).getHours())}</td>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{formatTime(log.checkIn)}</td>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{formatTime(log.checkOut)}</td>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{formatWorkingHours(log.workingHours)}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    background: `${getStatusColor(log.status)}20`,
                    color: getStatusColor(log.status)
                  }}>
                    {getStatusLabel(log.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
