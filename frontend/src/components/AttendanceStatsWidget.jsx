import { useState, useEffect, useCallback } from 'react';
import { attendanceApi } from '../services/api';

const formatWorkingHours = (hours) => {
  if (!hours) return '0h';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

export default function AttendanceStatsWidget() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const data = await attendanceApi.getStatistics({
        month: currentMonth,
        year: currentYear
      });

      if (data.success) {
        setStatistics(data.data);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải thống kê');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  if (loading) {
    return (
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '24px' }}>
        <div style={{ color: '#ef4444', fontSize: '14px' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff', marginBottom: '20px' }}>
        Thống kê điểm danh tháng này
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
            {statistics?.totalDays || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ngày làm</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
            {formatWorkingHours(statistics?.totalWorkingHours)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tổng giờ</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#22c55e', marginBottom: '4px' }}>
            {statistics?.onTime || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Đúng giờ</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#eab308', marginBottom: '4px' }}>
            {statistics?.late || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Đến muộn</div>
        </div>
      </div>
    </div>
  );
}
