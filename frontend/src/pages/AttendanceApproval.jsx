import { useState, useEffect } from 'react';
import { attendanceRequestApi } from '../services/attendanceRequestApi';
import { emitEvent, Events } from '../utils/events';

const formatDate = (date) => {
  if (!date) return '--/--/----';
  return new Date(date).toLocaleDateString('vi-VN');
};

const formatTime = (date) => {
  if (!date) return '--:--';
  return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const getStatusInfo = (status) => {
  const map = {
    pending: { label: 'Chờ duyệt', color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)' },
    approved: { label: 'Đã duyệt', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
    rejected: { label: 'Từ chối', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' }
  };
  return map[status] || { label: status, color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)' };
};

export default function AttendanceApproval() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, reason: '' });
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

  const applyRequestUpdate = (requestId, changes) => {
    setRequests(prev => {
      const target = prev.find(item => item._id === requestId);
      if (!target) return prev;

      const updatedRequest = { ...target, ...changes };
      if (filter !== 'all' && updatedRequest.status !== filter) {
        return prev.filter(item => item._id !== requestId);
      }

      return prev.map(item => item._id === requestId ? updatedRequest : item);
    });

    setStats(prev => {
      const nextStats = { ...prev };
      const currentRequest = requests.find(item => item._id === requestId);
      const previousStatus = currentRequest?.status;
      const nextStatus = changes.status;

      if (previousStatus && previousStatus !== nextStatus && nextStats[previousStatus] !== undefined) {
        nextStats[previousStatus] = Math.max(0, nextStats[previousStatus] - 1);
      }
      if (nextStatus && previousStatus !== nextStatus && nextStats[nextStatus] !== undefined) {
        nextStats[nextStatus] += 1;
      }

      return nextStats;
    });
  };

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const data = await attendanceRequestApi.getAllRequests(params);
      if (data.success) {
        setRequests(data.data);
        const all = data.data;
        setStats({
          pending: all.filter(r => r.status === 'pending').length,
          approved: all.filter(r => r.status === 'approved').length,
          rejected: all.filter(r => r.status === 'rejected').length,
          total: all.length
        });
      } else {
        setError(data.message || 'Không thể tải dữ liệu');
      }
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // Auto-refresh every 5 seconds for real-time updates
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      const res = await attendanceRequestApi.approve(id);
      const updated = res?.data || res;
      console.log('[AttendanceApproval] approve response', updated);

      applyRequestUpdate(id, {
        status: updated.status,
        reviewedBy: updated.reviewedBy,
        reviewedAt: updated.reviewedAt
      });

      emitEvent(Events.PAYROLL_UPDATED);
    } catch (err) {
      alert(err.message || 'Không thể duyệt yêu cầu');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.reason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    setActionLoading(rejectModal.id);
    try {
      const res = await attendanceRequestApi.reject(rejectModal.id, rejectModal.reason);
      const updated = res?.data || res;
      console.log('[AttendanceApproval] reject response', updated);

      applyRequestUpdate(rejectModal.id, {
        status: updated.status,
        rejectionReason: updated.rejectionReason,
        reviewedBy: updated.reviewedBy,
        reviewedAt: updated.reviewedAt
      });

      setRejectModal({ open: false, id: null, reason: '' });
    } catch (err) {
      alert(err.message || 'Không thể từ chối yêu cầu');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', marginBottom: '4px' }}>
          Duyệt Yêu Cầu Chấm Công
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Xem và duyệt các yêu cầu check-in / check-out của nhân viên
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Chờ duyệt', value: stats.pending, color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
          { label: 'Đã duyệt', value: stats.approved, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
          { label: 'Từ chối', value: stats.rejected, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
          { label: 'Tổng cộng', value: stats.total, color: '#fff', bg: 'rgba(255,255,255,0.05)' }
        ].map((stat, i) => (
          <div key={i} className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px', borderRadius: '6px', border: 'none',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              background: filter === f ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: filter === f ? '#fff' : 'var(--text-secondary)'
            }}
          >
            {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chờ duyệt' : f === 'approved' ? 'Đã duyệt' : 'Từ chối'}
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '12px', borderRadius: '8px', marginBottom: '20px',
          color: '#ef4444', fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          ⏳ Đang tải dữ liệu...
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <div style={{ fontSize: '16px' }}>Không có yêu cầu nào</div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Loại</th>
                  <th>Ảnh</th>
                  <th>GPS</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => {
                  const statusInfo = getStatusInfo(req.status);
                  return (
                    <tr key={req._id}>
                      <td>
                        <div style={{ fontWeight: '600', color: '#fff' }}>
                          {req.employee?.name || 'N/A'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {req.employee?.email}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: '700', fontSize: '14px',
                          color: req.type === 'checkin' ? '#22c55e' : '#ef4444'
                        }}>
                          {req.type === 'checkin' ? '🟢 Check In' : '🔴 Check Out'}
                        </span>
                      </td>
                      <td>
                        <img
                          src={req.photoUrl}
                          alt="Photo"
                          onClick={() => setExpandedPhoto(expandedPhoto === req._id ? null : req._id)}
                          style={{
                            width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px',
                            cursor: 'pointer', border: '1px solid var(--border-glass)'
                          }}
                        />
                        {expandedPhoto === req._id && (
                          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
                            <div style={{ maxWidth: '600px', width: '100%' }}>
                              <img src={req.photoUrl} alt="Full size" style={{ width: '100%', borderRadius: '12px' }} />
                              <button
                                onClick={() => setExpandedPhoto(null)}
                                style={{
                                  width: '100%', marginTop: '12px', padding: '10px',
                                  background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-glass)',
                                  borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px'
                                }}
                              >
                                Đóng
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        {req.location?.latitude ? (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <div>{req.location.latitude.toFixed(5)}</div>
                            <div>{req.location.longitude?.toFixed(5)}</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', color: '#fff' }}>{formatDate(req.requestTime)}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatTime(req.requestTime)}</div>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                          background: statusInfo.bg, color: statusInfo.color,
                          border: `1px solid ${statusInfo.border}`
                        }}>
                          {statusInfo.label}
                        </span>
                        {req.status === 'rejected' && req.rejectionReason && (
                          <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', maxWidth: '150px' }}>
                            Lý do: {req.rejectionReason}
                          </div>
                        )}
                        {req.status !== 'pending' && req.reviewedBy && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {req.reviewedBy.name}
                          </div>
                        )}
                      </td>
                      <td>
                        {req.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleApprove(req._id)}
                              disabled={actionLoading === req._id}
                              style={{
                                padding: '6px 14px', borderRadius: '6px', border: 'none',
                                background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                                fontSize: '12px', fontWeight: '700', cursor: actionLoading === req._id ? 'not-allowed' : 'pointer',
                                opacity: actionLoading === req._id ? 0.5 : 1
                              }}
                            >
                              {actionLoading === req._id ? '...' : '✓ Duyệt'}
                            </button>
                            <button
                              onClick={() => setRejectModal({ open: true, id: req._id, reason: '' })}
                              disabled={actionLoading === req._id}
                              style={{
                                padding: '6px 14px', borderRadius: '6px', border: 'none',
                                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                                opacity: actionLoading === req._id ? 0.5 : 1
                              }}
                            >
                              ✕ Từ chối
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                              background: statusInfo.bg, color: statusInfo.color,
                              border: `1px solid ${statusInfo.border}`
                            }}>
                              {statusInfo.label}
                            </span>
                            {req.reviewedBy && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {req.reviewedBy.name}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '20px'
        }}>
          <div className="glass-card" style={{ padding: '24px', maxWidth: '500px', width: '100%' }}>
            <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px' }}>
              Từ Chối Yêu Cầu
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Vui lòng nhập lý do từ chối yêu cầu này.
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="Ví dụ: Ảnh không rõ khuôn mặt, GPS không đúng địa điểm..."
              rows={4}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)',
                color: '#fff', fontSize: '14px', resize: 'vertical', marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRejectModal({ open: false, id: null, reason: '' })}
                style={{
                  padding: '10px 20px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)',
                  color: '#fff', fontSize: '14px', cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectModal.reason.trim()}
                style={{
                  padding: '10px 20px', borderRadius: '8px',
                  background: '#ef4444', border: 'none',
                  color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                  opacity: !rejectModal.reason.trim() ? 0.5 : 1
                }}
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
