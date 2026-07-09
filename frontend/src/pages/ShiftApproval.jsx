import { useState, useEffect, useCallback } from 'react';
import { shiftRegistrationApi } from '../services/api';

const STATUS_LABELS = {
  pending: 'Đang chờ',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
  cancelled: 'Đã hủy'
};
const STATUS_COLORS = {
  pending: '#eab308',
  approved: 'var(--success-text)',
  rejected: 'var(--danger)',
  cancelled: '#6b7280'
};

const formatDate = (date) => {
  if (!date) return '--/--/----';
  return new Date(date).toLocaleDateString('vi-VN');
};

const formatTime = (date) => {
  if (!date) return '--:--';
  return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export default function ShiftApproval() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('pending');

  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;

      const data = await shiftRegistrationApi.getAllRegistrations(params);
      if (data.success) {
        setRegistrations(data.data);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đăng ký');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleApprove = async (id) => {
    try {
      const data = await shiftRegistrationApi.approveRegistration(id);
      if (data.success) {
        fetchRegistrations();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể phê duyệt đăng ký');
    }
  };

  const handleRejectClick = (registration) => {
    setSelectedRegistration(registration);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRegistration) return;

    try {
      const data = await shiftRegistrationApi.rejectRegistration(selectedRegistration._id, rejectionReason);
      if (data.success) {
        setShowRejectModal(false);
        fetchRegistrations();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể từ chối đăng ký');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-primary)' }}>Đang tải...</div>;
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: 'var(--text-primary)', marginBottom: '8px' }}>
        Phê Duyệt Đăng Ký Ca
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Xem và phê duyệt các yêu cầu đăng ký ca làm việc của nhân viên.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: 'var(--danger)', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Lọc theo trạng thái:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
          >
            <option value="">Tất cả</option>
            <option value="pending">Đang chờ</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Đã từ chối</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Registrations Table */}
      {registrations.length === 0 ? (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Không có đăng ký nào
        </div>
      ) : (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Nhân viên</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ca làm việc</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ngày bắt đầu</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ghi chú</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Trạng thái</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ngày đăng ký</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => (
                <tr key={reg._id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>
                    <div style={{ fontWeight: '500' }}>{reg.user?.name || 'N/A'}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{reg.user?.position || ''}</div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>
                    <div style={{ fontWeight: '500' }}>{reg.shift?.name || 'N/A'}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{reg.shift?.startTime} - {reg.shift?.endTime}</div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{formatDate(reg.startDate)}</td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {reg.notes || '-'}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: `${STATUS_COLORS[reg.status]}20`,
                      color: STATUS_COLORS[reg.status]
                    }}>
                      {STATUS_LABELS[reg.status] || reg.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {formatDate(reg.createdAt)} {formatTime(reg.createdAt)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {reg.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleApprove(reg._id)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: '6px',
                            color: 'var(--success-text)',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleRejectClick(reg)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            color: 'var(--danger)',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                    {reg.status === 'rejected' && reg.rejectionReason && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {reg.rejectionReason}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRegistration && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: '12px', maxWidth: '500px', width: '90%', padding: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Từ Chối Đăng Ký
            </h2>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Nhân viên:</p>
              <p style={{ color: 'var(--text-primary)', fontSize: '14px', marginBottom: '8px' }}>{selectedRegistration.user?.name}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Ca làm việc:</p>
              <p style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{selectedRegistration.shift?.name}</p>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Lý do từ chối</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Nhập lý do từ chối"
                  required
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
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
                    background: 'var(--danger)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Từ Chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
