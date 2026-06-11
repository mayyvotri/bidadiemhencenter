import { useState, useEffect, useCallback } from 'react';
import { api, getTaskId } from '../services/api';

const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user_info') || '{}'); } catch { return {}; }
};

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_CONFIG = {
  pending:    { label: 'Chưa thực hiện', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  in_progress:{ label: 'Đang thực hiện', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)' },
  completed:  { label: 'Hoàn thành',     color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  cancelled:  { label: 'Đã hủy',         color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)' },
};
const PRIORITY_CONFIG = {
  urgent: { label: 'Khẩn cấp', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  high:   { label: 'Cao',       color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  medium: { label: 'Trung bình',color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  low:    { label: 'Thấp',      color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};
const CATEGORIES = ['Phục vụ', 'Thu ngân', 'Vệ sinh', 'Bảo dưỡng', 'Hành chính', 'Khác'];

const Badge = ({ children, config, style = {} }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
    color: config.color, background: config.bg,
    border: `1px solid ${config.border || config.color + '40'}`,
    whiteSpace: 'nowrap', ...style
  }}>
    {children}
  </span>
);

export default function Tasks() {
  const user = getUser();
  const isAdmin = user.isAdmin;
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0, highPriority: 0 });
  const [viewMode, setViewMode] = useState('board'); // 'board' | 'table'

  const [newTask, setNewTask] = useState({
    title: '', description: '', category: 'Khác', deadline: '', deadlineDate: '',
    priority: 'medium', assignedTo: '', assignedToId: '', customer: '', notes: ''
  });
  const [editTask, setEditTask] = useState(null);
  const [progressValue, setProgressValue] = useState(0);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.get('/tasks');
      if (data.success) {
        const sorted = [...data.data].sort((a, b) => {
          const po = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
          if (po !== 0) return po;
          return (a.deadlineDate || '') < (b.deadlineDate || '') ? -1 : 1;
        });
        setTasks(sorted);
      }
    } catch { setTasks([]); } finally { setLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get('/tasks/stats');
      if (data.success) setStats(data.stats);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchStats();
    api.get('/staff').then(d => d.success && setStaffList(d.data)).catch(() => {});
  }, [fetchTasks, fetchStats]);

  const filteredTasks = tasks.filter(task => {
    const term = searchTerm.toLowerCase();
    const matchSearch = !term ||
      task.title.toLowerCase().includes(term) ||
      (task.assignedTo || '').toLowerCase().includes(term) ||
      (task.customer || '').toLowerCase().includes(term) ||
      (task.description || '').toLowerCase().includes(term);
    const matchFilter = filter === 'all' ? true
      : filter === 'pending'     ? task.status === 'pending'
      : filter === 'in_progress' ? task.status === 'in_progress'
      : filter === 'completed'   ? task.status === 'completed'
      : filter === 'overdue'     ? task._isOverdue
      : filter === 'high'       ? ['urgent', 'high'].includes(task.priority) && task.status !== 'completed'
      : true;
    const matchCategory = categoryFilter === 'Tất cả' || task.category === categoryFilter;
    return matchSearch && matchFilter && matchCategory;
  });

  const handleAddTask = async () => {
    if (!newTask.title) {
      alert('Vui lòng nhập tiêu đề nhiệm vụ');
      return;
    }
    setSubmitting(true);
    try {
      const staff = staffList.find(s => s.id === newTask.assignedToId || s.name === newTask.assignedTo);
      const data = await api.post('/tasks', {
        ...newTask,
        assignedTo: staff?.name || newTask.assignedTo || 'Chưa giao',
        assignedToId: staff?.id || null,
        deadlineDate: newTask.deadlineDate ? new Date(newTask.deadlineDate).toISOString() : null
      });
      if (data.success) {
        setTasks([data.data, ...tasks]);
        fetchStats();
        setShowAddModal(false);
        setNewTask({ title: '', description: '', category: 'Khác', deadline: '', deadlineDate: '', priority: 'medium', assignedTo: '', assignedToId: '', customer: '', notes: '' });
      }
    } catch (err) { alert(err.message || 'Không thể thêm nhiệm vụ'); }
    finally { setSubmitting(false); }
  };

  const handleUpdateStatus = async (task, newStatus) => {
    try {
      const data = await api.patch(`/tasks/${getTaskId(task)}/status`, { status: newStatus });
      if (data.success) {
        setTasks(tasks.map(t => getTaskId(t) === getTaskId(task) ? data.data : t));
        fetchStats();
        if (selectedTask && getTaskId(selectedTask) === getTaskId(task)) setSelectedTask(data.data);
      }
    } catch (err) { alert(err.message || 'Không thể cập nhật'); }
  };

  const handleUpdateProgress = async (task, progress) => {
    try {
      const data = await api.patch(`/tasks/${getTaskId(task)}/progress`, { progress });
      if (data.success) {
        setTasks(tasks.map(t => getTaskId(t) === getTaskId(task) ? data.data : t));
        fetchStats();
        if (selectedTask && getTaskId(selectedTask) === getTaskId(task)) {
          setSelectedTask(data.data);
          setProgressValue(data.data.progress);
        }
      }
    } catch (err) { alert(err.message || 'Không thể cập nhật'); }
  };

  const handleDeleteTask = async (task) => {
    if (!confirm('Xóa nhiệm vụ này?')) return;
    try {
      const data = await api.delete(`/tasks/${getTaskId(task)}`);
      if (data.success) {
        setTasks(tasks.filter(t => getTaskId(t) !== getTaskId(task)));
        fetchStats();
        if (selectedTask && getTaskId(selectedTask) === getTaskId(task)) setSelectedTask(null);
      }
    } catch (err) { alert(err.message || 'Không thể xóa'); }
  };

  const handleEditTask = async () => {
    if (!editTask || !editTask.title) return;
    try {
      const data = await api.put(`/tasks/${getTaskId(editTask)}`, {
        ...editTask,
        deadlineDate: editTask.deadlineDate ? new Date(editTask.deadlineDate).toISOString() : null
      });
      if (data.success) {
        setTasks(tasks.map(t => getTaskId(t) === getTaskId(editTask) ? data.data : t));
        fetchStats();
        if (selectedTask && getTaskId(selectedTask) === getTaskId(editTask)) setSelectedTask(data.data);
        setEditTask(null);
      }
    } catch (err) { alert(err.message || 'Không thể cập nhật'); }
  };

  const handleAssignedToChange = (val) => {
    const staff = staffList.find(s => s.id === val);
    setNewTask(prev => ({ ...prev, assignedToId: val, assignedTo: staff?.name || val }));
  };

  const handleAssignedToChangeEdit = (val) => {
    const staff = staffList.find(s => s.id === val);
    setEditTask(prev => prev ? { ...prev, assignedToId: val, assignedTo: staff?.name || val } : prev);
  };

  const selectTask = (task) => {
    setSelectedTask(task);
    setProgressValue(task.progress || 0);
  };

  // Board view columns
  const boardColumns = ['pending', 'in_progress', 'completed', 'cancelled'];

  const progressColor = (task) => {
    if (task.progress === 100) return '#10b981';
    if (task.progress >= 60) return '#60a5fa';
    if (task.progress >= 30) return '#eab308';
    return '#ef4444';
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        <div>Đang tải nhiệm vụ...</div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff', margin: 0 }}>
            📋 Nhiệm vụ
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {isAdmin ? 'Tạo, giao và theo dõi nhiệm vụ cho nhân viên' : 'Theo dõi và cập nhật nhiệm vụ được giao'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-glass)' }}>
            {[['board', '🔲'], ['table', '☰']].map(([v, icon]) => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px',
                  background: viewMode === v ? 'var(--primary)' : 'transparent',
                  color: viewMode === v ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}>
                {icon} {v === 'board' ? 'Bảng' : 'Danh sách'}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button className="btn-primary" onClick={() => setShowAddModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '14px' }}>
              <span style={{ fontSize: '16px' }}>➕</span> Thêm nhiệm vụ
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { key: 'all',       label: 'Tổng',            value: stats.total,       color: '#ffffff', icon: '📋' },
          { key: 'pending',   label: 'Chưa thực hiện', value: stats.pending,     color: '#f59e0b', icon: '⏳' },
          { key: 'in_progress',label: 'Đang thực hiện', value: stats.inProgress,  color: '#60a5fa', icon: '⚙️' },
          { key: 'completed', label: 'Hoàn thành',      value: stats.completed,   color: '#10b981', icon: '✅' },
          { key: 'overdue',   label: 'Quá hạn',          value: stats.overdue,     color: '#ef4444', icon: '⚠️' },
          { key: 'high',      label: 'Ưu tiên cao',      value: stats.highPriority,color: '#f97316', icon: '🔥' },
        ].map(s => (
          <div key={s.key} className="glass-card"
            style={{ padding: '14px 12px', cursor: 'pointer', border: filter === s.key ? `1px solid ${s.color}60` : '1px solid var(--border-glass)', background: filter === s.key ? `${s.color}12` : '' }}
            onClick={() => setFilter(s.key)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>{s.icon}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="glass-card" style={{ padding: '14px 16px', marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
          <input type="text" placeholder="Tìm kiếm nhiệm vụ, nhân viên, khách hàng..." className="form-input"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '32px', padding: '8px 12px 8px 32px', fontSize: '13px', width: '100%' }} />
        </div>
        <select className="form-input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '8px 12px', fontSize: '13px', background: 'var(--bg-darker)', minWidth: '150px' }}>
          <option value="Tất cả">🏷️ Tất cả danh mục</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Hiển thị {filteredTasks.length} / {tasks.length} nhiệm vụ
        </div>
      </div>

      {/* BOARD VIEW */}
      {viewMode === 'board' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', alignItems: 'start' }}>
          {boardColumns.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col);
            const cfg = STATUS_CONFIG[col];
            return (
              <div key={col}>
                {/* Column Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: '10px 10px 0 0',
                  background: cfg.bg, borderBottom: `2px solid ${cfg.color}`,
                  marginBottom: '0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', color: cfg.color }}>⬤</span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
                    background: cfg.color + '25', color: cfg.color
                  }}>{colTasks.length}</span>
                </div>

                {/* Column Body */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)', borderRadius: '0 0 10px 10px',
                  padding: '10px', minHeight: '400px', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto',
                  border: '1px solid rgba(255,255,255,0.05)', borderTop: 'none'
                }}>
                  {colTasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      Không có nhiệm vụ
                    </div>
                  ) : colTasks.map(task => {
                    const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;
                    return (
                      <div key={getTaskId(task)} onClick={() => selectTask(task)}
                        style={{
                          background: selectedTask && getTaskId(selectedTask) === getTaskId(task)
                            ? 'rgba(225,29,72,0.08)' : 'rgba(0,0,0,0.3)',
                          border: `1px solid ${selectedTask && getTaskId(selectedTask) === getTaskId(task) ? 'rgba(225,29,72,0.4)' : 'rgba(255,255,255,0.07)'}`,
                          borderRadius: '10px', padding: '12px', marginBottom: '8px', cursor: 'pointer',
                          transition: 'all 0.2s', opacity: task.status === 'completed' ? '0.6' : '1'
                        }}>
                        {/* Priority + Category */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                            color: pCfg.color, background: pCfg.bg
                          }}>{pCfg.label}</span>
                          {task.category && task.category !== 'Khác' && (
                            <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', background: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)' }}>
                              {task.category}
                            </span>
                          )}
                          {task._isOverdue && (
                            <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                              ⚠️ Quá hạn
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '6px', lineHeight: '1.4',
                          textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                          {task.title}
                        </div>

                        {/* Customer */}
                        {task.customer && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            👤 {task.customer}
                          </div>
                        )}

                        {/* Progress bar */}
                        {(task.progress > 0 || task.status === 'in_progress') && (
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                              <span>Tiến độ</span>
                              <span style={{ color: progressColor(task), fontWeight: '600' }}>{task.progress || 0}%</span>
                            </div>
                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${task.progress || 0}%`, height: '100%',
                                background: progressColor(task), borderRadius: '4px',
                                transition: 'width 0.3s'
                              }} />
                            </div>
                          </div>
                        )}

                        {/* Footer: assignee + deadline */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                            👤 {task.assignedTo || '—'}
                          </span>
                          {task.deadline && (
                            <span style={{ color: task._isOverdue ? '#ef4444' : 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '10px' }}>
                              🕐 {task.deadline}
                            </span>
                          )}
                        </div>

                        {/* Quick actions on hover */}
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                            onClick={e => e.stopPropagation()}>
                            {col !== 'completed' && col !== 'cancelled' && (
                              <button onClick={() => handleUpdateStatus(task, col === 'pending' ? 'in_progress' : 'completed')}
                                style={{ flex: 1, padding: '4px', fontSize: '10px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', color: '#10b981', cursor: 'pointer' }}>
                                {col === 'pending' ? '▶ Bắt đầu' : '✓ Hoàn thành'}
                              </button>
                            )}
                            <button onClick={() => { setEditTask({ ...task }); }}
                              style={{ flex: 1, padding: '4px', fontSize: '10px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '4px', color: '#60a5fa', cursor: 'pointer' }}>
                              ✏️ Sửa
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '36px' }}></th>
                  <th>NHIỆM VỤ</th>
                  <th>DANH MỤC</th>
                  <th>HẠN CHÓT</th>
                  <th>ƯU TIÊN</th>
                  <th>NGƯỜI THỰC HIỆN</th>
                  <th>TIẾN ĐỘ</th>
                  <th>TRẠNG THÁI</th>
                  {isAdmin && <th style={{ width: '80px' }}></th>}
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                    Không có nhiệm vụ nào
                  </td></tr>
                ) : filteredTasks.map(task => {
                  const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;
                  const sCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={getTaskId(task)}
                      style={{
                        opacity: task.status === 'completed' || task.status === 'cancelled' ? '0.55' : '1',
                        background: selectedTask && getTaskId(selectedTask) === getTaskId(task) ? 'rgba(225,29,72,0.06)' : 'transparent',
                        cursor: 'pointer'
                      }}
                      onClick={() => selectTask(task)}>
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={task.status === 'completed'}
                          onChange={() => handleUpdateStatus(task, task.status === 'completed' ? 'pending' : 'completed')}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#10b981' }} />
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: '#fff', textDecoration: task.status === 'completed' ? 'line-through' : 'none', maxWidth: '260px' }}>
                          {task.title}
                        </div>
                        {task.customer && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>👤 {task.customer}</div>}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{task.category || '—'}</td>
                      <td style={{ fontSize: '12px', color: task._isOverdue ? '#ef4444' : 'var(--text-secondary)' }}>
                        {task.deadline || '—'}
                        {task._isOverdue && <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '600' }}>⚠️ Quá hạn</div>}
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                          color: pCfg.color, background: pCfg.bg, border: `1px solid ${pCfg.color}40`
                        }}>
                          {pCfg.label}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#fff' }}>{task.assignedTo || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '80px' }}>
                          <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${task.progress || 0}%`, height: '100%', background: progressColor(task), borderRadius: '4px' }}></div>
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', minWidth: '28px' }}>{task.progress || 0}%</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                          color: sCfg.color, background: sCfg.bg, border: `1px solid ${sCfg.border}`
                        }}>
                          {sCfg.label}
                        </span>
                      </td>
                      {isAdmin && (
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button onClick={() => { setEditTask({ ...task }); setSelectedTask(null); }}
                              style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '4px', color: '#60a5fa', cursor: 'pointer', padding: '3px 6px', fontSize: '11px' }}>
                              ✏️
                            </button>
                            <button onClick={() => handleDeleteTask(task)}
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', padding: '3px 6px', fontSize: '11px' }}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedTask && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '380px', zIndex: 200,
          background: '#0d111a', borderLeft: '1px solid var(--border-glass)',
          padding: '24px', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.4)'
        }} className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Chi tiết nhiệm vụ</h4>
            <button onClick={() => setSelectedTask(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>

          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '14px', lineHeight: '1.4' }}>
            {selectedTask.title}
          </h3>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <Badge config={PRIORITY_CONFIG[selectedTask.priority] || PRIORITY_CONFIG.low}>{PRIORITY_CONFIG[selectedTask.priority]?.label}</Badge>
            <Badge config={STATUS_CONFIG[selectedTask.status] || STATUS_CONFIG.pending}>{STATUS_CONFIG[selectedTask.status]?.label}</Badge>
            {selectedTask.category && selectedTask.category !== 'Khác' && (
              <Badge config={{ color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)' }}>{selectedTask.category}</Badge>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {[
              ['Người thực hiện', selectedTask.assignedTo || '—'],
              ['Người giao', selectedTask.createdByName || '—'],
              ['Hạn chót', selectedTask.deadline ? `${selectedTask.deadline}${selectedTask.deadlineDate ? ' — ' + new Date(selectedTask.deadlineDate).toLocaleDateString('vi-VN') : ''}` : (selectedTask.deadlineDate ? new Date(selectedTask.deadlineDate).toLocaleDateString('vi-VN') : '—')],
              ['Khách hàng', selectedTask.customer || '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: '12px', color: '#fff', fontWeight: '500', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
              </div>
            ))}
          </div>

          {selectedTask.description && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Mô tả</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', lineHeight: '1.6' }}>
                {selectedTask.description}
              </div>
            </div>
          )}

          {selectedTask.notes && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Ghi chú</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', lineHeight: '1.6' }}>
                {selectedTask.notes}
              </div>
            </div>
          )}

          {/* Progress */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tiến độ</span>
              <span style={{ color: progressColor(selectedTask), fontWeight: '700' }}>{selectedTask.progress || 0}%</span>
            </div>
            <input type="range" min="0" max="100" value={progressValue}
              onChange={e => setProgressValue(Number(e.target.value))}
              onMouseUp={() => progressValue !== selectedTask.progress && handleUpdateProgress(selectedTask, progressValue)}
              style={{ width: '100%', accentColor: progressColor(selectedTask), cursor: 'pointer', height: '6px' }} />
          </div>

          {/* Status Actions */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Cập nhật trạng thái</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { key: 'pending', label: '⏳ Chưa thực hiện', cfg: STATUS_CONFIG.pending },
                { key: 'in_progress', label: '⚙️ Đang thực hiện', cfg: STATUS_CONFIG.in_progress },
                { key: 'completed', label: '✅ Hoàn thành', cfg: STATUS_CONFIG.completed },
                { key: 'cancelled', label: '🚫 Hủy', cfg: STATUS_CONFIG.cancelled },
              ].map(btn => (
                <button key={btn.key}
                  onClick={() => handleUpdateStatus(selectedTask, btn.key)}
                  style={{
                    padding: '8px 8px', fontSize: '11px', borderRadius: '8px', cursor: 'pointer',
                    fontWeight: '600', border: `1px solid ${selectedTask.status === btn.key ? btn.cfg.color + '60' : 'rgba(255,255,255,0.08)'}`,
                    background: selectedTask.status === btn.key ? btn.cfg.bg : 'rgba(255,255,255,0.03)',
                    color: selectedTask.status === btn.key ? btn.cfg.color : 'var(--text-secondary)',
                    transition: 'all 0.2s', textAlign: 'center'
                  }}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Admin Actions */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '10px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                onClick={() => { setEditTask({ ...selectedTask }); setSelectedTask(null); }}>
                ✏️ Sửa nhiệm vụ
              </button>
              <button style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                onClick={() => handleDeleteTask(selectedTask)}>
                🗑️
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: '700', color: '#fff', margin: 0 }}>Thêm nhiệm vụ mới</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Tiêu đề nhiệm vụ *</label>
                <input type="text" className="form-input" placeholder="Nhập tiêu đề nhiệm vụ..." style={{ padding: '10px 14px', fontSize: '14px' }}
                  value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả chi tiết</label>
                <textarea className="form-input" rows="3" placeholder="Mô tả nhiệm vụ cần thực hiện..." style={{ padding: '10px 14px', fontSize: '13px', resize: 'vertical' }}
                  value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Giờ hạn chót</label>
                  <input type="time" className="form-input" style={{ padding: '10px 14px', fontSize: '13px' }}
                    value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày hạn chót</label>
                  <input type="date" className="form-input" style={{ padding: '10px 14px', fontSize: '13px' }}
                    value={newTask.deadlineDate} onChange={e => setNewTask({ ...newTask, deadlineDate: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Mức ưu tiên</label>
                  <select className="form-input" style={{ padding: '10px 14px', fontSize: '13px', background: 'var(--bg-darker)' }}
                    value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                    <option value="low">⬜ Thấp</option>
                    <option value="medium">🟡 Trung bình</option>
                    <option value="high">🟠 Cao</option>
                    <option value="urgent">🔴 Khẩn cấp</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Danh mục</label>
                  <select className="form-input" style={{ padding: '10px 14px', fontSize: '13px', background: 'var(--bg-darker)' }}
                    value={newTask.category} onChange={e => setNewTask({ ...newTask, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Người thực hiện</label>
                <select className="form-input" style={{ padding: '10px 14px', fontSize: '13px', background: 'var(--bg-darker)' }}
                  value={newTask.assignedToId || ''}
                  onChange={e => handleAssignedToChange(e.target.value)}>
                  <option value="">— Chưa giao —</option>
                  {staffList.filter(s => s.role === 'staff').map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.dept ? `· ${s.dept}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Khách hàng (tùy chọn)</label>
                <input type="text" className="form-input" placeholder="Tên khách hàng liên quan..." style={{ padding: '10px 14px', fontSize: '13px' }}
                  value={newTask.customer} onChange={e => setNewTask({ ...newTask, customer: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú</label>
                <textarea className="form-input" rows="2" placeholder="Ghi chú bổ sung..." style={{ padding: '10px 14px', fontSize: '13px', resize: 'vertical' }}
                  value={newTask.notes} onChange={e => setNewTask({ ...newTask, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '12px', fontSize: '14px' }} onClick={() => setShowAddModal(false)}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '14px' }} onClick={handleAddTask} disabled={submitting}>
                {submitting ? '⏳ Đang thêm...' : '✅ Thêm nhiệm vụ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: '700', color: '#fff', margin: 0 }}>Sửa nhiệm vụ</h2>
              <button onClick={() => setEditTask(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Tiêu đề nhiệm vụ *</label>
                <input type="text" className="form-input" style={{ padding: '10px 14px', fontSize: '14px' }}
                  value={editTask.title} onChange={e => setEditTask({ ...editTask, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả chi tiết</label>
                <textarea className="form-input" rows="3" style={{ padding: '10px 14px', fontSize: '13px', resize: 'vertical' }}
                  value={editTask.description || ''} onChange={e => setEditTask({ ...editTask, description: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Giờ hạn chót</label>
                  <input type="time" className="form-input" style={{ padding: '10px 14px', fontSize: '13px' }}
                    value={editTask.deadline || ''} onChange={e => setEditTask({ ...editTask, deadline: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày hạn chót</label>
                  <input type="date" className="form-input" style={{ padding: '10px 14px', fontSize: '13px' }}
                    value={editTask.deadlineDate ? String(editTask.deadlineDate).split('T')[0] : ''}
                    onChange={e => setEditTask({ ...editTask, deadlineDate: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Mức ưu tiên</label>
                  <select className="form-input" style={{ padding: '10px 14px', fontSize: '13px', background: 'var(--bg-darker)' }}
                    value={editTask.priority} onChange={e => setEditTask({ ...editTask, priority: e.target.value })}>
                    <option value="low">⬜ Thấp</option>
                    <option value="medium">🟡 Trung bình</option>
                    <option value="high">🟠 Cao</option>
                    <option value="urgent">🔴 Khẩn cấp</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Danh mục</label>
                  <select className="form-input" style={{ padding: '10px 14px', fontSize: '13px', background: 'var(--bg-darker)' }}
                    value={editTask.category || 'Khác'} onChange={e => setEditTask({ ...editTask, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Người thực hiện</label>
                <select className="form-input" style={{ padding: '10px 14px', fontSize: '13px', background: 'var(--bg-darker)' }}
                  value={editTask.assignedToId || ''}
                  onChange={e => handleAssignedToChangeEdit(e.target.value)}>
                  <option value="">— Chưa giao —</option>
                  {staffList.filter(s => s.role === 'staff').map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.dept ? `· ${s.dept}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Khách hàng</label>
                <input type="text" className="form-input" style={{ padding: '10px 14px', fontSize: '13px' }}
                  value={editTask.customer || ''} onChange={e => setEditTask({ ...editTask, customer: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '12px', fontSize: '14px' }} onClick={() => setEditTask(null)}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '14px' }} onClick={handleEditTask}>
                💾 Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
