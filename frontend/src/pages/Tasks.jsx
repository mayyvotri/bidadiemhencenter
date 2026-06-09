import { useState, useEffect, useCallback } from 'react';
import { api, getTaskId } from '../services/api';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({
    title: '',
    deadline: '',
    priority: 'medium',
    assignedTo: '',
    customer: ''
  });

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.get('/tasks');
      if (data.success) setTasks(data.data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    api.get('/staff').then(data => {
      if (data.success) setStaffList(data.data);
    }).catch(() => setStaffList([]));
  }, [fetchTasks]);

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status === 'pending';
    if (filter === 'completed') return task.status === 'completed';
    if (filter === 'high') return task.priority === 'high';
    return true;
  });

  const toggleTaskStatus = async (task) => {
    const id = getTaskId(task);
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const data = await api.patch(`/tasks/${id}/status`, { status: newStatus });
      if (data.success) {
        setTasks(tasks.map(t => getTaskId(t) === id ? data.data : t));
      }
    } catch (err) {
      alert(err.message || 'Không thể cập nhật trạng thái');
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.deadline || !newTask.assignedTo) {
      alert('Vui lòng điền tiêu đề, hạn chót và người thực hiện');
      return;
    }
    try {
      const data = await api.post('/tasks', {
        title: newTask.title,
        deadline: newTask.deadline,
        priority: newTask.priority,
        assignedTo: newTask.assignedTo,
        customer: newTask.customer || null,
        status: 'pending'
      });
      if (data.success) {
        setTasks([data.data, ...tasks]);
        setShowAddModal(false);
        setNewTask({ title: '', deadline: '', priority: 'medium', assignedTo: '', customer: '' });
      }
    } catch (err) {
      alert(err.message || 'Không thể thêm nhiệm vụ');
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return <span className="badge badge-danger">Ưu tiên cao</span>;
      case 'medium':
        return <span className="badge badge-warning">Trung bình</span>;
      default:
        return <span className="badge badge-info">Thấp</span>;
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Đang tải nhiệm vụ...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff' }}>
            Quản lý Nhiệm vụ
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Theo dõi và quản lý các nhiệm vụ được giao cho nhân viên.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          ➕ Thêm Nhiệm Vụ
        </button>
      </div>

      <div className="glass-card" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Lọc:</span>
        {['all', 'pending', 'completed', 'high'].map((f) => (
          <button
            key={f}
            className={`btn-secondary ${filter === f ? 'btn-primary' : ''}`}
            style={{ padding: '6px 14px', fontSize: '12px', background: filter === f ? 'var(--primary)' : '' }}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Đang thực hiện' : f === 'completed' ? 'Hoàn thành' : 'Ưu tiên cao'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#fff' }}>{tasks.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Tổng nhiệm vụ</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--primary)' }}>{tasks.filter(t => t.status === 'pending').length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Đang thực hiện</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--success)' }}>{tasks.filter(t => t.status === 'completed').length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Hoàn thành</div>
        </div>
        <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--danger)' }}>{tasks.filter(t => t.priority === 'high').length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Ưu tiên cao</div>
        </div>
      </div>

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
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Chưa có nhiệm vụ nào
                  </td>
                </tr>
              ) : filteredTasks.map((task) => (
                <tr key={getTaskId(task)} style={{ opacity: task.status === 'completed' ? '0.6' : '1' }}>
                  <td>
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => toggleTaskStatus(task)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: '600', color: '#fff', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                      {task.title}
                    </div>
                    {task.customer && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        👤 {task.customer}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{task.deadline}</td>
                  <td>{getPriorityBadge(task.priority)}</td>
                  <td style={{ fontSize: '13px', color: '#fff' }}>{task.assignedTo}</td>
                  <td>
                    <span className={`badge ${task.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                      {task.status === 'completed' ? 'Hoàn thành' : 'Đang thực hiện'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ padding: '24px', width: '100%', maxWidth: '500px', background: '#0d111a' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '20px' }}>
              Thêm Nhiệm Vụ Mới
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Tiêu đề nhiệm vụ</label>
                <input type="text" className="form-input" placeholder="Nhập tiêu đề..."
                  value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Hạn chót</label>
                  <input type="time" className="form-input"
                    value={newTask.deadline} onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ưu tiên</label>
                  <select className="form-input" style={{ background: 'var(--bg-darker)' }}
                    value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Người thực hiện</label>
                <select className="form-input" style={{ background: 'var(--bg-darker)' }}
                  value={newTask.assignedTo} onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}>
                  <option value="">Chọn nhân viên</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú (khách hàng nếu có)</label>
                <input type="text" className="form-input" placeholder="Thông tin khách hàng..."
                  value={newTask.customer} onChange={(e) => setNewTask({ ...newTask, customer: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setShowAddModal(false)}>Hủy</button>
              <button className="btn-primary" style={{ flex: 1, padding: '10px' }} onClick={handleAddTask}>Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
