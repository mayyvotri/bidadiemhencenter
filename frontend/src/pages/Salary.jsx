import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Salary() {
  const [salaryDetail, setSalaryDetail] = useState({
    baseRate: 0, totalHours: 0, baseSalary: 0,
    allowance: 0, bonus: 0, deduction: 0, netSalary: 0, period: ''
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalary = async () => {
      try {
        const [summaryData, historyData] = await Promise.all([
          api.get('/salary/summary'),
          api.get('/salary/history')
        ]);
        if (summaryData.success && summaryData.salary) {
          setSalaryDetail(summaryData.salary);
        }
        if (historyData.success) {
          setHistory(historyData.history || []);
        }
      } catch {
        /* keep defaults */
      } finally {
        setLoading(false);
      }
    };
    fetchSalary();
  }, []);

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
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
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
              <span style={{ fontWeight: '500' }}>{salaryDetail.totalHours}h</span>
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
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', marginBottom: '20px' }}>
          Lịch sử nhận lương
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>KỲ LƯƠNG</th>
                <th>GIỜ LÀM</th>
                <th>LƯƠNG CƠ BẢN</th>
                <th>PHỤ CẤP & THƯỞNG</th>
                <th>THỰC LĨNH</th>
                <th>TRẠNG THÁI</th>
                <th>NGÀY TT</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Chưa có lịch sử lương
                  </td>
                </tr>
              ) : history.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: '500' }}>{item.period}</td>
                  <td>{item.hours}</td>
                  <td>{item.base}</td>
                  <td>{item.allowances}</td>
                  <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{item.net}</td>
                  <td><span className="badge badge-success">{item.status}</span></td>
                  <td>{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
