import { useState, useEffect } from 'react';
import { attendanceRequestApi } from '../services/attendanceRequestApi';
import { useMediaQuery } from '../hooks/useMediaQuery';
import ResponsiveTable from '../components/ResponsiveTable';

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
    approved: { label: 'Đã duyệt', color: 'var(--success-text)', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
    rejected: { label: 'Từ chối', color: 'var(--danger)', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' }
  };
  return map[status] || { label: status, color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)' };
};

export default function AttendanceRequestHistory() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedPhoto, setExpandedPhoto] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const data = await attendanceRequestApi.getMyRequests(params);
      if (data.success) {
        setRequests(data.data);
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
    // Auto-refresh every 5 seconds to catch manager approval/rejection updates
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '24px', gap: isMobile ? '12px' : '0' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: isMobile ? '22px' : '28px', marginBottom: '4px' }}>
            Lịch Sử Yêu Cầu
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Xem lịch sử yêu cầu chấm công của bạn
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: isMobile ? '10px 14px' : '6px 14px', borderRadius: '6px', border: 'none',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                background: filter === f ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: filter === f ? 'var(--text-primary)' : 'var(--text-secondary)',
                flex: isMobile ? 1 : 'none',
                minHeight: isMobile ? '40px' : 'auto'
              }}
            >
              {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chờ duyệt' : f === 'approved' ? 'Đã duyệt' : 'Từ chối'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '12px', borderRadius: '8px', marginBottom: '20px',
          color: 'var(--danger)', fontSize: '14px'
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
          <div style={{ fontSize: '16px' }}>Chưa có yêu cầu nào</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {requests.map(req => {
            const statusInfo = getStatusInfo(req.status);
            return (
              <div key={req._id} className="glass-card" style={{ padding: isMobile ? '14px' : '20px' }}>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', alignItems: isMobile ? 'stretch' : 'flex-start' }}>
                  {/* Photo thumbnail */}
                  <div style={{ flexShrink: 0, alignSelf: isMobile ? 'flex-start' : 'flex-start' }}>
                    <img
                      src={req.photoUrl}
                      alt="Attendance"
                      onClick={() => setExpandedPhoto(expandedPhoto === req._id ? null : req._id)}
                      style={{
                        width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px',
                        cursor: 'pointer', border: '1px solid var(--border-glass)',
                        transition: 'transform 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  </div>

                  {/* Details */}
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '14px', fontWeight: '700',
                            color: req.type === 'checkin' ? 'var(--success-text)' : 'var(--danger)'
                          }}>
                            {req.type === 'checkin' ? '🟢 Check In' : '🔴 Check Out'}
                          </span>
                          <span style={{
                            padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                            background: statusInfo.bg, color: statusInfo.color,
                            border: `1px solid ${statusInfo.border}`
                          }}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Yêu cầu lúc {formatDate(req.requestTime)} lúc {formatTime(req.requestTime)}
                        </div>
                      </div>

                      {req.status === 'rejected' && req.rejectionReason && (
                        <div style={{
                          padding: '8px 12px', borderRadius: '6px',
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          fontSize: '12px', color: 'var(--danger)', maxWidth: '300px'
                        }}>
                          <strong>Lý do từ chối:</strong> {req.rejectionReason}
                        </div>
                      )}
                    </div>

                    {/* Location info */}
                    {req.location && (req.location.latitude || req.location.longitude) && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        📍 {req.location.latitude?.toFixed(6)}, {req.location.longitude?.toFixed(6)}
                        {req.location.address && ` — ${req.location.address}`}
                      </div>
                    )}

                    {/* Expanded photo */}
                    {expandedPhoto === req._id && (
                      <div style={{ marginTop: '12px' }}>
                        <img
                          src={req.photoUrl}
                          alt="Full size"
                          style={{ width: '100%', maxWidth: '400px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}
                        />
                      </div>
                    )}

                    {/* Reviewed info */}
                    {req.reviewedAt && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Đã xử lý lúc {formatDate(req.reviewedAt)} lúc {formatTime(req.reviewedAt)}
                        {req.reviewedBy?.name && ` bởi ${req.reviewedBy.name}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
