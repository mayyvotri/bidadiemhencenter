import { useState, useEffect, useCallback } from 'react';
import { shiftApi, shiftAssignmentApi, userApi } from '../services/api';
import WeeklyCalendar from '../components/WeeklyCalendar';
import MonthlyCalendar from '../components/MonthlyCalendar';

const formatDate = (dateStr) => {
  if (!dateStr) return '--/--/----';
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

export default function ShiftScheduling() {
  const [view, setView] = useState('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [assignmentForm, setAssignmentForm] = useState({
    userId: '',
    shiftId: '',
    notes: ''
  });

  const fetchShifts = useCallback(async () => {
    try {
      const data = await shiftApi.getAllShifts({ isActive: 'true' });
      if (data.success) setShifts(data.data);
    } catch (err) {
      console.error('Failed to fetch shifts:', err);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await userApi.getAllUsers({ role: 'employee' });
      if (data.success) setEmployees(data.data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const start = new Date(currentDate);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + 30);

      const data = await shiftAssignmentApi.getAssignmentsByDateRange({
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      });
      if (data.success) setAssignments(data.data);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  }, [currentDate]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchShifts(), fetchEmployees(), fetchAssignments()]);
      setLoading(false);
    };
    loadData();
  }, [fetchShifts, fetchEmployees, fetchAssignments]);

  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
    setAssignmentForm({
      userId: '',
      shiftId: '',
      notes: ''
    });
    setShowAssignmentModal(true);
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const data = await shiftAssignmentApi.createAssignment({
        userId: assignmentForm.userId,
        shiftId: assignmentForm.shiftId,
        date: selectedDate,
        notes: assignmentForm.notes
      });

      if (data.success) {
        setShowAssignmentModal(false);
        fetchAssignments();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể tạo phân công');
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa phân công này?')) return;

    try {
      const data = await shiftAssignmentApi.deleteAssignment(id);
      if (data.success) {
        fetchAssignments();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể xóa phân công');
    }
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-primary)' }}>Đang tải...</div>;
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: 'var(--text-primary)', marginBottom: '8px' }}>
        Lịch Trình Ca Làm Việc
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Quản lý và phân công lịch làm việc cho nhân viên.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: 'var(--danger)', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setView('weekly')}
            style={{
              padding: '10px 20px',
              background: view === 'weekly' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
              border: view === 'weekly' ? 'none' : '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Tuần
          </button>
          <button
            onClick={() => setView('monthly')}
            style={{
              padding: '10px 20px',
              background: view === 'monthly' ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
              border: view === 'monthly' ? 'none' : '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Tháng
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={view === 'weekly' ? handlePreviousWeek : handlePreviousMonth}
            style={{
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            ←
          </button>
          <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', minWidth: '150px', textAlign: 'center' }}>
            {view === 'weekly' 
              ? `${currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`
              : `${currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}`
            }
          </span>
          <button
            onClick={view === 'weekly' ? handleNextWeek : handleNextMonth}
            style={{
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'weekly' ? (
        <WeeklyCalendar
          startDate={currentDate.toISOString().split('T')[0]}
          onDateClick={handleDateClick}
        />
      ) : (
        <MonthlyCalendar
          year={currentDate.getFullYear()}
          month={currentDate.getMonth() + 1}
          onDateClick={handleDateClick}
        />
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: '12px', maxWidth: '500px', width: '90%', padding: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Phân Công Ca Làm Việc
            </h2>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>Ngày:</p>
              <p style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600' }}>{formatDate(selectedDate)}</p>
            </div>

            <form onSubmit={handleCreateAssignment}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Nhân viên</label>
                <select
                  value={assignmentForm.userId}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, userId: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
                >
                  <option value="">Chọn nhân viên</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name} - {emp.position}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Ca làm việc</label>
                <select
                  value={assignmentForm.shiftId}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, shiftId: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
                >
                  <option value="">Chọn ca làm việc</option>
                  {shifts.map(shift => (
                    <option key={shift._id} value={shift._id}>{shift.name} ({shift.startTime} - {shift.endTime})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Ghi chú</label>
                <textarea
                  value={assignmentForm.notes}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Ghi chú tùy chọn"
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(false)}
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
                  Phân Công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignments List */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '16px' }}>
          Phân Công Gần Đây
        </h2>

        {assignments.length === 0 ? (
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Chưa có phân công nào
          </div>
        ) : (
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-glass)' }}>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Nhân viên</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ca làm việc</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Ngày</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {assignments.slice(0, 10).map((assignment) => (
                  <tr key={assignment._id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>
                      <div style={{ fontWeight: '500' }}>{assignment.user?.name || 'N/A'}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{assignment.user?.position || ''}</div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>
                      <div style={{ fontWeight: '500' }}>{assignment.shift?.name || 'N/A'}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{assignment.shift?.startTime} - {assignment.shift?.endTime}</div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '14px' }}>{formatDate(assignment.date)}</td>
                    <td style={{ padding: '16px' }}>
                      <button
                        onClick={() => handleDeleteAssignment(assignment._id)}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          color: 'var(--danger)',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
