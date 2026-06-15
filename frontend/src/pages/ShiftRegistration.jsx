import { useState, useEffect, useCallback } from 'react';
import { shiftApi, shiftRegistrationApi } from '../services/api';

const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const STATUS_LABELS = {
  pending: 'Đang chờ',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
  cancelled: 'Đã hủy'
};
const STATUS_COLORS = {
  pending: '#eab308',
  approved: '#22c55e',
  rejected: '#ef4444',
  cancelled: '#6b7280'
};

const formatDate = (date) => {
  if (!date) return '--/--/----';
  return new Date(date).toLocaleDateString('vi-VN');
};

export default function ShiftRegistration() {
  const [shifts, setShifts] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [formData, setFormData] = useState({
    startDate: '',
    notes: ''
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [shiftsData, registrationsData] = await Promise.all([
        shiftApi.getAllShifts({ isActive: 'true' }),
        shiftRegistrationApi.getMyRegistrations()
      ]);
      
      if (shiftsData.success) setShifts(shiftsData.data);
      if (registrationsData.success) setRegistrations(registrationsData.data);
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRegister = (shift) => {
    setSelectedShift(shift);
    setFormData({
      startDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const data = await shiftRegistrationApi.createRegistration({
        shiftId: selectedShift._id,
        startDate: formData.startDate,
        notes: formData.notes
      });

      if (data.success) {
        setShowModal(false);
        fetchData();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể đăng ký ca làm việc');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Bạn có chắc muốn hủy đăng ký này?')) return;

    try {
      const data = await shiftRegistrationApi.cancelRegistration(id);
      if (data.success) {
        fetchData();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể hủy đăng ký');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Đang tải...</div>;
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: '#fff', marginBottom: '8px' }}>
        Đăng Ký Ca Làm Việc
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Xem và đăng ký các ca làm việc có sẵn.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: '#ef4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Available Shifts */}
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#fff', marginBottom: '16px' }}>
        Ca Làm Việc Có Sẵn
      </h2>
      
      {shifts.length === 0 ? (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px' }}>
          Không có ca làm việc nào
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          {shifts.map((shift) => (
            <div key={shift._id} style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff', marginBottom: '8px' }}>
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
                    <span key={day} style={{ padding: '4px 8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', fontSize: '12px', color: '#fff' }}>
                      {DAY_NAMES[day]}
                    </span>
                  )) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Chưa chọn</span>}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  Số nhân viên tối đa: {shift.maxEmployees || 'Không giới hạn'}
                </p>
              </div>

              <button
                onClick={() => handleRegister(shift)}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  background: 'var(--primary)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Đăng Ký
              </button>
            </div>
          ))}
        </div>
      )}

      {/* My Registrations */}
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#fff', marginBottom: '16px' }}>
        Đăng Ký Của Tôi
      </h2>

      {registrations.length === 0 ? (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Bạn chưa đăng ký ca làm việc nào
        </div>
      ) : (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ca làm việc</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ngày bắt đầu</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Trạng thái</th>
                <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => (
                <tr key={reg._id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{reg.shift?.name || 'N/A'}</td>
                  <td style={{ padding: '16px', color: '#fff', fontSize: '14px' }}>{formatDate(reg.startDate)}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: `${STATUS_COLORS[reg.status]}20`,
                      color: STATUS_COLORS[reg.status]
                    }}>
                      {STATUS_LABELS[reg.status] || reg.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {(reg.status === 'pending' || reg.status === 'approved') && (
                      <button
                        onClick={() => handleCancel(reg._id)}
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
                        Hủy
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Registration Modal */}
      {showModal && selectedShift && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: '12px', maxWidth: '500px', width: '90%', padding: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#fff', marginBottom: '16px' }}>
              Đăng Ký Ca Làm Việc
            </h2>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#fff', marginBottom: '8px' }}>
                {selectedShift.name}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                {selectedShift.startTime} - {selectedShift.endTime}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Ngày bắt đầu</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Ghi chú tùy chọn"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px', resize: 'vertical' }}
                />
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
                    color: '#fff',
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
                    color: '#fff',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Đăng Ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
