import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const POSITION_LABELS = {
  receptionist: 'Lễ tân',
  waiter: 'Phục vụ',
  cashier: 'Thu ngân',
  technician: 'Kỹ thuật viên',
  shift_supervisor: 'Trưởng ca',
  none: 'Chưa phân công'
};

const ROLE_LABELS = {
  staff: 'Nhân viên',
  manager: 'Quản lý',
  admin: 'Admin'
};

export default function EmployeeManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'staff',
    position: 'none'
  });
  
  // Search, filter, sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const { isAdmin } = useAuth();

  const fetchUsers = useCallback(async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterRole) params.role = filterRole;
      if (filterPosition) params.position = filterPosition;
      if (filterStatus) params.isActive = filterStatus;
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;

      const data = await userApi.getAllUsers(params);
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterRole, filterPosition, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    setLoading(true);
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = await userApi.createEmployee(
        formData.email,
        formData.password,
        formData.name,
        formData.phone,
        formData.role,
        formData.position
      );
      if (data.success) {
        setShowCreateModal(false);
        setFormData({ email: '', password: '', name: '', phone: '', role: 'staff', position: 'none' });
        fetchUsers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to create employee');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const data = await userApi.updateUser(selectedUser._id, {
        name: formData.name,
        phone: formData.phone,
        role: formData.role,
        position: formData.position
      });
      if (data.success) {
        setShowEditModal(false);
        setSelectedUser(null);
        setFormData({ email: '', password: '', name: '', phone: '', role: 'staff', position: 'none' });
        fetchUsers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const data = await userApi.deleteUser(id);
      if (data.success) {
        fetchUsers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      const data = isActive 
        ? await userApi.deactivateUser(id)
        : await userApi.activateUser(id);
      if (data.success) {
        fetchUsers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to update user status');
    }
  };

  const handleToggleLock = async (id, isLocked) => {
    try {
      const data = isLocked 
        ? await userApi.unlockUser(id)
        : await userApi.lockUser(id, 'Locked by admin');
      if (data.success) {
        fetchUsers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to update lock status');
    }
  };

  const handleForcePasswordChange = async (id) => {
    try {
      const data = await userApi.forcePasswordChange(id);
      if (data.success) {
        alert('User will be required to change password on next login');
        fetchUsers();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to force password change');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      phone: user.phone,
      role: user.role,
      position: user.position || 'none'
    });
    setShowEditModal(true);
  };

  const openDetailDrawer = (user) => {
    setSelectedUser(user);
    setShowDetailDrawer(true);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Loading...</div>;

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: '#fff', margin: 0 }}>
          Quản Lý Nhân Viên
        </h1>
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
            style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600' }}
          >
            + Thêm Nhân Viên
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: '#ef4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Tìm kiếm</label>
            <input
              type="text"
              placeholder="Tên, email, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Vai trò</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            >
              <option value="">Tất cả</option>
              <option value="staff">Nhân viên</option>
              <option value="manager">Quản lý</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Vị trí</label>
            <select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            >
              <option value="">Tất cả</option>
              <option value="receptionist">Lễ tân</option>
              <option value="waiter">Phục vụ</option>
              <option value="cashier">Thu ngân</option>
              <option value="technician">Kỹ thuật viên</option>
              <option value="shift_supervisor">Trưởng ca</option>
              <option value="none">Chưa phân công</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Trạng thái</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            >
              <option value="">Tất cả</option>
              <option value="true">Hoạt động</option>
              <option value="false">Vô hiệu</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Sắp xếp</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            >
              <option value="createdAt-desc">Mới nhất</option>
              <option value="createdAt-asc">Cũ nhất</option>
              <option value="name-asc">Tên A-Z</option>
              <option value="name-desc">Tên Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Tên</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Email</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>SĐT</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Vai trò</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Vị trí</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Trạng thái</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Khóa</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Duyệt</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} style={{ borderBottom: '1px solid var(--border-glass)', cursor: 'pointer' }} onClick={() => openDetailDrawer(user)}>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{user.name}</td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>{user.email}</td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>{user.phone}</td>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{ROLE_LABELS[user.role] || user.role}</td>
                <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{POSITION_LABELS[user.position] || user.position}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    background: user.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: user.isActive ? '#22c55e' : '#ef4444'
                  }}>
                    {user.isActive ? 'Hoạt động' : 'Vô hiệu'}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    background: user.isLocked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    color: user.isLocked ? '#ef4444' : '#22c55e'
                  }}>
                    {user.isLocked ? 'Đã khóa' : 'Mở'}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
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
                </td>
                <td style={{ padding: '16px' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleToggleActive(user._id, user.isActive)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {user.isActive ? 'Vô hiệu' : 'Kích hoạt'}
                        </button>
                        <button
                          onClick={() => handleToggleLock(user._id, user.isLocked)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {user.isLocked ? 'Mở khóa' : 'Khóa'}
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleForcePasswordChange(user._id)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Đổi MK
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Xóa
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Không tìm thấy nhân viên nào
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '32px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#fff', marginBottom: '24px' }}>
              Thêm Nhân Viên Mới
            </h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Mật khẩu</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Tên</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Số điện thoại</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Vai trò</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                >
                  <option value="staff">Nhân viên</option>
                  <option value="manager">Quản lý</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Vị trí</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                >
                  <option value="none">Chưa phân công</option>
                  <option value="receptionist">Lễ tân</option>
                  <option value="waiter">Phục vụ</option>
                  <option value="cashier">Thu ngân</option>
                  <option value="technician">Kỹ thuật viên</option>
                  <option value="shift_supervisor">Trưởng ca</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: '600' }}
                >
                  Tạo
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ flex: 1, padding: '12px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer' }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '32px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#fff', marginBottom: '24px' }}>
              Chỉnh Sửa Nhân Viên
            </h2>
            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Tên</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Số điện thoại</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Vai trò</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                >
                  <option value="staff">Nhân viên</option>
                  <option value="manager">Quản lý</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Vị trí</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                >
                  <option value="none">Chưa phân công</option>
                  <option value="receptionist">Lễ tân</option>
                  <option value="waiter">Phục vụ</option>
                  <option value="cashier">Thu ngân</option>
                  <option value="technician">Kỹ thuật viên</option>
                  <option value="shift_supervisor">Trưởng ca</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: '600' }}
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setFormData({ email: '', password: '', name: '', phone: '', role: 'staff', position: 'none' });
                  }}
                  style={{ flex: 1, padding: '12px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer' }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {showDetailDrawer && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', zIndex: 1000 }} onClick={() => setShowDetailDrawer(false)}>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '400px', background: '#0d111a', borderLeft: '1px solid var(--border-glass)', padding: '32px', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#fff', margin: 0 }}>
                Chi Tiết Nhân Viên
              </h2>
              <button
                onClick={() => setShowDetailDrawer(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#fff'
              }}>
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: '#fff', margin: 0, marginBottom: '4px' }}>
                  {selectedUser.name}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>{selectedUser.email}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Vai trò</p>
                <p style={{ color: '#fff', fontSize: '16px', margin: 0 }}>{ROLE_LABELS[selectedUser.role] || selectedUser.role}</p>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Vị trí</p>
                <p style={{ color: '#fff', fontSize: '16px', margin: 0 }}>{POSITION_LABELS[selectedUser.position] || selectedUser.position}</p>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Số điện thoại</p>
                <p style={{ color: '#fff', fontSize: '16px', margin: 0 }}>{selectedUser.phone}</p>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Trạng thái</p>
                <p style={{ color: selectedUser.isActive ? '#22c55e' : '#ef4444', fontSize: '16px', margin: 0 }}>
                  {selectedUser.isActive ? 'Hoạt động' : 'Vô hiệu'}
                </p>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Trạng thái khóa</p>
                <p style={{ color: selectedUser.isLocked ? '#ef4444' : '#22c55e', fontSize: '16px', margin: 0 }}>
                  {selectedUser.isLocked ? 'Đã khóa' : 'Mở'}
                </p>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Trạng thái duyệt</p>
                <p style={{ 
                  color: selectedUser.approvalStatus === 'approved' ? '#22c55e' : 
                         selectedUser.approvalStatus === 'pending' ? '#eab308' : '#ef4444', 
                  fontSize: '16px', margin: 0 
                }}>
                  {selectedUser.approvalStatus === 'approved' ? 'Đã duyệt' : 
                   selectedUser.approvalStatus === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                </p>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Ngày tạo</p>
                <p style={{ color: '#fff', fontSize: '16px', margin: 0 }}>
                  {new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
              {selectedUser.lockedAt && (
                <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Ngày khóa</p>
                  <p style={{ color: '#fff', fontSize: '16px', margin: 0 }}>
                    {new Date(selectedUser.lockedAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              )}
              {selectedUser.lastPasswordChange && (
                <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Đổi mật khẩu lần cuối</p>
                  <p style={{ color: '#fff', fontSize: '16px', margin: 0 }}>
                    {new Date(selectedUser.lastPasswordChange).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
