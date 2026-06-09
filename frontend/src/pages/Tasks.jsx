import { useState, useEffect, useCallback } from 'react';
import { api, getTaskId } from '../services/api';

const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user_info') || '{}'); } catch { return {}; }
};

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_LABELS = { pending: 'Chưa thực hiện', in_progress: 'Đang thực hiện', completed: 'Hoàn thành', cancelled: 'Đã hủy' };
const PRIORITY_LABELS = { urgent: 'Khẩn cấp', high: 'Cao', medium: 'Trung bình', low: 'Thấp' };
const CATEGORIES = ['Phục vụ', 'Thu ngân', 'Vệ sinh', 'Bảo dưỡng', 'Hành chính', 'Khác'];

const getPriorityBadge = (priority, isOverdue) => {
  const cls = priority === 'urgent' ? 'badge-danger' : priority === 'high' ? 'badge-danger' : priority === 'medium' ? 'badge-warning' : 'badge-info';
  return <span className={`badge ${cls}`} style={isOverdue && priority !== 'urgent' ? { background: 'rgba(239,68,68,0.2)', color: '#ef4444' } : {}}>
    {isOverdue ? '⚠️ ' : ''}{PRIORITY_LABELS[priority] || priority}
  </span>;
};

const getStatusBadge = (status) => {
  const cls = status === 'completed' ? 'badge-success' : status === 'in_progress' ? 'badge-info' : status === 'cancelled' ? 'badge-muted' : 'badge-warning';
  return <span className={`badge ${cls}`}>{STATUS_LABELS[status] || status}</span>;
};

export default function Tasks() {
  const user = getUser();
  const isAdmin = user.isAdmin;
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0, highPriority: 0 });

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
    } catch { /* use defaults */ }
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
      : filter === 'pending' ? task.status === 'pending'
      : filter === 'in_progress' ? task.status === 'in_progress'
      : filter === 'completed' ? task.status === 'completed'
      : filter === 'overdue' ? task._isOverdue
      : filter === 'high' ? ['urgent', 'high'].includes(task.priority) && task.status !== 'completed'
      : true;
    const matchCategory = categoryFilter === 'All' || task.category === categoryFilter;
    return matchSearch && matchFilter && matchCategory;
  });

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.deadline || !newTask.assignedTo) {
      alert('Vui lòng điền tiêu đề, hạn chót và người thực hiện');
      return;
    }
    setSubmitting(true);
    try {
      const staff = staffList.find(s => s.id === newTask.assignedTo || s.name === newTask.assignedTo);
      const data = await api.post('/tasks', {
        ...newTask,
        assignedTo: typeof newTask.assignedTo === 'string' && staff ? staff.name : newTask.assignedTo,
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
        if (selectedTask && getTaskId(selectedTask) === getTaskId(editTask)) {
          setSelectedTask(data.data);
        }
        setEditTask(null);
      }
    } catch (err) { alert(err.message || 'Không thể cập nhật'); }
  };

  const handleAssignedToChange = (val) => {
    const staff = staffList.find(s => s.id === val || s.name === val);
    setNewTask(prev => ({ ...prev, assignedTo: staff?.name || val, assignedToId: staff?.id || '' }));
  };

  const handleAssignedToChangeEdit = (val) => {
    const staff = staffList.find(s => s.id === val || s.name === val);
    setEditTask(prev => prev ? { ...prev, assignedTo: staff?.name || val, assignedToId: staff?.id || '' } : prev);
  };

  const selectTask = (task) => {
    setSelectedTask(task);
    setProgressValue(task.progress || 0);
  };

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Đang tải nhiệm vụ...</div>;

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff' }}>
            Quản lý Nhiệm vụ
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {isAdmin ? 'Tạo, giao và theo dõi nhiệm vụ cho nhân viên' : 'Theo dõi và cập nhật nhiệm vụ được giao'}
          </p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            ➕ Thêm Nhiệm Vụ
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Tổng', value: stats.total, color: '#fff' },
          { label: 'Chưa thực hiện', value: stats.pending, color: 'var(--warning)' },
          { label: 'Đang thực hiện', value: stats.inProgress, color: 'var(--primary)' },
          { label: 'Hoàn thành', value: stats.completed, color: 'var(--success)' },
          { label: 'Quá hạn', value: stats.overdue, color: 'var(--danger)' },
          { label: 'Ưu tiên cao', value: stats.highPriority, color: '#fbbf24' },
        ].map(s => (
          <div className="glass-card" key={s.label} style={{ padding: '16px', textAlign: 'center', cursor: s.label === 'Tổng' ? 'default' : 'pointer' }}
            onClick={() => s.label === 'Tổng' ? setFilter('all') : setFilter(s.label === 'Quá hạn' ? 'overdue' : s.label === 'Ưu tiên cao' ? 'high' : s.label === 'Chưa thực hiện' ? 'pending' : s.label === 'Đang thực hiện' ? 'in_progress' : s.label === 'Hoàn thành' ? 'completed' : 'all')}>
            <div style={{ fontSize: '26px', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="🔍 Tìm kiếm nhiệm vụ..." className="form-input"
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          style={{ flexGrow: 1, minWidth: '180px', padding: '8px 12px', fontSize: '13px' }} />
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Lọc:</span>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'pending', label: 'Chưa thực hiện' },
          { key: 'in_progress', label: 'Đang thực hiện' },
          { key: 'completed', label: 'Hoàn thành' },
          { key: 'overdue', label: 'Quá hạn' },
          { key: 'high', label: 'Ưu tiên cao' },
        ].map(f => (
          <button key={f.key}
            className={`btn-secondary ${filter === f.key ? 'btn-primary' : ''}`}
            style={{ padding: '5px 12px', fontSize: '12px', background: filter === f.key ? 'var(--primary)' : '' }}
            onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
        <select className="form-input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '8px 12px', fontSize: '13px', background: 'var(--bg-darker)', minWidth: '140px' }}>
          <option value="All">Tất cả danh mục</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Main Layout: Table + Detail Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedTask ? '1.6fr 1fr' : '1fr', gap: '20px', alignItems: 'start', transition: 'grid-template-columns 0.3s' }}>
        {/* Task Table */}
        <div className="glass-card" style={{ padding: '0' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>NHIỆM VỤ</th>
                  <th>HẠN CHÓT</th>
                  <th>ƯU TIÊN</th>
                  <th>NGƯỜI THỰC HIỆN</th>
                  <th>TIẾN ĐỘ</th>
                  <th>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Không có nhiệm vụ nào</td></tr>
                ) : filteredTasks.map(task => (
                  <tr key={getTaskId(task)}
                    style={{
                      opacity: task.status === 'completed' ? '0.55' : '1',
                      background: selectedTask && getTaskId(selectedTask) === getTaskId(task) ? 'rgba(225,29,72,0.05)' : 'transparent',
                      cursor: 'pointer'
                    }}
                    onClick={() => selectTask(task)}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={task.status === 'completed'}
                        onChange={() => handleUpdateStatus(task, task.status === 'completed' ? 'pending' : 'completed')}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: '#fff', textDecoration: task.status === 'completed' ? 'line-through' : 'none', maxWidth: '220px' }}>
                        {task.title}
                      </div>
                      {task.customer && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>👤 {task.customer}</div>}
                    </td>
                    <td style={{ fontSize: '13px', color: task._isOverdue ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {task.deadline}
                      {task._isOverdue && <div style={{ fontSize: '10px', color: 'var(--danger)' }}>Quá hạn</div>}
                    </td>
                    <td>{getPriorityBadge(task.priority, task._isOverdue)}</td>
                    <td style={{ fontSize: '12px', color: '#fff' }}>{task.assignedTo}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '80px' }}>
                        <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${task.progress || 0}%`, height: '100%', background: task.progress === 100 ? 'var(--success)' : 'var(--primary)', borderRadius: '4px' }}></div>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', minWidth: '28px' }}>{task.progress || 0}%</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(task.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Task Detail Panel */}
        {selectedTask && (
          <div className="glass-card animate-fade-in" style={{ padding: '20px', position: 'sticky', top: '84px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>Chi tiết nhiệm vụ</h4>
              <button onClick={() => setSelectedTask(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '17px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>{selectedTask.title}</h3>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {getPriorityBadge(selectedTask.priority, selectedTask._isOverdue)}
              {getStatusBadge(selectedTask.status)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Người thực hiện</span>
                <span style={{ color: '#fff', fontWeight: '500' }}>{selectedTask.assignedTo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Danh mục</span>
                <span style={{ color: '#fff' }}>{selectedTask.category || 'Khác'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Hạn chót</span>
                <span style={{ color: selectedTask._isOverdue ? 'var(--danger)' : '#fff' }}>{selectedTask.deadline}{selectedTask._isOverdue ? ' ⚠️' : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Người giao</span>
                <span style={{ color: '#fff' }}>{selectedTask.createdByName}</span>
              </div>
              {selectedTask.customer && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Khách hàng</span>
                  <span style={{ color: '#fff' }}>{selectedTask.customer}</span>
                </div>
              )}
            </div>

            {selectedTask.description && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                {selectedTask.description}
              </div>
            )}

            {/* Progress */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <span>Tiến độ</span>
                <span>{selectedTask.progress || 0}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="range" min="0" max="100" value={progressValue}
                  onChange={e => setProgressValue(Number(e.target.value))}
                  onMouseUp={() => progressValue !== selectedTask.progress && handleUpdateProgress(selectedTask, progressValue)}
                  style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600', minWidth: '36px' }}>{progressValue}%</span>
              </div>
            </div>

            {/* Status Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Cập nhật trạng thái:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button className={`btn-secondary ${selectedTask.status === 'pending' ? 'btn-primary' : ''}`}
                  style={{ padding: '7px', fontSize: '12px', background: selectedTask.status === 'pending' ? 'var(--primary)' : '' }}
                  onClick={() => handleUpdateStatus(selectedTask, 'pending')}>Chưa thực hiện</button>
                <button className={`btn-secondary ${selectedTask.status === 'in_progress' ? 'btn-primary' : ''}`}
                  style={{ padding: '7px', fontSize: '12px', background: selectedTask.status === 'in_progress' ? 'var(--primary)' : '' }}
                  onClick={() => handleUpdateStatus(selectedTask, 'in_progress')}>Đang thực hiện</button>
                <button className={`btn-secondary ${selectedTask.status === 'completed' ? 'btn-primary' : ''}`}
                  style={{ padding: '7px', fontSize: '12px', background: selectedTask.status === 'completed' ? 'var(--success)' : '' }}
                  onClick={() => handleUpdateStatus(selectedTask, 'completed')}>Hoàn thành</button>
                {isAdmin && (
                  <button className={`btn-secondary ${selectedTask.status === 'cancelled' ? 'btn-primary' : ''}`}
                    style={{ padding: '7px', fontSize: '12px', background: selectedTask.status === 'cancelled' ? 'var(--danger)' : '', borderColor: selectedTask.status === 'cancelled' ? 'var(--danger)' : '' }}
                    onClick={() => handleUpdateStatus(selectedTask, 'cancelled')}>Hủy</button>
                )}
              </div>
            </div>

            {/* Admin Actions */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                  onClick={() => {
                    setEditTask({ ...selectedTask });
                    setSelectedTask(null);
                  }}>Sửa</button>
                <button className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  onClick={() => handleDeleteTask(selectedTask)}>Xóa</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ padding: '24px', width: '100%', maxWidth: '560px', background: '#0d111a', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>Thêm Nhiệm Vụ Mới</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Tiêu đề *</label>
                <input type="text" className="form-input" placeholder="Nhập tiêu đề nhiệm vụ..."
                  value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea className="form-input" rows="2" placeholder="Mô tả chi tiết nhiệm vụ..."
                  value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Hạn chót *</label>
                  <input type="time" className="form-input"
                    value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày hạn chót</label>
                  <input type="date" className="form-input"
                    value={newTask.deadlineDate} onChange={e => setNewTask({ ...newTask, deadlineDate: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Ưu tiên</label>
                  <select className="form-input" style={{ background: 'var(--bg-darker)' }}
                    value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Danh mục</label>
                  <select className="form-input" style={{ background: 'var(--bg-darker)' }}
                    value={newTask.category} onChange={e => setNewTask({ ...newTask, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Người thực hiện *</label>
                <select className="form-input" style={{ background: 'var(--bg-darker)' }}
                  value={newTask.assignedToId || newTask.assignedTo}
                  onChange={e => handleAssignedToChange(e.target.value)}>
                  <option value="">Chọn nhân viên...</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name} - {s.dept}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Khách hàng (tùy chọn)</label>
                <input type="text" className="form-input" placeholder="Tên khách hàng..."
                  value={newTask.customer} onChange={e => setNewTask({ ...newTask, customer: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú</label>
                <textarea className="form-input" rows="2" placeholder="Ghi chú thêm..."
                  value={newTask.notes} onChange={e => setNewTask({ ...newTask, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setShowAddModal(false)} disabled={submitting}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1, padding: '10px' }} onClick={handleAddTask} disabled={submitting}>
                {submitting ? 'Đang thêm...' : 'Thêm nhiệm vụ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ padding: '24px', width: '100%', maxWidth: '560px', background: '#0d111a', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>Sửa Nhiệm Vụ</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Tiêu đề *</label>
                <input type="text" className="form-input" value={editTask.title}
                  onChange={e => setEditTask({ ...editTask, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea className="form-input" rows="2" value={editTask.description || ''}
                  onChange={e => setEditTask({ ...editTask, description: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Hạn chót</label>
                  <input type="time" className="form-input" value={editTask.deadline}
                    onChange={e => setEditTask({ ...editTask, deadline: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày hạn chót</label>
                  <input type="date" className="form-input" value={editTask.deadlineDate ? editTask.deadlineDate.split('T')[0] : ''}
                    onChange={e => setEditTask({ ...editTask, deadlineDate: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Ưu tiên</label>
                  <select className="form-input" style={{ background: 'var(--bg-darker)' }}
                    value={editTask.priority} onChange={e => setEditTask({ ...editTask, priority: e.target.value })}>
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Khẩn cấp</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Danh mục</label>
                  <select className="form-input" style={{ background: 'var(--bg-darker)' }}
                    value={editTask.category || 'Khác'} onChange={e => setEditTask({ ...editTask, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Người thực hiện</label>
                <select className="form-input" style={{ background: 'var(--bg-darker)' }}
                  value={editTask.assignedToId || ''}
                  onChange={e => handleAssignedToChangeEdit(e.target.value)}>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name} - {s.dept}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Khách hàng</label>
                <input type="text" className="form-input" value={editTask.customer || ''}
                  onChange={e => setEditTask({ ...editTask, customer: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setEditTask(null)}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1, padding: '10px' }} onClick={handleEditTask}>Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
