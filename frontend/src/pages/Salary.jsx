import React from 'react';

export default function Salary() {
  const salaryDetail = {
    baseRate: 35000, // VND per hour
    totalHours: 142.5,
    baseSalary: 4987500,
    allowance: 1200000, // Tiền ăn + xăng xe
    bonus: 2800000, // KPI bàn đạt chỉ tiêu + tăng ca cuối tuần
    deduction: 37500, // Đi muộn 1 lần
    netSalary: 8950000
  };

  const history = [
    { period: 'Tháng 05/2026', hours: '150.0h', base: '5,250,000 đ', allowances: '4,100,000 đ', net: '9,350,000 đ', status: 'Đã thanh toán', date: '05/06/2026' },
    { period: 'Tháng 04/2026', hours: '138.5h', base: '4,847,500 đ', allowances: '3,800,000 đ', net: '8,647,500 đ', status: 'Đã thanh toán', date: '05/05/2026' },
    { period: 'Tháng 03/2026', hours: '144.0h', base: '5,040,000 đ', allowances: '3,950,000 đ', net: '8,990,000 đ', status: 'Đã thanh toán', date: '05/04/2026' }
  ];

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleDownload = (period) => {
    alert(`Đang xuất phiếu lương cho thời kỳ: ${period}. Tệp tin PDF đang được tải xuống máy của bạn!`);
  };

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', marginBottom: '8px' }}>
        Lương & Thu Nhập
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Chi tiết thù lao, thưởng phụ cấp và lịch sử nhận lương.
      </p>

      {/* Salary Summary Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Net Salary Glow Card */}
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
            Chu kỳ tính lương: 26/05/2026 - 25/06/2026
          </p>
          <button 
            className="btn-primary" 
            style={{ marginTop: '24px', width: 'fit-content' }}
            onClick={() => handleDownload('Tháng 06/2026')}
          >
            📥 Tải Phiếu Lương (.PDF)
          </button>
        </div>

        {/* Breakdown Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', marginBottom: '16px' }}>Chi tiết các khoản</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Mức lương cơ bản (1h):</span>
              <span style={{ fontWeight: '500' }}>{formatCurrency(salaryDetail.baseRate)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tổng số giờ làm:</span>
              <span style={{ fontWeight: '500' }}>{salaryDetail.totalHours} giờ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Lương giờ cơ bản:</span>
              <span style={{ fontWeight: '500' }}>{formatCurrency(salaryDetail.baseSalary)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Phụ cấp ăn ca/xăng:</span>
              <span style={{ fontWeight: '500', color: 'var(--success)' }}>+{formatCurrency(salaryDetail.allowance)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Thưởng doanh số/tăng ca:</span>
              <span style={{ fontWeight: '500', color: 'var(--success)' }}>+{formatCurrency(salaryDetail.bonus)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Khấu trừ đi muộn:</span>
              <span style={{ fontWeight: '500', color: 'var(--danger)' }}>-{formatCurrency(salaryDetail.deduction)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Salary History */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', marginBottom: '20px' }}>Lịch sử nhận lương</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Kỳ lương</th>
                <th>Giờ làm</th>
                <th>Lương cứng</th>
                <th>Thưởng/Phụ cấp</th>
                <th>Thực nhận</th>
                <th>Ngày chuyển</th>
                <th>Phiếu lương</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: '600' }}>{row.period}</td>
                  <td>{row.hours}</td>
                  <td>{row.base}</td>
                  <td style={{ color: 'var(--success)' }}>{row.allowances}</td>
                  <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{row.net}</td>
                  <td>{row.date}</td>
                  <td>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                      onClick={() => handleDownload(row.period)}
                    >
                      Tải về
                    </button>
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
