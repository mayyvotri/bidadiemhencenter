import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useMediaQuery } from '../hooks/useMediaQuery';

const POSITION_LABELS = {
  receptionist: 'Lễ tân',
  waiter: 'Phục vụ',
  cashier: 'Thu ngân',
  technician: 'Kỹ thuật',
  shift_supervisor: 'Giám sát ca',
  none: 'Khác'
};

const STATUS_LABELS = {
  working: 'Đang làm',
  on_leave: 'Nghỉ phép',
  suspended: 'Tạm ngưng',
  resigned: 'Đã nghỉ việc'
};

const ROLE_LABELS = {
  staff: 'Nhân viên',
  manager: 'Quản lý',
  admin: 'Admin'
};

export default function StaffManagement() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff');
      if (res.success) {
        setStaffList(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingStaff) return;
    setSaving(true);
    try {
      const res = await api.put(`/staff/${editingStaff._id}`, editingStaff);
      if (res.success) {
        setStaffList(prev => prev.map(s => s._id === res.data._id ? res.data : s));
        setShowModal(false);
        setEditingStaff(null);
      }
    } catch (e) {
      alert('Lỗi khi lưu: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (staff) => {
    try {
      const res = await api.put(`/staff/${staff._id}`, { isActive: !staff.isActive });
      if (res.success) {
        setStaffList(prev => prev.map(s => s._id === res.data._id ? res.data : s));
      }
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
  };

  const filteredStaff = staffList.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.phone?.includes(searchTerm);
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const openEdit = (staff) => {
    setEditingStaff({ ...staff });
    setShowModal(true);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Quản lý nhân viên</h2>
        <button
          onClick={fetchStaff}
          style={{
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid var(--border-glass)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}
        >
          Làm mới
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Tìm kiếm tên, email, SĐT..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border-glass)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '14px'
          }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border-glass)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            minWidth: '150px'
          }}
        >
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>STT</th>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>Tên</th>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>SĐT</th>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>Vị trí</th>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>Trạng thái</th>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>Khu vực</th>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>Tác vụ</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((staff, index) => (
                <tr key={staff._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>{index + 1}</td>
                  <td style={{ padding: '12px', color: 'var(--text-primary)', fontSize: '13px' }}>{staff.name}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>{staff.email}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>{staff.phone}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {POSITION_LABELS[staff.position] || staff.position}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: staff.status === 'working' ? 'rgba(76,175,80,0.2)' :
                                  staff.status === 'on_leave' ? 'rgba(255,193,7,0.2)' :
                                  'rgba(244,67,54,0.2)',
                      color: staff.status === 'working' ? '#4CAF50' :
                             staff.status === 'on_leave' ? '#FFC107' : '#F44336'
                    }}>
                      {STATUS_LABELS[staff.status] || staff.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>{staff.workArea || '-'}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => openEdit(staff)}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(33,150,243,0.2)',
                          border: 'none',
                          borderRadius: '4px',
                          color: '#2196F3',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleToggleActive(staff)}
                        style={{
                          padding: '6px 12px',
                          background: staff.isActive ? 'rgba(244,67,54,0.2)' : 'rgba(76,175,80,0.2)',
                          border: 'none',
                          borderRadius: '4px',
                          color: staff.isActive ? '#F44336' : '#4CAF50',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {staff.isActive ? 'Khóa' : 'Mở'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStaff.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Không tìm thấy nhân viên nào
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showModal && editingStaff && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: isMobile ? '100%' : '600px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Chỉnh sửa nhân viên</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>Tên</label>
                <input
                  type="text"
                  value={editingStaff.name || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>SĐT</label>
                <input
                  type="text"
                  value={editingStaff.phone || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>Vị trí</label>
                <select
                  value={editingStaff.position || 'none'}
                  onChange={(e) => setEditingStaff({ ...editingStaff, position: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                >
                  {Object.entries(POSITION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>Trạng thái</label>
                <select
                  value={editingStaff.status || 'working'}
                  onChange={(e) => setEditingStaff({ ...editingStaff, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>Vai trò</label>
                <select
                  value={editingStaff.role || 'staff'}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                >
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>Khu vực làm việc</label>
                <input
                  type="text"
                  value={editingStaff.workArea || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, workArea: e.target.value })}
                  placeholder="VD: Chi nhánh 1"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>Địa chỉ</label>
                <input
                  type="text"
                  value={editingStaff.address || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, address: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>Lương</label>
                <input
                  type="number"
                  value={editingStaff.salary || 0}
                  onChange={(e) => setEditingStaff({ ...editingStaff, salary: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>Liên hệ khẩn cấp</label>
                <input
                  type="text"
                  value={editingStaff.emergencyContact || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, emergencyContact: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>Ghi chú</label>
                <textarea
                  value={editingStaff.notes || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, notes: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowModal(false); setEditingStaff(null); }}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '10px 20px',
                  background: '#2196F3',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
