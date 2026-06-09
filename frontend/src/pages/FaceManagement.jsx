import { useState, useEffect } from 'react';
import { faceRecognitionApi } from '../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '26px', fontWeight: '700', color: '#fff', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  </div>
);

const QualityBadge = ({ score }) => {
  if (!score) return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return <span style={{ color, fontSize: '12px', fontWeight: '600' }}>{score.toFixed(1)}%</span>;
};

const StatusBadge = ({ active }) => (
  <span style={{
    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
    background: active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
    color: active ? '#22c55e' : '#ef4444'
  }}>
    {active ? 'Hoạt động' : 'Vô hiệu'}
  </span>
);

const RoleBadge = ({ role }) => {
  const cfg = { admin: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }, manager: { color: '#a855f7', bg: 'rgba(168,85,247,0.12)' }, staff: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' } };
  const c = cfg[role] || cfg.staff;
  return <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: c.color, background: c.bg }}>{role}</span>;
};

export default function FaceManagement() {
  const [profiles, setProfiles] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [activeTab, setActiveTab] = useState('profiles');
  const [logs, setLogs] = useState([]);
  const [logPagination, setLogPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [logStats, setLogStats] = useState({ total: 0, success: 0, failure: 0, avgConfidence: 0 });
  const [logLoading, setLogLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchProfiles = async (page = 1, f = filter) => {
    setLoading(true);
    try {
      const params = { page, limit: 10, ...(f.status ? { status: f.status } : {}), ...(f.search ? { search: f.search } : {}) };
      const data = await faceRecognitionApi.getAllFaceProfiles(params);
      if (data.success) {
        setProfiles(data.data.profiles);
        setStats(data.data.stats);
        setPagination(data.data.pagination);
      }
    } finally { setLoading(false); }
  };

  const fetchLogs = async (page = 1) => {
    setLogLoading(true);
    try {
      const data = await faceRecognitionApi.getVerificationLogs({ page, limit: 20 });
      if (data.success) {
        setLogs(data.data.logs);
        setLogStats(data.data.stats);
        setLogPagination(data.data.pagination);
      }
    } finally { setLogLoading(false); }
  };

  useEffect(() => { fetchProfiles(); }, []);
  useEffect(() => { if (activeTab === 'logs') fetchLogs(); }, [activeTab]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProfiles(1, filter);
  };

  const handleToggle = async (id) => {
    setActionLoading(id);
    try {
      await faceRecognitionApi.toggleFaceProfile(id);
      await fetchProfiles(pagination.page);
    } finally { setActionLoading(null); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xóa hồ sơ khuôn mặt của "${name}"?`)) return;
    setActionLoading(id);
    try {
      await faceRecognitionApi.deleteFaceProfileAdmin(id);
      await fetchProfiles(pagination.page);
    } finally { setActionLoading(null); }
  };

  const tabs = [
    { id: 'profiles', label: 'Hồ Sơ Khuôn Mặt', icon: '🧠' },
    { id: 'logs', label: 'Nhật Ký Xác Thực', icon: '📋' }
  ];

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
          🧠 Quản Lý Nhận Diện Khuôn Mặt
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Theo dõi, kích hoạt hoặc vô hiệu hóa hồ sơ khuôn mặt của nhân viên
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
            background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
            color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* ── PROFILES TAB ──────────────────────────────────────────────── */}
      {activeTab === 'profiles' && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <StatCard icon="👥" label="Tổng hồ sơ" value={stats.total || 0} sub="đã đăng ký" color="#3b82f6" />
            <StatCard icon="✅" label="Đang hoạt động" value={stats.active || 0} sub="sẵn sàng xác thực" color="#22c55e" />
            <StatCard icon="⏸️" label="Vô hiệu hóa" value={(stats.total - stats.active) || 0} sub="tạm thời khóa" color="#ef4444" />
          </div>

          {/* Search & Filter */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
            <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Tìm theo tên hoặc email..."
                value={filter.search}
                onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                style={{ flex: 1, padding: '9px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}
              />
              <button type="submit" style={{ padding: '9px 16px', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>Tìm</button>
            </form>
            <select value={filter.status} onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); fetchProfiles(1, { ...filter, status: e.target.value }); }}
              style={{ padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer', outline: 'none' }}>
              <option value="">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Vô hiệu</option>
            </select>
          </div>

          {/* Table */}
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải...</div>
            ) : profiles.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧠</div>
                <div style={{ fontSize: '14px' }}>Chưa có hồ sơ khuôn mặt nào</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Nhân viên</th>
                      <th>Vai trò</th>
                      <th>Mẫu khuôn mặt</th>
                      <th>Chất lượng</th>
                      <th>Đăng ký</th>
                      <th>Cập nhật</th>
                      <th>Lần cuối dùng</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: '600', color: '#fff', fontSize: '13px' }}>{p.user?.name || '—'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.user?.email || '—'}</div>
                          {p.user?.phone && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.user.phone}</div>}
                        </td>
                        <td><RoleBadge role={p.user?.role} /></td>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{p.captureCount} mẫu</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.descriptorCount} descriptors</div>
                        </td>
                        <td><QualityBadge score={p.qualityScore} /></td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fmtDate(p.registeredAt)}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fmtDate(p.updatedAt)}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fmtDate(p.lastUsedAt)}</td>
                        <td><StatusBadge active={p.isActive} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleToggle(p.id)}
                              disabled={actionLoading === p.id}
                              style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: actionLoading === p.id ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: '600', background: p.isActive ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)', color: p.isActive ? '#f59e0b' : '#22c55e', opacity: actionLoading === p.id ? 0.5 : 1 }}
                            >
                              {actionLoading === p.id ? '...' : p.isActive ? 'Tắt' : 'Bật'}
                            </button>
                            <button
                              onClick={() => handleDelete(p.id, p.user?.name)}
                              disabled={actionLoading === p.id}
                              style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: actionLoading === p.id ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: '600', background: 'rgba(239,68,68,0.12)', color: '#ef4444', opacity: actionLoading === p.id ? 0.5 : 1 }}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                const p = i + 1;
                return (
                  <button key={p} onClick={() => fetchProfiles(p)} style={{
                    width: '36px', height: '36px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                    background: pagination.page === p ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    color: pagination.page === p ? '#fff' : 'var(--text-secondary)'
                  }}>{p}</button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── LOGS TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <StatCard icon="🔍" label="Tổng lượt xác thực" value={logStats.total || 0} sub="7 ngày gần nhất" color="#3b82f6" />
            <StatCard icon="✅" label="Thành công" value={logStats.success || 0} sub="trong 7 ngày" color="#22c55e" />
            <StatCard icon="❌" label="Thất bại" value={logStats.failure || 0} sub="trong 7 ngày" color="#ef4444" />
            <StatCard icon="📊" label="Độ chính xác TB" value={logStats.avgConfidence ? `${(logStats.avgConfidence).toFixed(1)}%` : '—'} sub="trung bình" color="#a855f7" />
          </div>

          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            {logLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải...</div>
            ) : logs.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                <div>Chưa có nhật ký xác thực nào</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Nhân viên</th>
                      <th>Loại</th>
                      <th>Kết quả</th>
                      <th>Độ chính xác</th>
                      <th>Lỗi</th>
                      <th>IP</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(l => (
                      <tr key={l.id}>
                        <td>
                          <div style={{ fontWeight: '600', color: '#fff', fontSize: '13px' }}>{l.user?.name || '—'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.user?.email || '—'}</div>
                        </td>
                        <td>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: l.verificationType === 'checkin' ? 'rgba(59,130,246,0.12)' : 'rgba(168,85,247,0.12)', color: l.verificationType === 'checkin' ? '#3b82f6' : '#a855f7' }}>
                            {l.verificationType === 'checkin' ? 'Check-in' : 'Check-out'}
                          </span>
                        </td>
                        <td>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: l.success ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: l.success ? '#22c55e' : '#ef4444' }}>
                            {l.success ? 'Thành công' : 'Thất bại'}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px', fontWeight: '600', color: l.success ? '#22c55e' : 'var(--text-muted)' }}>
                          {l.success ? `${l.confidence?.toFixed(1)}%` : '—'}
                        </td>
                        <td style={{ fontSize: '12px', color: '#ef4444', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.errorMessage || '—'}
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.ipAddress || '—'}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fmtDate(l.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {logPagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              {Array.from({ length: Math.min(logPagination.pages, 5) }, (_, i) => {
                const p = i + 1;
                return (
                  <button key={p} onClick={() => fetchLogs(p)} style={{
                    width: '36px', height: '36px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                    background: logPagination.page === p ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    color: logPagination.page === p ? '#fff' : 'var(--text-secondary)'
                  }}>{p}</button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
