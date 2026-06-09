import { useState, useEffect, useCallback } from 'react';
import { leaveRequestApi, leaveBalanceApi } from '../services/api';

const LEAVE_TYPE_LABELS = {
  annual: 'Nghỉ phép năm',
  sick: 'Nghỉ ốm',
  personal: 'Nghỉ việc riêng',
  maternity: 'Nghỉ thai sản',
  paternity: 'Nghỉ bố',
  unpaid: 'Nghỉ không lương'
};

const STATUS_LABELS = {
  pending: 'Đang chờ',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
  cancelled: 'Đã hủy'
};

const STATUS_COLORS = {
  pending: '#eab308',
  approved: '#22c55e',
  rejected: '#ef4444',
  cancelled: '#6b7280'
};

const formatDate = (date) => {
  if (!date) return '--/--/----';
  return new Date(date).toLocaleDateString('vi-VN');
};

export default function LeaveRequest() {
  const [requests, setRequests] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [requestsData, balanceData] = await Promise.all([
        leaveRequestApi.getMyLeaveRequests(),
        leaveBalanceApi.getMyLeaveBalance()
      ]);
      
      if (requestsData.success) setRequests(requestsData.data);
      if (balanceData.success) setBalance(balanceData.data);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const data = await leaveRequestApi.createLeaveRequest({
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
        emergencyContact: {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone
        }
      });

      if (data.success) {
        setShowModal(false);
        setFormData({
          leaveType: 'annual',
          startDate: '',
          endDate: '',
          reason: '',
          emergencyContactName: '',
          emergencyContactPhone: ''
        });
        fetchData();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể tạo yêu cầu nghỉ phép');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Bạn có chắc muốn hủy yêu cầu này?')) return;

    try {
      const data = await leaveRequestApi.cancelLeaveRequest(id);
      if (data.success) {
        fetchData();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể hủy yêu cầu');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: '#fff', marginBottom: '8px' }}>
        Yêu Cầu Nghỉ Phép
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Tạo và theo dõi các yêu cầu nghỉ phép của bạn.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: '#ef4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Leave Balance */}
      {balance && (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: '#fff', marginBottom: '20px' }}>
            Số Ngày Nghỉ Phép Còn Lại
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Nghỉ phép năm</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>{balance.annual}</div>
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Nghỉ ốm</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>{balance.sick}</div>
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Nghỉ việc riêng</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>{balance.personal}</div>
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Nghỉ thai sản</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>{balance.maternity}</div>
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Nghỉ bố</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>{balance.paternity}</div>
            </div>
          </div>
        </div>
      )}

      {/* Create Request Button */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: '12px 24px',
          background: 'var(--primary)',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '14px',
          cursor: 'pointer',
          marginBottom: '24px'
        }}
      >
        + Tạo Yêu Cầu Nghỉ Phép
      </button>

      {/* Leave Requests List */}
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#fff', marginBottom: '16px' }}>
        Lịch Sử Yêu Cầu
      </h2>

      {requests.length === 0 ? (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Bạn chưa có yêu cầu nghỉ phép nào
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
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Trạng thái</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request._id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{LEAVE_TYPE_LABELS[request.leaveType] || request.leaveType}</td>
                  <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{formatDate(request.startDate)}</td>
                  <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{formatDate(request.endDate)}</td>
                  <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{request.days}</td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {request.reason}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: `${STATUS_COLORS[request.status]}20`,
                      color: STATUS_COLORS[request.status]
                    }}>
                      {STATUS_LABELS[request.status] || request.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {(request.status === 'pending' || request.status === 'approved') && (
                      <button
                        onClick={() => handleCancel(request._id)}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          color: '#ef4444',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Hủy
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Request Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#fff', marginBottom: '24px' }}>
              Tạo Yêu Cầu Nghỉ Phép
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Loại nghỉ phép</label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                >
                  <option value="annual">Nghỉ phép năm</option>
                  <option value="sick">Nghỉ ốm</option>
                  <option value="personal">Nghỉ việc riêng</option>
                  <option value="maternity">Nghỉ thai sản</option>
                  <option value="paternity">Nghỉ bố</option>
                  <option value="unpaid">Nghỉ không lương</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Ngày kết thúc</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Lý do</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  required
                  placeholder="Nhập lý do nghỉ phép"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Người liên hệ khẩn cấp</label>
                <input
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  placeholder="Tên người liên hệ"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px', marginBottom: '8px' }}
                />
                <input
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  placeholder="Số điện thoại"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: 'var(--primary)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Gửi Yêu Cầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
