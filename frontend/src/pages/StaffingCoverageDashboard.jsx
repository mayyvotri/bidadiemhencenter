import { useState, useEffect, useCallback } from 'react';
import { staffingCoverageApi, shiftApi } from '../services/api';

const formatDate = (dateStr) => {
  if (!dateStr) return '--/--/----';
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

export default function StaffingCoverageDashboard() {
  const [statistics, setStatistics] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [understaffedShifts, setUnderstaffedShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchStatistics = useCallback(async () => {
    try {
      const data = await staffingCoverageApi.getStatistics();
      if (data.success) setStatistics(data.data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  }, []);

  const fetchWeeklyData = useCallback(async () => {
    try {
      const data = await staffingCoverageApi.getWeeklyCoverage({ startDate: selectedDate });
      if (data.success) setWeeklyData(data.data);
    } catch (err) {
      console.error('Failed to fetch weekly data:', err);
    }
  }, [selectedDate]);

  const fetchUnderstaffedShifts = useCallback(async () => {
    try {
      const data = await staffingCoverageApi.getUnderstaffedShifts({ date: selectedDate });
      if (data.success) setUnderstaffedShifts(data.data);
    } catch (err) {
      console.error('Failed to fetch understaffed shifts:', err);
    }
  }, [selectedDate]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStatistics(), fetchWeeklyData(), fetchUnderstaffedShifts()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStatistics, fetchWeeklyData, fetchUnderstaffedShifts]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-primary)' }}>Đang tải...</div>;
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: 'var(--text-primary)', marginBottom: '8px' }}>
        Dashboard Phân Bổ Nhân Sự
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Xem thống kê phân bổ nhân sự theo ca làm việc.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: 'var(--danger)', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Date Selector */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Ngày:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
        />
      </div>

      {/* Overview Statistics */}
      {statistics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Tổng số ca</div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: 'var(--text-primary)' }}>{statistics.totalShifts}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Tổng nhân viên</div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: 'var(--text-primary)' }}>{statistics.totalEmployees}</div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Tổng phân công</div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: 'var(--text-primary)' }}>{statistics.totalAssignments}</div>
          </div>
        </div>
      )}

      {/* Shift Coverage */}
      {statistics && statistics.assignmentsByShift && (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '20px' }}>
            Phân Bổ Theo Ca
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {Object.values(statistics.assignmentsByShift).map((shiftData, index) => (
              <div key={index} style={{ background: 'rgba(0, 0, 0, 0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>
                    {shiftData.shiftName}
                  </h3>
                  {shiftData.utilization && (
                    <span style={{ color: shiftData.utilization > 80 ? 'var(--success-text)' : shiftData.utilization > 50 ? '#eab308' : 'var(--danger)', fontSize: '13px', fontWeight: '600' }}>
                      {shiftData.utilization}%
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
                  Đã phân công: {shiftData.count} / {shiftData.maxEmployees || '∞'}
                </div>
                {shiftData.maxEmployees && (
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${shiftData.utilization}%`,
                        height: '100%',
                        background: shiftData.utilization > 80 ? 'var(--success-text)' : shiftData.utilization > 50 ? '#eab308' : 'var(--danger)',
                        borderRadius: '4px',
                        transition: 'width 0.3s'
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Coverage */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '20px' }}>
          Phân Bổ Tuần
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {weeklyData.map((dayData, index) => (
            <div key={index} style={{ background: 'rgba(0, 0, 0, 0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>{dayData.dayName}</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {dayData.assignments}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>ca làm việc</div>
            </div>
          ))}
        </div>
      </div>

      {/* Understaffed Shifts */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '20px' }}>
          Ca Thiếu Nhân Sự ({selectedDate})
        </h2>
        {understaffedShifts.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--success-text)', fontSize: '14px' }}>
            ✓ Tất cả các ca đều đủ nhân sự
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {understaffedShifts.map((shiftData, index) => (
              <div key={index} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: shiftData.shift.color }} />
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>
                    {shiftData.shift.name}
                  </h3>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
                  {shiftData.shift.startTime} - {shiftData.shift.endTime}
                </div>
                <div style={{ color: 'var(--danger)', fontSize: '14px', fontWeight: '600' }}>
                  Thiếu {shiftData.needed} nhân viên ({shiftData.assigned}/{shiftData.shift.maxEmployees})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Employee Assignments */}
      {statistics && statistics.assignmentsByEmployee && (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '20px' }}>
            Phân Bổ Theo Nhân Viên
          </h2>
          <div style={{ background: 'rgba(0, 0, 0, 0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-glass)' }}>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Nhân viên</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Vị trí</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Số ca</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(statistics.assignmentsByEmployee).map((empData, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>
                      {empData.userName}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {empData.position}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600' }}>
                      {empData.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
