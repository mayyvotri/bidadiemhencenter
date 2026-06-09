import { useState, useEffect, useCallback } from 'react';
import { staffingCoverageApi } from '../services/api';

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.getDate();
};

export default function MonthlyCalendar({ year, month, onDateClick }) {
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMonthlyData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await staffingCoverageApi.getMonthlyCoverage({ year, month });
      if (data.success) {
        setMonthlyData(data.data);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu lịch tháng');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  const getCalendarDays = () => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startDay; i++) {
      days.push({ empty: true });
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = monthlyData.find(d => d.date === dateStr);
      days.push({ day, dateStr, data: dayData });
    }

    return days;
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#fff' }}>Loading...</div>;
  }

  const calendarDays = getCalendarDays();

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

        {calendarDays.map((day, index) => (
          day.empty ? (
            <div key={index} style={{ minHeight: '100px', background: 'rgba(0, 0, 0, 0.1)' }} />
          ) : (
            <div
              key={index}
              onClick={() => onDateClick && onDateClick(day.dateStr)}
              style={{
                minHeight: '100px',
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
                {formatDate(day.dateStr)}
              </div>
              {day.data && day.data.totalAssignments > 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>
                  {day.data.totalAssignments} ca
                </div>
              )}
              {day.data && day.data.shiftCoverage && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {Object.values(day.data.shiftCoverage).slice(0, 3).map((shift, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: shift.color || '#3b82f6'
                      }}
                      title={`${shift.shiftName}: ${shift.assigned}/${shift.max}`}
                    />
                  ))}
                  {Object.keys(day.data.shiftCoverage).length > 3 && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      +{Object.keys(day.data.shiftCoverage).length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        ))}
      </div>
    </div>
  );
}
