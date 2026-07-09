import { useState, useEffect, useCallback } from 'react';
import { systemApi } from '../services/api';
import { useMediaQuery } from '../hooks/useMediaQuery';

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

export default function StaffList() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [activeTab, setActiveTab] = useState('staff');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', phone: '', role: 'staff', position: 'none'
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterRole) params.role = filterRole;
      if (filterPosition) params.position = filterPosition;
      if (filterStatus) params.status = filterStatus;
      if (activeTab === 'pending') params.approvalStatus = 'pending';
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;

      const res = await systemApi.getUsers(params);
      if (res.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error('[StaffList] fetchUsers error:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterRole, filterPosition, filterStatus, sortBy, sortOrder, activeTab]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleApprove = async (userId) => {
    try {
      await systemApi.approveUser(userId);
      fetchUsers();
    } catch {
      // no-op: backend đã xử lý; UI sẽ tự refresh theo danh sách mới
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Bạn có chắc muốn từ chối tài khoản này?')) return;
    try {
      await systemApi.rejectUser(userId);
      fetchUsers();
    } catch {
      // no-op: backend đã xử lý; UI sẽ tự refresh theo danh sách mới
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = await systemApi.updateUserRole('new', {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        role: formData.role,
        position: formData.position
      });
      if (data.success) {
        setShowCreateModal(false);
        setFormData({ email: '', password: '', name: '', phone: '', role: 'staff', position: 'none' });
        fetchUsers();
      } else {
        alert(data.message || 'Không thể tạo nhân viên');
      }
    } catch (err) {
      alert(err.message || 'Không thể tạo nhân viên');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const data = await systemApi.updateUserRole(selectedUser._id, {
        name: formData.name,
        phone: formData.phone,
        role: formData.role,
        position: formData.position
      });
      if (data.success) {
        setShowDetailDrawer(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        alert(data.message || 'Không thể cập nhật');
      }
    } catch (err) {
      alert(err.message || 'Không thể cập nhật');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Bạn có chắc muốn xóa user này?')) return;
    try {
      const res = await systemApi.deleteUser(userId);
      if (res.success) {
        setUsers(prev => prev.filter(u => u._id !== userId));
        setSelectedUser(null);
        setShowDetailDrawer(false);
      } else {
        alert(res.message || 'Không thể xóa');
      }
    } catch (err) {
      alert(err.message || 'Không thể xóa');
    }
  };

  const openDetailDrawer = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      phone: user.phone,
      role: user.role,
      position: user.position || 'none'
    });
    setShowDetailDrawer(true);
  };

  const displayUsers = activeTab === 'pending'
    ? users.filter(u => u.approvalStatus === 'pending')
    : users;

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left', position: 'relative' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Quản lý Nhân sự
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Quản lý nhân viên, duyệt tài khoản và theo dõi trạng thái.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('staff')}
          style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: '600',
            background: activeTab === 'staff' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'staff' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
        >
          Danh sách NV
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: '600',
            background: activeTab === 'pending' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'pending' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
        >
          Chờ duyệt ({users.filter(u => u.approvalStatus === 'pending').length})
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Tìm tên, email, SĐT..."
          className="form-input"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '8px 12px', fontSize: '13px' }}
        />
        <select className="form-input" value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ width: '140px' }}>
          <option value="">Tất cả vai trò</option>
          <option value="staff">Nhân viên</option>
          <option value="manager">Quản lý</option>
          <option value="admin">Admin</option>
        </select>
        <select className="form-input" value={filterPosition} onChange={e => setFilterPosition(e.target.value)} style={{ width: '160px' }}>
          <option value="">Tất cả vị trí</option>
          <option value="receptionist">Lễ tân</option>
          <option value="waiter">Phục vụ</option>
          <option value="cashier">Thu ngân</option>
          <option value="technician">Kỹ thuật viên</option>
          <option value="shift_supervisor">Trưởng ca</option>
          <option value="none">Chưa phân công</option>
        </select>
        {activeTab === 'staff' && (
          <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '140px' }}>
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Vô hiệu</option>
            <option value="pending">Chờ duyệt</option>
          </select>
        )}
        <select className="form-input" value={`${sortBy}-${sortOrder}`} onChange={e => {
          const [field, order] = e.target.value.split('-');
          setSortBy(field);
          setSortOrder(order);
        }} style={{ width: '160px' }}>
          <option value="createdAt-desc">Mới nhất</option>
          <option value="createdAt-asc">Cũ nhất</option>
          <option value="name-asc">Tên A-Z</option>
          <option value="name-desc">Tên Z-A</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>NGƯỜI DÙNG</th>
              <th>EMAIL</th>
              <th>SĐT</th>
              <th>VAI TRÒ</th>
              <th>VỊ TRÍ</th>
              <th>TRẠNG THÁI</th>
              <th>DUYỆT</th>
              <th>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
            ) : displayUsers.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                {activeTab === 'pending' ? 'Không có tài khoản nào chờ duyệt' : 'Không tìm thấy nhân viên'}
              </td></tr>
            ) : displayUsers.map(user => (
              <tr key={user._id} style={{ cursor: 'pointer' }} onClick={() => openDetailDrawer(user)}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.05)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)'
                    }}>
                      {user.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>{user.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user._id?.slice(-6)}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user.email}</td>
                <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user.phone || '—'}</td>
                <td>
                  <span style={{
                    padding: '4px 10px', borderRadius: '12px', fontSize: '12px',
                    background: user.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' :
                      user.role === 'manager' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)',
                    color: user.role === 'admin' ? 'var(--danger)' :
                      user.role === 'manager' ? 'var(--info)' : 'var(--text-primary)'
                  }}>
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                </td>
                <td style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{POSITION_LABELS[user.position] || user.position || '—'}</td>
                <td>
                  <span style={{
                    padding: '4px 10px', borderRadius: '12px', fontSize: '12px',
                    background: user.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: user.isActive ? 'var(--success-text)' : 'var(--danger)'
                  }}>
                    {user.isActive ? 'Hoạt động' : 'Vô hiệu'}
                  </span>
                </td>
                <td>
                  <span style={{
                    padding: '4px 10px', borderRadius: '12px', fontSize: '12px',
                    background: user.approvalStatus === 'approved' ? 'rgba(34, 197, 94, 0.1)' :
                      user.approvalStatus === 'pending' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: user.approvalStatus === 'approved' ? 'var(--success-text)' :
                      user.approvalStatus === 'pending' ? '#eab308' : 'var(--danger)'
                  }}>
                    {user.approvalStatus === 'approved' ? 'Đã duyệt' :
                      user.approvalStatus === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                  </span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {user.approvalStatus === 'approved' ? (
                      <span style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-text)' }}>
                        Đã duyệt
                      </span>
                    ) : user.approvalStatus === 'rejected' ? (
                      <span style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                        Đã từ chối
                      </span>
                    ) : (
                      <>
                        <button className="btn-primary" style={{ padding: '5px 10px', fontSize: '11px' }}
                          onClick={() => handleApprove(user._id)}>
                          Duyệt
                        </button>
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '11px', color: 'var(--danger)' }}
                          onClick={() => handleReject(user._id)}>
                          Từ chối
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {showDetailDrawer && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
          onClick={() => { setShowDetailDrawer(false); setSelectedUser(null); }}>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '400px', background: '#0d111a',
            borderLeft: '1px solid var(--border-glass)', padding: '32px', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: 'var(--text-primary)', margin: 0 }}>
                Chi Tiết Nhân Viên
              </h2>
              <button onClick={() => { setShowDetailDrawer(false); setSelectedUser(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer' }}>
                ×
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)'
              }}>
                {selectedUser.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: 'var(--text-primary)', margin: 0, marginBottom: '4px' }}>
                  {selectedUser.name}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>{selectedUser.email}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Vai trò</p>
                <p style={{ color: 'var(--text-primary)', fontSize: '16px', margin: 0 }}>{ROLE_LABELS[selectedUser.role] || selectedUser.role}</p>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Vị trí</p>
                <p style={{ color: 'var(--text-primary)', fontSize: '16px', margin: 0 }}>{POSITION_LABELS[selectedUser.position] || selectedUser.position || '—'}</p>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Số điện thoại</p>
                <p style={{ color: 'var(--text-primary)', fontSize: '16px', margin: 0 }}>{selectedUser.phone || '—'}</p>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Trạng thái hoạt động</p>
                <p style={{ color: selectedUser.isActive ? 'var(--success-text)' : 'var(--danger)', fontSize: '16px', margin: 0 }}>
                  {selectedUser.isActive ? 'Hoạt động' : 'Vô hiệu'}
                </p>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Trạng thái duyệt</p>
                <p style={{
                  color: selectedUser.approvalStatus === 'approved' ? 'var(--success-text)' :
                    selectedUser.approvalStatus === 'pending' ? '#eab308' : 'var(--danger)',
                  fontSize: '16px', margin: 0
                }}>
                  {selectedUser.approvalStatus === 'approved' ? 'Đã duyệt' :
                    selectedUser.approvalStatus === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                </p>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Ngày tạo</p>
                <p style={{ color: 'var(--text-primary)', fontSize: '16px', margin: 0 }}>
                  {new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>

              {/* Edit Form */}
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', marginBottom: '16px', fontWeight: '600' }}>Chỉnh sửa thông tin</h4>
                <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input className="form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Tên" />
                  <input className="form-input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Số điện thoại" />
                  <select className="form-input" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                    <option value="staff">Nhân viên</option>
                    <option value="manager">Quản lý</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select className="form-input" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })}>
                    <option value="none">Chưa phân công</option>
                    <option value="receptionist">Lễ tân</option>
                    <option value="waiter">Phục vụ</option>
                    <option value="cashier">Thu ngân</option>
                    <option value="technician">Kỹ thuật viên</option>
                    <option value="shift_supervisor">Trưởng ca</option>
                  </select>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 1, padding: '10px' }}>Lưu</button>
                    <button type="button" className="btn-secondary" style={{ flex: 1, padding: '10px' }}
                      onClick={() => { setShowDetailDrawer(false); setSelectedUser(null); }}>Đóng</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
