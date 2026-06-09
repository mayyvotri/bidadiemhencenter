import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { systemApi, api } from '../services/api';

const getUser = () => { try { return JSON.parse(localStorage.getItem('user_info') || '{}'); } catch { return {}; } };

const fmt = (n) => n == null ? '0' : Number(n).toLocaleString('vi-VN');
const fmtDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';
const fmtDateOnly = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0d111a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
      {label && <div style={{ color: '#fff', fontWeight: '600', marginBottom: '6px' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#fff' }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  );
};

const SeverityBadge = ({ severity }) => {
  const colors = { INFO: '#3b82f6', LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#ef4444', CRITICAL: '#dc2626' };
  return <span style={{ color: colors[severity] || '#fff', fontSize: '11px', fontWeight: '700' }}>{severity}</span>;
};

const CategoryBadge = ({ category }) => {
  const colors = {
    AUTH: '#06b6d4', USER: '#8b5cf6', ATTENDANCE: '#3b82f6', LEAVE: '#f59e0b',
    SCHEDULE: '#10b981', PAYROLL: '#f97316', TASK: '#84cc16', INVENTORY: '#a855f7',
    SETTINGS: '#ec4899', SYSTEM: '#6b7280', REPORT: '#14b8a6', SHIFT: '#22d3ee', FACE: '#fb923c', GPS: '#a3e635'
  };
  return <span style={{ color: colors[category] || '#fff', fontSize: '11px', fontWeight: '600' }}>{category}</span>;
};

const StatCard = ({ icon, label, value, sub, color = '#fff', small }) => (
  <div className="glass-card" style={{ padding: small ? '14px' : '20px', textAlign: 'center' }}>
    <div style={{ fontSize: small ? '22px' : '28px', marginBottom: '6px' }}>{icon}</div>
    <div style={{ fontSize: small ? '18px' : '22px', fontWeight: '700', color }}>{value}</div>
    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
    {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
  </div>
);

// ─── Section: Overview Dashboard ──────────────────────────────────────────────

const OverviewSection = ({ data }) => {
  const { overview, auditStats, roleBreakdown, recentAuditLogs, recentLogins } = data || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
        <StatCard icon="👥" label="Tổng users" value={overview?.totalUsers || 0} color="#3b82f6" small />
        <StatCard icon="✅" label="Đang hoạt động" value={overview?.activeUsers || 0} color="#10b981" small />
        <StatCard icon="⏳" label="Chờ duyệt" value={overview?.pendingUsers || 0} color="#f59e0b" small />
        <StatCard icon="🕐" label="Chấm công tháng" value={overview?.attendanceThisMonth || 0} color="#06b6d4" small />
        <StatCard icon="📋" label="Task quá hạn" value={overview?.overdueTasks || 0} color="#ef4444" small />
        <StatCard icon="📅" label="Nghỉ chờ duyệt" value={overview?.pendingLeaves || 0} color="#8b5cf6" small />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        {/* Audit by category */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Audit Logs theo danh mục</h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={auditStats || []} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="count" nameKey="category">
                {(auditStats || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Role breakdown */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Phân bổ vai trò</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roleBreakdown || []} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis type="category" dataKey="role" tick={{ fontSize: 11, fill: '#9ca3af' }} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent logins */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Đăng nhập gần đây</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
            {recentLogins?.map((log, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>{log.performedByName || 'Unknown'}</div>
                  <div style={{ fontSize: '11px', color: log.action === 'LOGIN_FAILED' ? '#ef4444' : 'var(--text-muted)' }}>{log.description}</div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
                  <div>{log.status === 'FAILURE' ? '❌' : '✅'}</div>
                  <div>{fmtDateOnly(log.createdAt)}</div>
                </div>
              </div>
            ))}
            {(!recentLogins || recentLogins.length === 0) && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '40px' }}>Không có dữ liệu</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent audit + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-glass)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Audit logs gần đây</h4>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '280px' }}>
            <table className="custom-table">
              <thead><tr><th>HÀNH ĐỘNG</th><th>MÔ TẢ</th><th>NGƯỜI</th><th>THỜI GIAN</th></tr></thead>
              <tbody>
                {recentAuditLogs?.map((log, i) => (
                  <tr key={i}>
                    <td><CategoryBadge category={log.category} /></td>
                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description}</td>
                    <td style={{ fontSize: '12px', color: '#fff' }}>{log.performedByName || 'System'}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmtDateOnly(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-glass)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Hoạt động hệ thống</h4>
          </div>
          <div style={{ padding: '12px 16px', overflowY: 'auto', maxHeight: '280px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { icon: '🕐', label: 'Chấm công hôm nay', value: overview?.attendanceToday || 0 },
              { icon: '📅', label: 'Chấm công tháng này', value: overview?.attendanceThisMonth || 0 },
              { icon: '💰', label: 'Bảng lương tháng này', value: overview?.payrollThisMonth || 0 },
              { icon: '📋', label: 'Tổng task', value: overview?.totalTasks || 0 },
              { icon: '⚠️', label: 'Task quá hạn', value: overview?.overdueTasks || 0 },
              { icon: '🏖️', label: 'Nghỉ phép chờ duyệt', value: overview?.pendingLeaves || 0 }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                </div>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>{fmt(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Section: User Management ─────────────────────────────────────────────────

const UserManagementSection = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ role: '', status: '', search: '' });
  const [showResetModal, setShowResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [tempPwd, setTempPwd] = useState(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...filter };
      const res = await systemApi.getUsers(params);
      if (res.success) { setUsers(res.data.users); setPagination(res.data.pagination); }
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await systemApi.updateUserRole(userId, { role: newRole });
      if (res.success) { setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u)); }
    } catch (err) { alert(err.message); }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const res = await systemApi.toggleUserStatus(userId);
      if (res.success) { setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: !u.isActive } : u)); }
    } catch (err) { alert(err.message); }
  };

  const handleResetPassword = async () => {
    if (!showResetModal) return;
    try {
      const res = await systemApi.resetUserPassword(showResetModal, { newPassword: newPassword || undefined });
      if (res.success) {
        setTempPwd(res.data.tempPassword);
        setNewPassword('');
      }
    } catch (err) { alert(err.message); }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Bạn có chắc muốn xóa user này?')) return;
    try {
      const res = await systemApi.deleteUser(userId);
      if (res.success) { setUsers(prev => prev.filter(u => u._id !== userId)); setPagination(p => ({ ...p, total: p.total - 1 })); }
    } catch (err) { alert(err.message); }
  };

  const statusColor = (u) => {
    if (u.approvalStatus === 'pending') return '#f59e0b';
    if (!u.isActive) return '#ef4444';
    return '#10b981';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filters */}
      <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Tìm tên hoặc email..." value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} style={{ flex: 1, minWidth: '200px' }} />
        <select className="form-input" value={filter.role} onChange={e => setFilter(f => ({ ...f, role: e.target.value }))} style={{ width: '140px' }}>
          <option value="">Tất cả vai trò</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
        </select>
        <select className="form-input" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))} style={{ width: '140px' }}>
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Bị khóa</option>
          <option value="pending">Chờ duyệt</option>
        </select>
        <button className="btn-primary" onClick={() => fetchUsers()} style={{ padding: '8px 16px' }}>🔍 Tìm kiếm</button>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
          {pagination.total} users
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="custom-table">
          <thead>
            <tr><th>USER</th><th>VAI TRÒ</th><th>TRẠNG THÁI</th><th>NGÀY TẠO</th><th>THAO TÁC</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Không có user nào</td></tr>
            ) : users.map(u => (
              <tr key={u._id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                      {u.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#fff', fontSize: '13px' }}>{u.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <select value={u.role} onChange={e => handleRoleChange(u._id, e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '4px 8px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ color: statusColor(u), fontSize: '11px', fontWeight: '600' }}>
                      {u.approvalStatus === 'pending' ? '⏳ Chờ duyệt' : u.isActive ? '✅ Hoạt động' : '🔒 Bị khóa'}
                    </span>
                    {u.position && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{u.position}</span>}
                  </div>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{fmtDateOnly(u.createdAt)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}
                      onClick={() => { setShowResetModal(u._id); setTempPwd(null); setNewPassword(''); }}>
                      🔑 Mật khẩu
                    </button>
                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', color: u.isActive ? '#ef4444' : '#10b981' }}
                      onClick={() => handleToggleStatus(u._id)}>
                      {u.isActive ? '🔒 Khóa' : '🔓 Mở'}
                    </button>
                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444' }}
                      onClick={() => handleDeleteUser(u._id)}>
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'center', gap: '8px', borderTop: '1px solid var(--border-glass)' }}>
            {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
              const page = i + 1;
              return (
                <button key={page} onClick={() => fetchUsers(page)}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px',
                    background: page === pagination.page ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: '#fff' }}>
                  {page}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ padding: '24px', width: '400px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>🔑 Đặt lại mật khẩu</h3>
            {tempPwd ? (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--success)', marginBottom: '8px' }}>Mật khẩu mới (auto-generated):</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', fontFamily: 'monospace', letterSpacing: '2px' }}>{tempPwd}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Hãy copy và gửi cho nhân viên. Họ sẽ phải đổi mật khẩu khi đăng nhập.</div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Mật khẩu mới (để trống = tự động tạo)</label>
                <input className="form-input" type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nhập mật khẩu hoặc để trống..." />
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn-secondary" onClick={() => { setShowResetModal(null); setTempPwd(null); }}>Đóng</button>
              {!tempPwd && <button className="btn-primary" onClick={handleResetPassword}>Đặt lại</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Section: Audit Logs ──────────────────────────────────────────────────────

const AuditLogsSection = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState({ category: '', severity: '', search: '', dateFrom: '', dateTo: '' });
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 50, ...filter };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await systemApi.getAuditLogs(params);
      if (res.success) {
        setLogs(res.data.logs);
        setPagination(res.data.pagination);
        setCategories(res.data.categories || []);
      }
    } finally { setLoading(false); }
  }, [filter]);

  const fetchStats = useCallback(async () => {
    const res = await systemApi.getAuditStats();
    if (res.success) setStats(res.data);
  }, []);

  useEffect(() => { fetchLogs(); fetchStats(); }, [fetchLogs, fetchStats]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <StatCard icon="📋" label="Tổng logs" value={fmt(stats.total)} color="#3b82f6" small />
          <StatCard icon="📅" label="Hôm nay" value={fmt(stats.todayCount)} color="#10b981" small />
          <StatCard icon="📆" label="7 ngày" value={fmt(stats.weekCount)} color="#f59e0b" small />
          <StatCard icon="⚠️" label="Critical/High (7d)" value={fmt(stats.recentCritical?.length || 0)} color="#ef4444" small />
        </div>
      )}

      {/* Chart */}
      {stats?.byCategory?.length > 0 && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Audit logs theo danh mục (7 ngày)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.byCategory} layout="horizontal" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis type="category" dataKey="_id" tick={{ fontSize: 11, fill: '#9ca3af' }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Tìm mô tả, người thực hiện..." value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} style={{ flex: 1, minWidth: '180px' }} />
        <select className="form-input" value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))} style={{ width: '130px' }}>
          <option value="">Tất cả DM</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-input" value={filter.severity} onChange={e => setFilter(f => ({ ...f, severity: e.target.value }))} style={{ width: '120px' }}>
          <option value="">Tất cả mức</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="INFO">Info</option>
        </select>
        <input className="form-input" type="date" value={filter.dateFrom} onChange={e => setFilter(f => ({ ...f, dateFrom: e.target.value }))} style={{ width: '130px' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>→</span>
        <input className="form-input" type="date" value={filter.dateTo} onChange={e => setFilter(f => ({ ...f, dateTo: e.target.value }))} style={{ width: '130px' }} />
        <button className="btn-primary" onClick={() => fetchLogs()} style={{ padding: '8px 14px', fontSize: '12px' }}>🔍 Lọc</button>
        <button className="btn-secondary" onClick={async () => {
          const res = await systemApi.exportAuditLogs(filter);
          if (res.success) {
            const csv = ['Thời gian,Hành động,Danh mục,Mô tả,Người thực hiện,Trạng thái,Mức độ,IP'].concat(
              res.data.map(l => `"${l['Thời gian']}","${l['Hành động']}","${l['Danh mục']}","${l['Mô tả']}","${l['Người thực hiện']}","${l['Trạng thái']}","${l['Mức độ']}","${l['IP']}"`)
            ).join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
          }
        }} style={{ padding: '8px 14px', fontSize: '12px' }}>📥 CSV</button>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>{pagination.total} logs</div>
      </div>

      {/* Logs Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="custom-table">
          <thead>
            <tr><th>THỜI GIAN</th><th>HÀNH ĐỘNG</th><th>DANH MỤC</th><th>MÔ TẢ</th><th>NGƯỜI</th><th>TRẠNG THÁI</th><th>MỨC ĐỘ</th><th>IP</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Không có log nào</td></tr>
            ) : logs.map((log, i) => (
              <tr key={i} style={{ opacity: log.severity === 'CRITICAL' ? 1 : log.severity === 'HIGH' ? 0.9 : 1 }}>
                <td style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(log.createdAt)}</td>
                <td><CategoryBadge category={log.category} /></td>
                <td style={{ fontSize: '11px', color: '#fff' }}>{log.action}</td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description}</td>
                <td style={{ fontSize: '12px', color: '#fff' }}>{log.performedByName || '—'}</td>
                <td><span style={{ fontSize: '11px', color: log.status === 'FAILURE' ? '#ef4444' : log.status === 'WARNING' ? '#f59e0b' : '#10b981', fontWeight: '600' }}>{log.status}</span></td>
                <td><SeverityBadge severity={log.severity} /></td>
                <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.ipAddress || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'center', gap: '6px', borderTop: '1px solid var(--border-glass)' }}>
            {pagination.page > 1 && (
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => fetchLogs(pagination.page - 1)}>← Trước</button>
            )}
            {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
              const page = pagination.page <= 4 ? i + 1 : pagination.page + i - 3;
              if (page < 1 || page > pagination.pages) return null;
              return (
                <button key={page} onClick={() => fetchLogs(page)}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px',
                    background: page === pagination.page ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: '#fff' }}>
                  {page}
                </button>
              );
            })}
            {pagination.page < pagination.pages && (
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => fetchLogs(pagination.page + 1)}>Sau →</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Section: System Settings ─────────────────────────────────────────────────

const SystemSettingsSection = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    systemApi.getSettings().then(res => { if (res.success) setSettings(res.data); }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await systemApi.updateSettings(settings);
      if (res.success) alert('Đã lưu cài đặt!');
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>⚙️ Cài đặt hệ thống</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Business Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>🏪 Thông tin doanh nghiệp</h4>
            <div className="form-group">
              <label className="form-label">Tên doanh nghiệp</label>
              <input className="form-input" value={settings?.businessName || ''}
                onChange={e => setSettings(s => ({ ...s, businessName: e.target.value }))} />
            </div>
          </div>

          {/* GPS Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>📍 Cài đặt GPS</h4>
            <div className="form-group">
              <label className="form-label">Bán kính cho phép (m)</label>
              <input className="form-input" type="number" value={settings?.allowedRadius || 100}
                onChange={e => setSettings(s => ({ ...s, allowedRadius: Number(e.target.value) }))} />
              <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Khoảng cách tối đa từ địa điểm kinh doanh để check-in</small>
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={settings?.gpsVerificationEnabled || false}
                  onChange={e => setSettings(s => ({ ...s, gpsVerificationEnabled: e.target.checked }))} />
                Bật xác minh GPS khi chấm công
              </label>
            </div>
            <div className="form-group">
              <label className="form-label">Địa chỉ</label>
              <input className="form-input" value={settings?.location?.address || ''}
                onChange={e => setSettings(s => ({ ...s, location: { ...s.location, address: e.target.value } }))} />
            </div>
          </div>

          {/* Face Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>🧠 Nhận diện khuôn mặt</h4>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={settings?.faceVerificationEnabled || false}
                  onChange={e => setSettings(s => ({ ...s, faceVerificationEnabled: e.target.checked }))} />
                Bật nhận diện khuôn mặt khi chấm công
              </label>
              <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Yêu cầu xác minh khuôn mặt trước khi check-in/out</small>
            </div>
          </div>

          {/* Location coords */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#fff', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>🗺️ Tọa độ địa lý</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Vĩ độ (Latitude)</label>
                <input className="form-input" type="number" step="any" value={settings?.location?.latitude || 0}
                  onChange={e => setSettings(s => ({ ...s, location: { ...s.location, latitude: Number(e.target.value) } }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Kinh độ (Longitude)</label>
                <input className="form-input" type="number" step="any" value={settings?.location?.longitude || 0}
                  onChange={e => setSettings(s => ({ ...s, location: { ...s.location, longitude: Number(e.target.value) } }))} />
              </div>
            </div>
            <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Tọa độ GPS của địa điểm kinh doanh để xác minh check-in</small>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {saving ? '⏳ Đang lưu...' : '💾 Lưu cài đặt'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Section: System Configuration ───────────────────────────────────────────

const SystemConfigSection = () => {
  const [configs, setConfigs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changedConfigs, setChangedConfigs] = useState({});

  useEffect(() => {
    setLoading(true);
    systemApi.getAllConfigs().then(res => {
      if (res.success) { setConfigs(res.data.configs); setGroups(res.data.groups); }
    }).finally(() => setLoading(false));
  }, []);

  const filtered = activeGroup === 'ALL' ? configs : configs.filter(c => c.group === activeGroup);

  const handleChange = (key, value, type) => {
    let parsed = value;
    if (type === 'number') parsed = Number(value);
    if (type === 'boolean') parsed = value === 'true' || value === true;
    setChangedConfigs(prev => ({ ...prev, [key]: parsed }));
  };

  const handleSave = async () => {
    if (Object.keys(changedConfigs).length === 0) return;
    setSaving(true);
    try {
      const updates = Object.entries(changedConfigs).map(([key, value]) => ({ key, value }));
      const res = await systemApi.updateConfigsBatch(updates);
      if (res.success) {
        setConfigs(prev => prev.map(c => {
          const changed = changedConfigs[c.key];
          return changed !== undefined ? { ...c, value: changed } : c;
        }));
        setChangedConfigs({});
        alert(`Đã lưu ${updates.length} cấu hình!`);
      }
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const renderInput = (config) => {
    const value = changedConfigs[config.key] !== undefined ? changedConfigs[config.key] : config.value;
    if (config.type === 'boolean') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={value} onChange={e => handleChange(config.key, e.target.checked, 'boolean')} />
          <span style={{ fontSize: '12px', color: value ? '#10b981' : '#ef4444' }}>{value ? 'Bật' : 'Tắt'}</span>
        </label>
      );
    }
    if (config.type === 'number') {
      return (
        <input className="form-input" type="number" value={value} min={config.min} max={config.max}
          onChange={e => handleChange(config.key, e.target.value, 'number')} style={{ width: '120px' }} />
      );
    }
    if (config.options) {
      return (
        <select className="form-input" value={value} onChange={e => handleChange(config.key, e.target.value)}
          style={{ width: '180px' }}>
          {config.options.map(o => <option key={o.value} value={o.value}>{o.label || o.value}</option>)}
        </select>
      );
    }
    return (
      <input className="form-input" type="text" value={value} onChange={e => handleChange(config.key, e.target.value)}
        style={{ width: '200px' }} />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Group Tabs */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', width: 'fit-content' }}>
        <button onClick={() => setActiveGroup('ALL')}
          style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
            background: activeGroup === 'ALL' ? 'var(--primary)' : 'transparent', color: '#fff' }}>
          Tất cả
        </button>
        {groups.map(g => (
          <button key={g} onClick={() => setActiveGroup(g)}
            style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
              background: activeGroup === g ? 'var(--primary)' : 'transparent', color: '#fff' }}>
            {g}
          </button>
        ))}
      </div>

      {/* Config List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(config => (
            <div key={config.key} className="glass-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{config.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  <code style={{ color: '#8b5cf6' }}>{config.key}</code>
                  {config.description && ` — ${config.description}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {renderInput(config)}
                {changedConfigs[config.key] !== undefined && (
                  <span style={{ fontSize: '11px', color: '#f59e0b' }}>⚡ changed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save */}
      {Object.keys(changedConfigs).length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {saving ? '⏳ Đang lưu...' : `💾 Lưu ${Object.keys(changedConfigs).length} thay đổi`}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main SystemAdmin Page ───────────────────────────────────────────────────

export default function SystemAdmin() {
  const user = getUser();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.isAdmin) { navigate('/dashboard'); return; }
    systemApi.getDashboard().then(res => { if (res.success) setDashboardData(res.data); }).finally(() => setLoading(false));
  }, [user.isAdmin, navigate]);

  if (!user.isAdmin) return null;

  const tabs = [
    { key: 'overview', label: '📊 Tổng quan', component: <OverviewSection data={dashboardData} /> },
    { key: 'users', label: '👥 Quản lý Users', component: <UserManagementSection /> },
    { key: 'audit', label: '🕘 Audit Logs', component: <AuditLogsSection /> },
    { key: 'settings', label: '⚙️ Cài đặt hệ thống', component: <SystemSettingsSection /> },
    { key: 'config', label: '🔧 Cấu hình', component: <SystemConfigSection /> }
  ];

  const activeTabData = tabs.find(t => t.key === activeTab);

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff' }}>
          🖥️ Quản trị hệ thống
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Quản lý người dùng, vai trò, cấu hình hệ thống, audit logs và theo dõi hoạt động
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600',
              background: activeTab === t.key ? 'var(--primary)' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--text-secondary)'
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
          Đang tải dữ liệu hệ thống...
        </div>
      ) : activeTabData?.component}
    </div>
  );
}
