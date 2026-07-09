import { useState, useEffect, useCallback } from 'react';
import { shiftApi } from '../services/api';

const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const STATUS_LABELS = {
  pending: 'Đang chờ',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
  cancelled: 'Đã hủy'
};
const STATUS_COLORS = {
  pending: '#eab308',
  approved: 'var(--success-text)',
  rejected: 'var(--danger)',
  cancelled: '#6b7280'
};

export default function ShiftManagement() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    daysOfWeek: [],
    maxEmployees: '',
    color: 'var(--info)',
    isActive: true
  });

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await shiftApi.getAllShifts();
      if (data.success) {
        setShifts(data.data);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách ca làm việc');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleCreate = () => {
    setEditingShift(null);
    setFormData({
      name: '',
      description: '',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      maxEmployees: '',
      color: 'var(--info)',
      isActive: true
    });
    setShowModal(true);
  };

  const handleEdit = (shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      description: shift.description,
      startTime: shift.startTime,
      endTime: shift.endTime,
      daysOfWeek: shift.daysOfWeek || [],
      maxEmployees: shift.maxEmployees || '',
      color: shift.color,
      isActive: shift.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa ca làm việc này?')) return;

    try {
      const data = await shiftApi.deleteShift(id);
      if (data.success) {
        fetchShifts();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể xóa ca làm việc');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingShift) {
        const data = await shiftApi.updateShift(editingShift._id, formData);
        if (data.success) {
          setShowModal(false);
          fetchShifts();
        } else {
          setError(data.message);
        }
      } else {
        const data = await shiftApi.createShift(formData);
        if (data.success) {
          setShowModal(false);
          fetchShifts();
        } else {
          setError(data.message);
        }
      }
    } catch (err) {
      setError(err.message || 'Không thể lưu ca làm việc');
    }
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-primary)' }}>Đang tải...</div>;
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: 'var(--text-primary)', marginBottom: '8px' }}>
        Quản Lý Ca Làm Việc
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Tạo và quản lý các ca làm việc cho nhân viên.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: 'var(--danger)', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <button
        onClick={handleCreate}
        style={{
          padding: '12px 24px',
          background: 'var(--primary)',
          border: 'none',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          fontSize: '14px',
          cursor: 'pointer',
          marginBottom: '24px'
        }}
      >
        + Tạo Ca Mới
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {shifts.map((shift) => (
          <div key={shift._id} style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {shift.name}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                  {shift.startTime} - {shift.endTime}
                </p>
              </div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: shift.color }} />
            </div>

            {shift.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                {shift.description}
              </p>
            )}

            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>Ngày làm việc:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {shift.daysOfWeek && shift.daysOfWeek.length > 0 ? shift.daysOfWeek.map(day => (
                  <span key={day} style={{ padding: '4px 8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-primary)' }}>
                    {DAY_NAMES[day]}
                  </span>
                )) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Chưa chọn</span>}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                Số nhân viên tối đa: {shift.maxEmployees || 'Không giới hạn'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ color: shift.isActive ? 'var(--success-text)' : 'var(--danger)', fontSize: '12px', marginRight: '8px' }}>
                {shift.isActive ? '● Hoạt động' : '● Không hoạt động'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleEdit(shift)}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Sửa
              </button>
              <button
                onClick={() => handleDelete(shift._id)}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: 'var(--danger)',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto', padding: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '24px' }}>
              {editingShift ? 'Sửa Ca Làm Việc' : 'Tạo Ca Mới'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Tên ca</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Giờ bắt đầu</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Giờ kết thúc</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Ngày làm việc</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {DAY_NAMES.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleDay(index)}
                      style={{
                        padding: '8px 12px',
                        background: formData.daysOfWeek.includes(index) ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
                        border: formData.daysOfWeek.includes(index) ? 'none' : '1px solid var(--border-glass)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Số nhân viên tối đa</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxEmployees}
                  onChange={(e) => setFormData({ ...formData, maxEmployees: e.target.value })}
                  placeholder="Để trống nếu không giới hạn"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Màu sắc</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  style={{ width: '100%', height: '40px', padding: '4px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', cursor: 'pointer' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: '20px', height: '20px', marginRight: '8px' }}
                  />
                  <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>Hoạt động</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: 'var(--primary)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
