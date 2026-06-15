import { useState, useEffect, useCallback } from 'react';
import { approvalApi } from '../services/api';
import { useMediaQuery } from '../hooks/useMediaQuery';

export default function AccountApproval() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPendingUsers = useCallback(async () => {
    try {
      const data = await approvalApi.getPendingApprovals();
      if (data.success) {
        setPendingUsers(data.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch pending approvals');
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      const data = await approvalApi.getAllApprovals(filter);
      if (data.success) {
        setAllUsers(data.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch approvals');
    }
  }, [filter]);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  useEffect(() => {
    if (filter !== 'pending') {
      fetchAllUsers();
    }
  }, [filter, fetchAllUsers]);

  const handleApprove = async (id) => {
    try {
      const data = await approvalApi.approveAccount(id);
      if (data.success) {
        fetchPendingUsers();
        if (filter !== 'pending') {
          fetchAllUsers();
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to approve account');
    }
  };

  const handleRejectClick = (user) => {
    setSelectedUser(user);
    setShowRejectModal(true);
    setRejectReason('');
  };

  const handleReject = async () => {
    try {
      const data = await approvalApi.rejectAccount(selectedUser._id, rejectReason);
      if (data.success) {
        setShowRejectModal(false);
        setSelectedUser(null);
        setRejectReason('');
        fetchPendingUsers();
        if (filter !== 'pending') {
          fetchAllUsers();
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to reject account');
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Đang tải...</div>;

  const displayUsers = filter === 'pending' ? pendingUsers : allUsers;

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: '#fff', margin: 0 }}>
          Duyệt Tài Khoản
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilter('pending')}
            style={{
              padding: '8px 16px',
              background: filter === 'pending' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Chờ duyệt ({pendingUsers.length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            style={{
              padding: '8px 16px',
              background: filter === 'approved' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Đã duyệt
          </button>
          <button
            onClick={() => setFilter('rejected')}
            style={{
              padding: '8px 16px',
              background: filter === 'rejected' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Đã từ chối
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: '#ef4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {displayUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-secondary)', fontSize: '16px' }}>
          Không có tài khoản nào để hiển thị
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {displayUsers.map((user) => (
            <div key={user._id} style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#fff'
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff', margin: 0, marginBottom: '4px' }}>
                    {user.name}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>{user.email}</p>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Vai trò:</span>
                  <span style={{ color: '#fff', fontSize: '14px' }}>{user.role}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>SĐT:</span>
                  <span style={{ color: '#fff', fontSize: '14px' }}>{user.phone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Trạng thái:</span>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    background: user.approvalStatus === 'approved' ? 'rgba(34, 197, 94, 0.1)' : 
                            user.approvalStatus === 'pending' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: user.approvalStatus === 'approved' ? '#22c55e' : 
                           user.approvalStatus === 'pending' ? '#eab308' : '#ef4444'
                  }}>
                    {user.approvalStatus === 'approved' ? 'Đã duyệt' : 
                     user.approvalStatus === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                  </span>
                </div>
              </div>

              {user.approvalStatus === 'pending' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleApprove(user._id)}
                    className="btn-primary"
                    style={{ flex: 1, padding: '10px', fontSize: '14px', fontWeight: '600' }}
                  >
                    Duyệt
                  </button>
                  <button
                    onClick={() => handleRejectClick(user)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      color: '#ef4444',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Từ chối
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showRejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: isMobile ? '0' : '12px', padding: isMobile ? '20px' : '32px', maxWidth: isMobile ? '100%' : '500px', width: isMobile ? '100%' : '90%', height: isMobile ? '100vh' : 'auto', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#fff', marginBottom: '16px' }}>
              Từ chối tài khoản
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Bạn có chắc chắn muốn từ chối tài khoản của {selectedUser?.name}?
            </p>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
                Lý do từ chối (tùy chọn)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleReject}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Từ chối
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedUser(null);
                  setRejectReason('');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
