import { useState, useEffect, useCallback } from 'react';
import { leaveBalanceApi, leaveRequestApi } from '../services/api';

const formatDate = (date) => {
  if (!date) return '--/--/----';
  return new Date(date).toLocaleDateString('vi-VN');
};

export default function LeaveBalance() {
  const [balance, setBalance] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [balanceData, requestsData] = await Promise.all([
        leaveBalanceApi.getMyLeaveBalance(),
        leaveRequestApi.getMyLeaveRequests({ year: selectedYear, status: 'approved' })
      ]);
      
      if (balanceData.success) setBalance(balanceData.data);
      if (requestsData.success) setRequests(requestsData.data);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateUsedDays = (leaveType) => {
    return requests
      .filter(r => r.leaveType === leaveType)
      .reduce((sum, r) => sum + r.days, 0);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-primary)' }}>Đang tải...</div>;
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: 'var(--text-primary)', marginBottom: '8px' }}>
        Số Ngày Nghỉ Phép
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Xem số ngày nghỉ phép còn lại và lịch sử sử dụng.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: 'var(--danger)', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Year Selector */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Năm:</label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
        >
          <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
          <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
          <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
        </select>
      </div>

      {/* Leave Balance Cards */}
      {balance && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Nghỉ Phép Năm
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Tổng:</span>
              <span style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700' }}>12</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Đã dùng:</span>
              <span style={{ color: 'var(--danger)', fontSize: '20px', fontWeight: '700' }}>{calculateUsedDays('annual')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Còn lại:</span>
              <span style={{ color: 'var(--success-text)', fontSize: '24px', fontWeight: '700' }}>{balance.annual}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${((12 - balance.annual) / 12) * 100}%`,
                  height: '100%',
                  background: 'var(--info)',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Nghỉ Ốm
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Tổng:</span>
              <span style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700' }}>10</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Đã dùng:</span>
              <span style={{ color: 'var(--danger)', fontSize: '20px', fontWeight: '700' }}>{calculateUsedDays('sick')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Còn lại:</span>
              <span style={{ color: 'var(--success-text)', fontSize: '24px', fontWeight: '700' }}>{balance.sick}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${((10 - balance.sick) / 10) * 100}%`,
                  height: '100%',
                  background: 'var(--danger)',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Nghỉ Việc Riêng
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Tổng:</span>
              <span style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700' }}>3</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Đã dùng:</span>
              <span style={{ color: 'var(--danger)', fontSize: '20px', fontWeight: '700' }}>{calculateUsedDays('personal')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Còn lại:</span>
              <span style={{ color: 'var(--success-text)', fontSize: '24px', fontWeight: '700' }}>{balance.personal}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${((3 - balance.personal) / 3) * 100}%`,
                  height: '100%',
                  background: '#eab308',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Nghỉ Thai Sản
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Tổng:</span>
              <span style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700' }}>90</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Đã dùng:</span>
              <span style={{ color: 'var(--danger)', fontSize: '20px', fontWeight: '700' }}>{calculateUsedDays('maternity')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Còn lại:</span>
              <span style={{ color: 'var(--success-text)', fontSize: '24px', fontWeight: '700' }}>{balance.maternity}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${((90 - balance.maternity) / 90) * 100}%`,
                  height: '100%',
                  background: '#ec4899',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Nghỉ Bố
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Tổng:</span>
              <span style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700' }}>14</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Đã dùng:</span>
              <span style={{ color: 'var(--danger)', fontSize: '20px', fontWeight: '700' }}>{calculateUsedDays('paternity')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Còn lại:</span>
              <span style={{ color: 'var(--success-text)', fontSize: '24px', fontWeight: '700' }}>{balance.paternity}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${((14 - balance.paternity) / 14) * 100}%`,
                  height: '100%',
                  background: '#8b5cf6',
                  borderRadius: '4px'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Leave History */}
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '16px' }}>
        Lịch Sử Sử Dụng ({selectedYear})
      </h2>

      {requests.length === 0 ? (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Chưa có lịch sử sử dụng
        </div>
      ) : (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Loại nghỉ</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ngày bắt đầu</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ngày kết thúc</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Số ngày</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Lý do</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ngày duyệt</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request._id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>
                    {request.leaveType === 'annual' && 'Nghỉ phép năm'}
                    {request.leaveType === 'sick' && 'Nghỉ ốm'}
                    {request.leaveType === 'personal' && 'Nghỉ việc riêng'}
                    {request.leaveType === 'maternity' && 'Nghỉ thai sản'}
                    {request.leaveType === 'paternity' && 'Nghỉ bố'}
                    {request.leaveType === 'unpaid' && 'Nghỉ không lương'}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{formatDate(request.startDate)}</td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{formatDate(request.endDate)}</td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{request.days}</td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {request.reason}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {formatDate(request.approvedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
