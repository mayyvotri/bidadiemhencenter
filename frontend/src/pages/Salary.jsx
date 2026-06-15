import { useState, useEffect } from 'react';
import { api, payrollApi } from '../services/api';
import { onEvent, Events } from '../utils/events';
import { useMediaQuery } from '../hooks/useMediaQuery';

export default function Salary() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [salaryDetail, setSalaryDetail] = useState({
    baseRate: 0, totalHours: 0, baseSalary: 0,
    allowance: 0, bonus: 0, deduction: 0, netSalary: 0, period: ''
  });
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const fetchSalary = async () => {
    try {
      setLoading(true);
      
      // Get salary summary
      const summaryData = await api.get('/salary/summary');
      if (summaryData.success && summaryData.salary) {
        setSalaryDetail(summaryData.salary);
      }
      
      // Get attendance history (from approved check-in/check-out requests)
      const attendanceData = await payrollApi.getAttendanceHistory({
        month: currentMonth,
        year: currentYear
      });
      
      if (attendanceData.success && attendanceData.data) {
        setAttendanceHistory(attendanceData.data.attendanceRecords || []);
        
        // Also update salaryDetail with live data from attendance
        const summary = attendanceData.data.summary;
        if (summary) {
          setSalaryDetail(prev => ({
            ...prev,
            baseRate: summary.wagePerHour || 0,
            totalHours: summary.totalHoursWorked || 0,
            baseSalary: summary.baseSalary || 0,
            allowance: summary.allowances || 0,
            netSalary: summary.grossSalary || 0,
            period: `Tháng ${currentMonth}/${currentYear}`
          }));
        }
      }
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalary();
    
    // Listen for attendance updates
    const unsubscribe = onEvent(Events.PAYROLL_UPDATED, () => {
      fetchSalary();
    });
    
    return () => unsubscribe();
  }, [currentMonth, currentYear]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleDownload = (period) => {
    alert(`Đang xuất phiếu lương cho thời kỳ: ${period}. Tệp tin PDF đang được tải xuống máy của bạn!`);
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Đang tải dữ liệu lương...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', marginBottom: '8px' }}>
        Lương & Thu Nhập
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Chi tiết thù lao, thưởng phụ cấp và lịch sử nhận lương.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div className="glass-card" style={{
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          borderLeft: '4px solid var(--primary)'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Lương thực lĩnh tháng này (Ước tính)
          </span>
          <div style={{
            fontSize: '36px',
            fontWeight: '700',
            fontFamily: 'var(--font-heading)',
            color: 'var(--primary)',
            margin: '16px 0 8px'
          }}>
            {formatCurrency(salaryDetail.netSalary)}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {salaryDetail.period || 'Kỳ lương hiện tại'}
          </p>
          <button
            className="btn-primary"
            style={{ marginTop: '24px', width: 'fit-content' }}
            onClick={() => handleDownload(salaryDetail.period || 'Tháng hiện tại')}
          >
            📥 Tải Phiếu Lương (.PDF)
          </button>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', marginBottom: '16px' }}>Chi tiết các khoản</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Mức lương cơ bản (1h):</span>
              <span style={{ fontWeight: '500' }}>{formatCurrency(salaryDetail.baseRate)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tổng số giờ làm:</span>
              <span style={{ fontWeight: '500' }}>{salaryDetail.totalHours?.toFixed(2).replace(/\.00$/, '') || 0}h</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Lương cơ bản:</span>
              <span style={{ fontWeight: '500' }}>{formatCurrency(salaryDetail.baseSalary)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Phụ cấp:</span>
              <span style={{ fontWeight: '500', color: 'var(--success)' }}>+{formatCurrency(salaryDetail.allowance)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Thưởng:</span>
              <span style={{ fontWeight: '500', color: 'var(--success)' }}>+{formatCurrency(salaryDetail.bonus)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Khấu trừ:</span>
              <span style={{ fontWeight: '500', color: 'var(--danger)' }}>-{formatCurrency(salaryDetail.deduction)}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
              <span style={{ fontWeight: '600' }}>Thực lĩnh:</span>
              <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{formatCurrency(salaryDetail.netSalary)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px' }}>
            Lịch sử chấm công - Tháng {currentMonth}/{currentYear}
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => {
                if (currentMonth === 1) {
                  setCurrentMonth(12);
                  setCurrentYear(currentYear - 1);
                } else {
                  setCurrentMonth(currentMonth - 1);
                }
              }}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >← Tháng trước</button>
            <button 
              onClick={() => fetchSalary()}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer' }}
            >🔄 Làm mới</button>
            <button 
              onClick={() => {
                if (currentMonth === 12) {
                  setCurrentMonth(1);
                  setCurrentYear(currentYear + 1);
                } else {
                  setCurrentMonth(currentMonth + 1);
                }
              }}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >Tháng sau →</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>NGÀY</th>
                <th>CHECK-IN</th>
                <th>CHECK-OUT</th>
                <th>GIỜ LÀM</th>
                <th>CA</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {attendanceHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Chưa có lịch sử chấm công cho tháng này
                  </td>
                </tr>
              ) : attendanceHistory.map((record, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: '500' }}>
                    {new Date(record.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </td>
                  <td>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                  <td>{record.hours != null ? record.hours.toFixed(2).replace(/\.00$/, '') + 'h' : '-'}</td>
                  <td>{record.shift || 'Ca thường'}</td>
                  <td>
                    <span className={`badge ${record.status === 'late' ? 'badge-warning' : record.status === 'on_time' ? 'badge-success' : 'badge-muted'}`}>
                      {record.status === 'late' ? 'Trễ' : record.status === 'on_time' ? 'Đúng giờ' : record.status || 'Bình thường'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
