import { useState, useEffect, useCallback } from 'react';
import { leaveRequestApi } from '../services/api';

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

export default function LeaveApproval() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [filterStatus, setFilterStatus] = useState('pending');

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;

      const data = await leaveRequestApi.getAllLeaveRequests(params);
      if (data.success) {
        setRequests(data.data);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách yêu cầu nghỉ phép');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (id) => {
    try {
      const data = await leaveRequestApi.approveLeaveRequest(id);
      if (data.success) {
        fetchRequests();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể phê duyệt yêu cầu');
    }
  };

  const handleRejectClick = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      const data = await leaveRequestApi.rejectLeaveRequest(selectedRequest._id, rejectionReason);
      if (data.success) {
        setShowRejectModal(false);
        fetchRequests();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể từ chối yêu cầu');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-primary)' }}>Đang tải...</div>;
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: 'var(--text-primary)', marginBottom: '8px' }}>
        Phê Duyệt Nghỉ Phép
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Xem và phê duyệt các yêu cầu nghỉ phép của nhân viên.
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

      {/* Requests Table */}
      {requests.length === 0 ? (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Không có yêu cầu nào
        </div>
      ) : (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Nhân viên</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Loại nghỉ</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ngày bắt đầu</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ngày kết thúc</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Số ngày</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Lý do</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Trạng thái</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ngày tạo</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request._id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>
                    <div style={{ fontWeight: '500' }}>{request.user?.name || 'N/A'}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{request.user?.position || ''}</div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{LEAVE_TYPE_LABELS[request.leaveType] || request.leaveType}</td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{formatDate(request.startDate)}</td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{formatDate(request.endDate)}</td>
                  <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{request.days}</td>
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
                  <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {formatDate(request.createdAt)} {formatTime(request.createdAt)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {request.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleApprove(request._id)}
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
                          onClick={() => handleRejectClick(request)}
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
                    {request.status === 'rejected' && request.rejectionReason && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {request.rejectionReason}
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
      {showRejectModal && selectedRequest && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: '12px', maxWidth: '500px', width: '90%', padding: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Từ Chối Yêu Cầu Nghỉ Phép
            </h2>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Nhân viên:</p>
              <p style={{ color: 'var(--text-primary)', fontSize: '14px', marginBottom: '8px' }}>{selectedRequest.user?.name}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Loại nghỉ:</p>
              <p style={{ color: 'var(--text-primary)', fontSize: '14px', marginBottom: '8px' }}>{LEAVE_TYPE_LABELS[selectedRequest.leaveType]}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Thời gian:</p>
              <p style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{formatDate(selectedRequest.startDate)} - {formatDate(selectedRequest.endDate)} ({selectedRequest.days} ngày)</p>
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
