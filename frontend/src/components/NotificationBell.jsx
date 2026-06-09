import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../services/api';

const TYPE_CONFIG = {
  schedule_change: { icon: '📅', color: '#60a5fa' },
  leave_approved: { icon: '✅', color: '#10b981' },
  leave_rejected: { icon: '❌', color: '#ef4444' },
  leave_pending: { icon: '⏳', color: '#f59e0b' },
  task_assigned: { icon: '📋', color: '#8b5cf6' },
  task_updated: { icon: '✏️', color: '#3b82f6' },
  task_completed: { icon: '🎉', color: '#10b981' },
  payroll_calculated: { icon: '💵', color: '#10b981' },
  payroll_approved: { icon: '✅', color: '#10b981' },
  payroll_paid: { icon: '💰', color: '#10b981' },
  shift_swap_request: { icon: '🔄', color: '#f59e0b' },
  shift_swap_approved: { icon: '✅', color: '#10b981' },
  shift_swap_rejected: { icon: '❌', color: '#ef4444' },
  system: { icon: '⚙️', color: '#6b7280' },
  general: { icon: '📢', color: '#3b82f6' }
};

const fmtTime = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
};

export default function NotificationBell({ userId }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const dropRef = useRef(null);
  const navigate = useNavigate();
  const LIMIT = 10;

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await notificationApi.getUnreadCount();
      if (data.success) setUnreadCount(data.data.count);
    } catch { /* silent */ }
  }, []);

  const fetchNotifications = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const data = await notificationApi.getNotifications({ page: pageNum, limit: LIMIT });
      if (data.success) {
        setNotifications(prev => pageNum === 1 ? data.data : [...prev, ...data.data]);
        setHasMore(data.pagination.page < data.pagination.pages);
        setUnreadCount(data.unreadCount);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) {
      setPage(1);
      fetchNotifications(1);
    }
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleMarkRead = async (e, notif) => {
    e.stopPropagation();
    try {
      await notificationApi.markAsRead(notif._id);
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const handleDelete = async (e, notif) => {
    e.stopPropagation();
    try {
      await notificationApi.deleteNotification(notif._id);
      setNotifications(prev => prev.filter(n => n._id !== notif._id));
      if (!notif.read) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await handleMarkRead({ stopPropagation: () => {} }, notif);
    }
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
      setOpen(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(nextPage);
    }
  };

  return (
    <div ref={dropRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: open ? 'rgba(225, 29, 72, 0.15)' : 'transparent',
          border: 'none',
          color: open ? 'var(--primary)' : 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '18px',
          padding: '6px 8px',
          borderRadius: '8px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        title="Thông báo"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '9px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg-main)',
            lineHeight: '1'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '380px',
          maxHeight: '520px',
          background: '#0d111a',
          border: '1px solid var(--border-glass)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 1000,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-glass)',
          }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
              Thông báo
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: '6px',
                  background: 'var(--primary)',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 7px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {unreadCount}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  Đánh dấu đã đọc
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '16px'
              }}>✕</button>
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {notifications.length === 0 && !loading ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Không có thông báo nào
              </div>
            ) : (
              <>
                {notifications.map((notif) => {
                  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.general;
                  return (
                    <div
                      key={notif._id}
                      onClick={() => handleNotificationClick(notif)}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        cursor: notif.actionUrl ? 'pointer' : 'default',
                        background: notif.read ? 'transparent' : 'rgba(225, 29, 72, 0.03)',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => { if (!notif.read) e.currentTarget.style.background = 'rgba(225, 29, 72, 0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(225, 29, 72, 0.03)'; }}
                    >
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: `${cfg.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '15px',
                        flexShrink: 0,
                      }}>
                        {cfg.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: notif.read ? '400' : '600',
                            color: notif.read ? 'var(--text-secondary)' : '#fff',
                            lineHeight: '1.3',
                          }}>
                            {notif.title}
                          </div>
                          {!notif.read && (
                            <div style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: 'var(--primary)',
                              flexShrink: 0,
                              marginTop: '4px'
                            }} />
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.4' }}>
                          {notif.message.length > 80 ? notif.message.slice(0, 80) + '...' : notif.message}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {fmtTime(notif.createdAt)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                        {!notif.read && (
                          <button onClick={(e) => handleMarkRead(e, notif)} style={{
                            background: 'transparent', border: 'none', color: 'var(--text-muted)',
                            cursor: 'pointer', fontSize: '12px', padding: '2px 4px'
                          }} title="Đánh dấu đã đọc">✓</button>
                        )}
                        <button onClick={(e) => handleDelete(e, notif)} style={{
                          background: 'transparent', border: 'none', color: 'var(--text-muted)',
                          cursor: 'pointer', fontSize: '12px', padding: '2px 4px'
                        }} title="Xóa">✕</button>
                      </div>
                    </div>
                  );
                })}

                {hasMore && (
                  <div style={{ textAlign: 'center', padding: '12px' }}>
                    <button onClick={loadMore} disabled={loading} style={{
                      background: 'transparent', border: '1px solid var(--border-glass)',
                      color: 'var(--text-secondary)', padding: '8px 20px', borderRadius: '8px',
                      cursor: loading ? 'default' : 'pointer', fontSize: '12px'
                    }}>
                      {loading ? 'Đang tải...' : 'Xem thêm'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border-glass)',
            textAlign: 'center'
          }}>
            <button onClick={() => { navigate('/notifications'); setOpen(false); }}
              style={{
                background: 'transparent', border: 'none', color: 'var(--primary)',
                cursor: 'pointer', fontSize: '12px', fontWeight: '600'
              }}>
              Xem tất cả thông báo →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
