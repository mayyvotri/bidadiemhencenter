import { useState, useEffect, useCallback } from 'react';
import { attendanceApi } from '../services/api';

const formatTime = (date) => {
  if (!date) return '--:--';
  return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date) => {
  if (!date) return '--/--/----';
  return new Date(date).toLocaleDateString('vi-VN');
};

const formatWorkingHours = (hours) => {
  if (!hours) return '0h';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

const getStatusLabel = (status) => {
  const labels = {
    on_time: 'Đúng giờ',
    late: 'Đến muộn',
    early_leave: 'Về sớm',
    absent: 'Vắng mặt'
  };
  return labels[status] || status;
};

const getStatusColor = (status) => {
  const colors = {
    on_time: 'var(--success-text)',
    late: '#eab308',
    early_leave: '#f97316',
    absent: 'var(--danger)'
  };
  return colors[status] || '#6b7280';
};

const getShiftName = (hour) => {
  if (hour >= 6 && hour < 12) return 'Ca sáng';
  if (hour >= 12 && hour < 18) return 'Ca chiều';
  return 'Ca tối';
};

export default function AttendanceManagement() {
  const [logs, setLogs] = useState([]);
  const [employeeStats, setEmployeeStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    notes: ''
  });
  
  // Filters
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterUserId, setFilterUserId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchAttendanceData = useCallback(async () => {
    try {
      setLoading(true);
      const [logsData, statsData] = await Promise.all([
        attendanceApi.getAllAttendance({
          startDate: `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`,
          endDate: `${filterYear}-${String(filterMonth).padStart(2, '0')}-31`,
          userId: filterUserId,
          status: filterStatus,
          limit: 100
        }),
        attendanceApi.getEmployeeStatistics({
          month: filterMonth,
          year: filterYear
        })
      ]);

      if (logsData.success) {
        setLogs(logsData.data);
      }

      if (statsData.success) {
        setEmployeeStats(statsData.data);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu điểm danh');
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear, filterUserId, filterStatus]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const data = await attendanceApi.updateAttendance(selectedLog._id, {
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        notes: formData.notes
      });
      if (data.success) {
        setShowEditModal(false);
        setSelectedLog(null);
        setFormData({ checkIn: '', checkOut: '', notes: '' });
        fetchAttendanceData();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể cập nhật điểm danh');
    }
  };

  const openEditModal = (log) => {
    setSelectedLog(log);
    setFormData({
      checkIn: log.checkIn ? new Date(log.checkIn).toISOString().slice(0, 16) : '',
      checkOut: log.checkOut ? new Date(log.checkOut).toISOString().slice(0, 16) : '',
      notes: log.notes || ''
    });
    setShowEditModal(true);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-primary)' }}>Đang tải...</div>;
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: 'var(--text-primary)', marginBottom: '8px' }}>
        Quản Lý Điểm Danh
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Xem và chỉnh sửa điểm danh của nhân viên.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: 'var(--danger)', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Tháng</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(parseInt(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Năm</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Nhân viên</label>
            <input
              type="text"
              placeholder="ID nhân viên"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Trạng thái</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
            >
              <option value="">Tất cả</option>
              <option value="on_time">Đúng giờ</option>
              <option value="late">Đến muộn</option>
              <option value="early_leave">Về sớm</option>
              <option value="absent">Vắng mặt</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Statistics */}
      {employeeStats.length > 0 && (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: 'var(--text-primary)', marginBottom: '20px' }}>
            Thống kê nhân viên
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-glass)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Nhân viên</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ngày làm</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Giờ làm</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Đúng giờ</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Muộn</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Về sớm</th>
                </tr>
              </thead>
              <tbody>
                {employeeStats.map((stat) => (
                  <tr key={stat.user._id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-primary)', fontSize: '14px' }}>{stat.user.name}</td>
                    <td style={{ padding: '12px', color: 'var(--text-primary)', fontSize: '14px' }}>{stat.totalDays}</td>
                    <td style={{ padding: '12px', color: 'var(--text-primary)', fontSize: '14px' }}>{formatWorkingHours(stat.totalWorkingHours)}</td>
                    <td style={{ padding: '12px', color: 'var(--success-text)', fontSize: '14px' }}>{stat.onTime}</td>
                    <td style={{ padding: '12px', color: '#eab308', fontSize: '14px' }}>{stat.late}</td>
                    <td style={{ padding: '12px', color: '#f97316', fontSize: '14px' }}>{stat.earlyLeave}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Nhân viên</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ngày</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ca</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Giờ vào</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Giờ ra</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Giờ làm</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Trạng thái</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  Không có dữ liệu điểm danh
                </td>
              </tr>
            ) : logs.map((log) => (
              <tr key={log._id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{log.user?.name}</td>
                <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{formatDate(log.date)}</td>
                <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{getShiftName(new Date(log.checkIn).getHours())}</td>
                <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{formatTime(log.checkIn)}</td>
                <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{formatTime(log.checkOut)}</td>
                <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{formatWorkingHours(log.workingHours)}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    background: `${getStatusColor(log.status)}20`,
                    color: getStatusColor(log.status)
                  }}>
                    {getStatusLabel(log.status)}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <button
                    onClick={() => openEditModal(log)}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedLog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '32px', maxWidth: '500px', width: '90%' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '24px' }}>
              Chỉnh Sửa Điểm Danh
            </h2>
            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Nhân viên</label>
                <input
                  type="text"
                  value={selectedLog.user?.name}
                  disabled
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Giờ vào</label>
                <input
                  type="datetime-local"
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Giờ ra</label>
                <input
                  type="datetime-local"
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', resize: 'vertical' }}
                />
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
                    setSelectedLog(null);
                    setFormData({ checkIn: '', checkOut: '', notes: '' });
                  }}
                  style={{ flex: 1, padding: '12px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer' }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
