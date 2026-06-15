import { useState, useEffect, useCallback } from 'react';
import { staffingCoverageApi } from '../services/api';

const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

export default function WeeklyCalendar({ startDate, onDateClick }) {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWeeklyData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await staffingCoverageApi.getWeeklyCoverage({ startDate });
      if (data.success) {
        setWeeklyData(data.data);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu lịch tuần');
    } finally {
      setLoading(false);
    }
  }, [startDate]);

  useEffect(() => {
    fetchWeeklyData();
  }, [fetchWeeklyData]);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#fff' }}>Đang tải...</div>;
  }

  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', color: '#ef4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border-glass)' }}>
        {DAY_NAMES.map((day, index) => (
          <div key={index} style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
            {day}
          </div>
        ))}

        {weeklyData.map((dayData, index) => (
          <div
            key={index}
            onClick={() => onDateClick && onDateClick(dayData.date)}
            style={{
              minHeight: '120px',
              padding: '8px',
              background: 'rgba(0, 0, 0, 0.15)',
              cursor: onDateClick ? 'pointer' : 'default',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              if (onDateClick) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              if (onDateClick) e.currentTarget.style.background = 'rgba(0, 0, 0, 0.15)';
            }}
          >
            <div style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
              {formatDate(dayData.date)}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>
              {dayData.assignments} ca
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {dayData.details.slice(0, 3).map((detail, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#fff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {detail.employee}
                </div>
              ))}
              {dayData.details.length > 3 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                  +{dayData.details.length - 3} thêm
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
