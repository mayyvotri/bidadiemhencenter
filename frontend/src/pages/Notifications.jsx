import { useState, useEffect, useCallback } from 'react';
import { notificationApi } from '../services/api';
import NotificationBell from '../components/NotificationBell';
import { useMediaQuery } from '../hooks/useMediaQuery';

const TYPE_CONFIG = {
  schedule_change: { icon: '📅', color: 'var(--info-text)', label: 'Thay đổi lịch' },
  leave_approved: { icon: '✅', color: 'var(--success)', label: 'Nghỉ phép được duyệt' },
  leave_rejected: { icon: '❌', color: 'var(--danger)', label: 'Nghỉ phép bị từ chối' },
  leave_pending: { icon: '⏳', color: 'var(--warning)', label: 'Yêu cầu nghỉ phép' },
  task_assigned: { icon: '📋', color: '#8b5cf6', label: 'Nhiệm vụ mới' },
  task_updated: { icon: '✏️', color: 'var(--info)', label: 'Nhiệm vụ cập nhật' },
  task_completed: { icon: '🎉', color: 'var(--success)', label: 'Nhiệm vụ hoàn thành' },
  payroll_calculated: { icon: '💵', color: 'var(--success)', label: 'Lương đã tính' },
  payroll_approved: { icon: '✅', color: 'var(--success)', label: 'Lương đã duyệt' },
  payroll_paid: { icon: '💰', color: 'var(--success)', label: 'Lương đã thanh toán' },
  shift_swap_request: { icon: '🔄', color: 'var(--warning)', label: 'Yêu cầu đổi ca' },
  shift_swap_approved: { icon: '✅', color: 'var(--success)', label: 'Đổi ca được duyệt' },
  shift_swap_rejected: { icon: '❌', color: 'var(--danger)', label: 'Đổi ca bị từ chối' },
  system: { icon: '⚙️', color: '#6b7280', label: 'Hệ thống' },
  general: { icon: '📢', color: 'var(--info)', label: 'Thông báo' }
};

const PRIORITY_BADGE = {
  urgent: { label: 'Khẩn cấp', color: 'var(--danger)' },
  high: { label: 'Cao', color: 'var(--warning)' },
  normal: { label: 'Thường', color: 'var(--info)' },
  low: { label: 'Thấp', color: '#6b7280' }
};

const fmtDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export default function Notifications() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const LIMIT = 15;

  const fetchNotifications = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: LIMIT };
      if (filter === 'unread') params.unreadOnly = 'true';
      const data = await notificationApi.getNotifications(params);
      if (data.success) {
        setNotifications(prev => pageNum === 1 ? data.data : [...prev, ...data.data]);
        setHasMore(data.pagination.page < data.pagination.pages);
        setUnreadCount(data.unreadCount);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => {
    setPage(1);
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleMarkRead = async (notif) => {
    try {
      await notificationApi.markAsRead(notif._id);
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleDelete = async (notif) => {
    try {
      await notificationApi.deleteNotification(notif._id);
      setNotifications(prev => prev.filter(n => n._id !== notif._id));
      if (!notif.read) setUnreadCount(prev => Math.max(0, prev - 1));
      if (selectedNotif?._id === notif._id) setSelectedNotif(null);
    } catch { /* silent */ }
  };

  const handleClearAll = async () => {
    if (!confirm('Xóa tất cả thông báo?')) return;
    try {
      await notificationApi.clearAll();
      setNotifications([]);
      setUnreadCount(0);
      setSelectedNotif(null);
    } catch { /* silent */ }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const next = page + 1;
      setPage(next);
      fetchNotifications(next);
    }
  };

  const filtered = notifications.filter(n => {
    if (typeFilter === 'all') return true;
    return n.type === typeFilter;
  });

  const getUser = () => {
    try { return JSON.parse(localStorage.getItem('user_info') || '{}'); } catch { return {}; }
  };
  const user = getUser();

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Thông báo
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả thông báo đã được đọc'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {unreadCount > 0 && (
            <button className="btn-secondary" onClick={handleMarkAllRead}>✓ Đánh dấu đã đọc</button>
          )}
          <button className="btn-secondary" onClick={handleClearAll} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
            🗑 Xóa tất cả
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Trạng thái:</span>
        {[{ key: 'all', label: 'Tất cả' }, { key: 'unread', label: 'Chưa đọc' }].map(f => (
          <button key={f.key} className={`btn-secondary ${filter === f.key ? 'btn-primary' : ''}`}
            style={{ padding: '5px 14px', fontSize: '12px', background: filter === f.key ? 'var(--primary)' : '' }}
            onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '8px' }}>Loại:</span>
        <select className="form-input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '5px 12px', fontSize: '12px', background: 'var(--bg-darker)', minWidth: '150px' }}>
          <option value="all">Tất cả loại</option>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Layout: List + Detail */}
      <div style={{ display: 'grid', gridTemplateColumns: (selectedNotif && !isMobile) ? '1fr 1fr' : '1fr', gap: '20px', alignItems: 'start' }}>
        {/* List */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowY: 'auto', maxHeight: '600px' }}>
            {filtered.length === 0 && !loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔔</div>
                <div style={{ fontSize: '14px' }}>Không có thông báo nào</div>
              </div>
            ) : (
              <>
                {filtered.map(notif => {
                  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.general;
                  const prio = PRIORITY_BADGE[notif.priority] || PRIORITY_BADGE.normal;
                  const isSelected = selectedNotif?._id === notif._id;
                  return (
                    <div key={notif._id} onClick={() => setSelectedNotif(notif)}
                      style={{
                        display: 'flex',
                        gap: '14px',
                        padding: '14px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(225, 29, 72, 0.08)' : notif.read ? 'transparent' : 'rgba(225, 29, 72, 0.03)',
                        borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                      }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: `${cfg.color}20`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', flexShrink: 0
                      }}>
                        {cfg.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '14px', fontWeight: notif.read ? '500' : '700',
                            color: notif.read ? 'var(--text-secondary)' : 'var(--text-primary)'
                          }}>
                            {notif.title}
                          </span>
                          {!notif.read && (
                            <span style={{
                              width: '8px', height: '8px', borderRadius: '50%',
                              background: 'var(--primary)', flexShrink: 0
                            }} />
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', lineHeight: '1.4' }}>
                          {notif.message.length > 100 ? notif.message.slice(0, 100) + '...' : notif.message}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmtDate(notif.createdAt)}</span>
                          {notif.priority === 'urgent' && (
                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger)', fontWeight: '600' }}>Khẩn cấp</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {hasMore && (
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <button onClick={loadMore} disabled={loading} className="btn-secondary"
                      style={{ padding: '8px 24px', fontSize: '13px' }}>
                      {loading ? 'Đang tải...' : 'Tải thêm'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedNotif && (
          <div className="glass-card animate-fade-in" style={{ padding: '20px', position: 'sticky', top: '84px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Chi tiết</span>
              <button onClick={() => setSelectedNotif(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>

            {(() => {
              const cfg = TYPE_CONFIG[selectedNotif.type] || TYPE_CONFIG.general;
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: `${cfg.color}20`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                    }}>
                      {cfg.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedNotif.title}</div>
                      <div style={{ fontSize: '12px', color: cfg.color, marginTop: '2px' }}>{cfg.label}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', marginBottom: '16px' }}>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                      {selectedNotif.message}
                    </div>
                    {[
                      ['Người nhận', selectedNotif.recipientName],
                      ['Thời gian', fmtDate(selectedNotif.createdAt)],
                      ['Trạng thái', selectedNotif.read ? 'Đã đọc' : 'Chưa đọc'],
                      ['Độ ưu tiên', PRIORITY_BADGE[selectedNotif.priority]?.label || 'Thường'],
                      ...(selectedNotif.readAt ? [['Đọc lúc', fmtDate(selectedNotif.readAt)]] : []),
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {!selectedNotif.read && (
                      <button className="btn-primary" style={{ width: '100%', padding: '9px', fontSize: '13px' }}
                        onClick={() => handleMarkRead(selectedNotif)}>✓ Đánh dấu đã đọc</button>
                    )}
                    <button className="btn-secondary" style={{ width: '100%', padding: '9px', fontSize: '13px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => handleDelete(selectedNotif)}>🗑 Xóa thông báo</button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
