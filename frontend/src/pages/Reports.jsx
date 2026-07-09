import { useState, useEffect } from 'react';
import { api, payrollApi } from '../services/api';
import { onEvent, Events } from '../utils/events';
import { useMediaQuery } from '../hooks/useMediaQuery';

const fmt = (n) => {
  if (n == null) return '0';
  return Number(n).toLocaleString('vi-VN');
};
const fmtCurrency = (n) => {
  if (n == null) return '0đ';
  return Number(n).toLocaleString('vi-VN') + 'đ';
};

export default function Reports() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [activeTab, setActiveTab] = useState('attendance');
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffAttendance, setStaffAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [searchStaff, setSearchStaff] = useState('');

  // Payroll summary state
  const [payrollSummary, setPayrollSummary] = useState(null);
  const [payrollLoading, setPayrollLoading] = useState(false);

  // Tasks state
  const [tasksData, setTasksData] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(false);

  useEffect(() => {
    fetchStaffList();
    const unsubscribe = onEvent(Events.PAYROLL_UPDATED, fetchStaffList);
    return () => unsubscribe();
  }, []);

  // Fetch payroll summary when tab changes
  useEffect(() => {
    if (activeTab === 'payroll') {
      fetchPayrollSummary();
    }
  }, [activeTab, currentMonth, currentYear]);

  // Fetch tasks when tab changes
  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasksData();
    }
  }, [activeTab, currentMonth, currentYear]);

  const fetchStaffList = async () => {
    try {
      const data = await api.get('/staff');
      if (data.success) {
        // Only show active staff (exclude off)
        const all = data.data.data || data.data || [];
        const filtered = all.filter(s => s.isActive !== false && s.status !== 'off');
        const sorted = filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setStaffList(sorted);
      }
    } catch { setStaffList([]); } finally { setLoading(false); }
  };

  const fetchStaffAttendance = async (staff) => {
    setLoadingDetail(true);
    setStaffAttendance(null);
    try {
      const staffId = staff.id || staff._id;
      const data = await payrollApi.getStaffAttendance(staffId, { month: currentMonth, year: currentYear });
      if (data.success) {
        setStaffAttendance(data.data);
        setSelectedStaff(staff);
      } else {
        alert('Không có dữ liệu chấm công cho nhân viên này');
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu:', err);
      alert('Lỗi khi tải dữ liệu chấm công');
      setStaffAttendance(null);
    }
    finally { setLoadingDetail(false); }
  };

  const fetchPayrollSummary = async () => {
    setPayrollLoading(true);
    try {
      // Fetch all active staff (not off)
      const staffData = await api.get('/staff');
      const allStaff = staffData.success ? (staffData.data.data || staffData.data || []) : [];

      // Filter active staff only (exclude off status)
      const activeStaff = allStaff.filter(s => s.isActive !== false && s.status !== 'off');

      // Fetch payroll for the month
      const payrollData = await payrollApi.getPayroll({ month: currentMonth, year: currentYear });
      const payrolls = payrollData.success ? (payrollData.data || []) : [];

      // Create payroll map by staffId
      const payrollMap = {};
      payrolls.forEach(p => {
        const key = p.staffId?._id || p.staffId;
        if (key) payrollMap[key] = p;
      });

      // Merge: all active staff with payroll data
      const mergedData = activeStaff.map(staff => {
        const staffId = staff.id || staff._id;
        const payroll = payrollMap[staffId];
        if (payroll) {
          return {
            ...payroll,
            staffName: staff.name,
            staff: { ...payroll.staff, name: staff.name }
          };
        } else {
          // Staff has no payroll yet - show with 0 values
          return {
            staffId,
            staffName: staff.name,
            staff: { name: staff.name, dept: staff.dept },
            baseSalary: 0,
            totalBonus: 0,
            totalPenalty: 0,
            inventoryDeduction: 0,
            advancePayment: 0,
            netSalary: 0,
            status: 'none'
          };
        }
      }).sort((a, b) => (a.staffName || '').localeCompare(b.staffName || ''));

      setPayrollSummary(mergedData);
    } catch { setPayrollSummary([]); }
    finally { setPayrollLoading(false); }
  };

  const fetchTasksData = async () => {
    setTasksLoading(true);
    try {
      const data = await api.get('/tasks/stats', {
        params: { month: currentMonth, year: currentYear }
      });
      if (data.success) {
        setTasksData(data.data);
      } else {
        // Try fetching all tasks and aggregate
        const allTasks = await api.get('/tasks');
        if (allTasks.success) {
          const tasks = allTasks.data.data || allTasks.data || [];
          const stats = {
            total: tasks.length,
            pending: tasks.filter(t => t.status === 'pending' || t.status === 'assigned').length,
            inProgress: tasks.filter(t => t.status === 'in_progress').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            overdue: tasks.filter(t => t.status === 'overdue').length,
            tasks: tasks
          };
          setTasksData(stats);
        }
      }
    } catch { setTasksData(null); }
    finally { setTasksLoading(false); }
  };

  const changeMonth = (delta) => {
    let m = currentMonth + delta;
    let y = currentYear;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setCurrentMonth(m);
    setCurrentYear(y);
    if (selectedStaff && activeTab === 'attendance') {
      fetchStaffAttendance({ ...selectedStaff, id: selectedStaff.id });
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  const getStatusBadge = (status) => {
    if (status === 'late') return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(245,158,11,0.12)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)' }}>Trễ</span>;
    if (status === 'on_time') return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(16,185,129,0.12)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)' }}>Đúng giờ</span>;
    if (status === 'absent') return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>Nghỉ</span>;
    return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(107,114,128,0.12)', color: '#6b7280', border: '1px solid rgba(107,114,128,0.3)' }}>{status || 'Bình thường'}</span>;
  };

  const getTaskStatusBadge = (status) => {
    if (status === 'completed') return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(16,185,129,0.12)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)' }}>Hoàn thành</span>;
    if (status === 'in_progress') return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(59,130,246,0.12)', color: 'var(--info)', border: '1px solid rgba(59,130,246,0.3)' }}>Đang làm</span>;
    if (status === 'pending' || status === 'assigned') return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(245,158,11,0.12)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)' }}>Chờ</span>;
    if (status === 'overdue') return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(239,68,68,0.12)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>Quá hạn</span>;
    return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(107,114,128,0.12)', color: '#6b7280', border: '1px solid rgba(107,114,128,0.3)' }}>{status}</span>;
  };

  const TABS = [
    { id: 'attendance', label: '📅 Chấm Công', icon: '📅' },
    { id: 'payroll', label: '💰 Lương Tổng', icon: '💰' },
    { id: 'tasks', label: '📋 Nhiệm Vụ', icon: '📋' },
  ];

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>
            📊 Báo cáo Tổng Hợp
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Theo dõi chấm công, lương và nhiệm vụ của nhân viên
          </p>
        </div>

        {/* Month Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          <button onClick={() => changeMonth(-1)} style={{ padding: '8px 14px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', borderRadius: '8px' }}>←</button>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', minWidth: '120px', textAlign: 'center' }}>
            Tháng {currentMonth}/{currentYear}
          </span>
          <button onClick={() => changeMonth(1)} style={{ padding: '8px 14px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', borderRadius: '8px' }}>→</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-glass)', width: 'fit-content' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'attendance' && (
        <AttendanceTab
          staffList={staffList}
          selectedStaff={selectedStaff}
          setSelectedStaff={setSelectedStaff}
          staffAttendance={staffAttendance}
          loading={loading}
          loadingDetail={loadingDetail}
          searchStaff={searchStaff}
          setSearchStaff={setSearchStaff}
          fetchStaffAttendance={fetchStaffAttendance}
          getStatusBadge={getStatusBadge}
          formatCurrency={formatCurrency}
          currentMonth={currentMonth}
          currentYear={currentYear}
        />
      )}

      {activeTab === 'payroll' && (
        <PayrollTab
          payrollSummary={payrollSummary}
          payrollLoading={payrollLoading}
          currentMonth={currentMonth}
          currentYear={currentYear}
          formatCurrency={formatCurrency}
          staffList={staffList}
        />
      )}

      {activeTab === 'tasks' && (
        <TasksTab
          tasksData={tasksData}
          tasksLoading={tasksLoading}
          currentMonth={currentMonth}
          currentYear={currentYear}
          getTaskStatusBadge={getTaskStatusBadge}
          staffList={staffList}
        />
      )}
    </div>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────
function AttendanceTab({
  staffList, selectedStaff, setSelectedStaff, staffAttendance,
  loading, loadingDetail, searchStaff, setSearchStaff,
  fetchStaffAttendance, getStatusBadge, formatCurrency, currentMonth, currentYear
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '340px 1fr', gap: '20px', alignItems: 'start' }}>
      {/* Left: Staff List */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>👥 Danh sách nhân viên</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>{staffList.length} nhân viên</p>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <input type="text" placeholder="🔍 Tìm tên nhân viên..." className="form-input"
            value={searchStaff} onChange={e => setSearchStaff(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '13px', width: '100%' }} />
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
        ) : staffList.filter(s => !searchStaff || (s.name || '').toLowerCase().includes(searchStaff.toLowerCase())).length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontSize: '13px' }}>Không tìm thấy nhân viên</div>
          </div>
        ) : (
          <div style={{ maxHeight: 'calc(100vh - 420px)', overflowY: 'auto' }}>
            {staffList.filter(s => !searchStaff || (s.name || '').toLowerCase().includes(searchStaff.toLowerCase())).map(staff => (
              <div key={staff.id || staff._id}
                onClick={() => fetchStaffAttendance(staff)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: selectedStaff?.id === staff.id || selectedStaff?._id === staff.id ? 'rgba(225,29,72,0.08)' : 'transparent',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => { if (selectedStaff?.id !== staff.id && selectedStaff?._id !== staff.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (selectedStaff?.id !== staff.id && selectedStaff?._id !== staff.id) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Avatar */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', flexShrink: 0
                  }}>
                    {(staff.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {staff.name || '—'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {staff.dept && <span>{staff.dept}</span>}
                      {staff.role && staff.role !== 'staff' && (
                        <span style={{ padding: '1px 6px', borderRadius: '4px', background: 'rgba(168,85,247,0.15)', color: '#a855f7', fontSize: '10px', fontWeight: '600' }}>
                          {staff.role === 'admin' ? 'Admin' : staff.role === 'manager' ? 'QL' : staff.role}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedStaff?.id === staff.id || selectedStaff?._id === staff.id ? (
                    <span style={{ color: 'var(--primary)', fontSize: '14px' }}>✓</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Attendance Report */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!selectedStaff ? (
          <div className="glass-card" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.4 }}>📋</div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Chọn nhân viên để xem báo cáo</div>
            <div style={{ fontSize: '13px' }}>Nhấp vào tên nhân viên bên trái để xem chi tiết chấm công tháng</div>
          </div>
        ) : loadingDetail ? (
          <div className="glass-card" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
            <div>Đang tải dữ liệu chấm công...</div>
          </div>
        ) : staffAttendance ? (
          <>
            {/* Staff Info Header */}
            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--primary)' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', flexShrink: 0
              }}>
                {(staffAttendance.staff?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>
                  {staffAttendance.staff?.name || '—'}
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {staffAttendance.staff?.email && <span>📧 {staffAttendance.staff.email}</span>}
                  {staffAttendance.staff?.dept && <span>🏢 {staffAttendance.staff.dept}</span>}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Tháng {staffAttendance.month}/{staffAttendance.year}
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '12px' }}>
              {[
                { label: 'Ngày làm việc', value: staffAttendance.summary?.totalDaysWorked || 0, color: 'var(--info)', icon: '📅' },
                { label: 'Tổng giờ', value: `${(staffAttendance.summary?.totalHoursWorked || 0).toFixed(1)}h`, color: 'var(--success)', icon: '⏱️' },
                { label: 'Số lần trễ', value: staffAttendance.summary?.lateCount || 0, color: 'var(--warning)', icon: '⏰' },
                { label: 'Tăng ca', value: `${(staffAttendance.summary?.overtimeHours || 0).toFixed(1)}h`, color: '#8b5cf6', icon: '🔥' },
                { label: 'Lương ước tính', value: formatCurrency(staffAttendance.summary?.grossSalary || 0), color: 'var(--danger)', icon: '💰' },
              ].map(s => (
                <div key={s.label} className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>{s.icon}</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Salary Breakdown */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
                💵 Chi tiết lương tháng
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { label: 'Mức lương cơ bản/giờ', value: formatCurrency(staffAttendance.summary?.wagePerHour || 0) },
                    { label: 'Lương cơ bản', value: formatCurrency(staffAttendance.summary?.baseSalary || 0) },
                    { label: 'Phụ cấp', value: `+${formatCurrency(staffAttendance.summary?.allowances || 0)}`, color: 'var(--success)' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                      <span style={{ fontWeight: '500', color: r.color || 'var(--text-primary)' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { label: 'Tổng giờ làm', value: `${(staffAttendance.summary?.totalHoursWorked || 0).toFixed(2)}h` },
                    { label: 'Giờ tăng ca', value: `${(staffAttendance.summary?.overtimeHours || 0).toFixed(2)}h` },
                    { label: 'Thưởng tăng ca', value: `+${formatCurrency(staffAttendance.summary?.overtimePay || 0)}`, color: 'var(--success)' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                      <span style={{ fontWeight: '500', color: r.color || 'var(--text-primary)' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Tổng lương ước tính (Gross)</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--success)' }}>{formatCurrency(staffAttendance.summary?.grossSalary || 0)}</span>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  📆 Lịch sử chấm công — Tháng {staffAttendance.month}/{staffAttendance.year}
                </h4>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>NGÀY</th>
                      <th>CHECK-IN</th>
                      <th>CHECK-OUT</th>
                      <th>GIỜ LÀM</th>
                      <th>CA</th>
                      <th>TRẠNG THÁI</th>
                      <th>GHI CHÚ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffAttendance.attendanceRecords && staffAttendance.attendanceRecords.length > 0 ? (
                      staffAttendance.attendanceRecords.map((record, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            {record.date ? new Date(record.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '—'}
                          </td>
                          <td style={{ color: 'var(--text-primary)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            {record.checkIn ? new Date(record.checkIn).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td style={{ color: 'var(--text-primary)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            {record.checkOut ? new Date(record.checkOut).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>
                            {record.hours != null ? `${record.hours.toFixed(2).replace(/\.00$/, '')}h` : '-'}
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{record.shift || 'Ca thường'}</td>
                          <td>{getStatusBadge(record.status)}</td>
                          <td style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {record.note || '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                          Chưa có bản ghi chấm công cho tháng này
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
            <div>Không có dữ liệu chấm công</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Payroll Summary Tab ───────────────────────────────────────────────────────
function PayrollTab({ payrollSummary, payrollLoading, currentMonth, currentYear, formatCurrency, staffList }) {
  if (payrollLoading) {
    return (
      <div className="glass-card" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
        <div>Đang tải dữ liệu lương...</div>
      </div>
    );
  }

  if (!payrollSummary || payrollSummary.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.4 }}>💰</div>
        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Chưa có dữ liệu lương</div>
        <div style={{ fontSize: '13px' }}>Tính lương cho tháng {currentMonth}/{currentYear} tại trang Lương</div>
      </div>
    );
  }

  // Calculate totals
  const totals = payrollSummary.reduce((acc, p) => ({
    totalBase: acc.totalBase + (p.baseSalary || 0),
    totalBonus: acc.totalBonus + (p.totalBonus || 0),
    totalPenalty: acc.totalPenalty + (p.totalPenalty || 0),
    totalInventoryDeduction: acc.totalInventoryDeduction + (p.inventoryDeduction || p.warehouseDeduction || 0),
    totalAdvance: acc.totalAdvance + (p.advancePayment || p.advance || 0),
    totalNet: acc.totalNet + (p.netSalary || 0),
    count: acc.count + 1,
    paid: acc.paid + (p.status === 'paid' ? 1 : 0),
    pending: acc.pending + (p.status === 'calculated' || p.status === 'draft' ? 1 : 0),
  }), { totalBase: 0, totalBonus: 0, totalPenalty: 0, totalInventoryDeduction: 0, totalAdvance: 0, totalNet: 0, count: 0, paid: 0, pending: 0 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Tổng nhân viên', value: totals.count, color: 'var(--info)', icon: '👥' },
          { label: 'Đã thanh toán', value: totals.paid, color: 'var(--success)', icon: '✅' },
          { label: 'Chưa thanh toán', value: totals.pending, color: 'var(--warning)', icon: '⏳' },
          { label: 'Tổng thực nhận', value: formatCurrency(totals.totalNet), color: 'var(--danger)', icon: '💰' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>{s.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Payroll Details Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            💵 Bảng lương tổng — Tháng {currentMonth}/{currentYear}
          </h4>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>TÊN NV</th>
                <th>LƯƠNG</th>
                <th>THƯỞNG</th>
                <th>PHẠT</th>
                <th>ÂM QUẦY/KHO</th>
                <th>ỨNG</th>
                <th>THỰC NHẬN</th>
              </tr>
            </thead>
            <tbody>
              {payrollSummary.map((p, i) => {
                const penalty = p.totalPenalty || p.penalty || 0;
                const inventoryDeduction = p.inventoryDeduction || p.warehouseDeduction || 0;
                const advance = p.advancePayment || p.advance || 0;
                const hasPayroll = p.status !== 'none';
                const isZero = !hasPayroll || (p.baseSalary === 0 && p.netSalary === 0);

                return (
                  <tr key={i} style={{ opacity: isZero ? 0.5 : 1 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)'
                        }}>
                          {(p.staffName || p.staff?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>{p.staffName || p.staff?.name || '—'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.staff?.dept || p.department || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                      {hasPayroll ? formatCurrency(p.baseSalary || 0) : <span style={{ color: '#6b7280' }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--success)' }}>
                      {hasPayroll && (p.totalBonus || 0) > 0 ? `+${formatCurrency(p.totalBonus)}` : '—'}
                    </td>
                    <td style={{ color: penalty > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {penalty > 0 ? `-${formatCurrency(penalty)}` : '—'}
                    </td>
                    <td style={{ color: inventoryDeduction > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {inventoryDeduction > 0 ? `-${formatCurrency(inventoryDeduction)}` : '—'}
                    </td>
                    <td style={{ color: advance > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                      {advance > 0 ? `-${formatCurrency(advance)}` : '—'}
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: '700', fontSize: '14px' }}>
                      {hasPayroll ? formatCurrency(p.netSalary || 0) : <span style={{ color: '#6b7280' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                <td style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>TỔNG CỘNG</td>
                <td style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{formatCurrency(totals.totalBase)}</td>
                <td style={{ fontWeight: '700', color: 'var(--success)' }}>+{formatCurrency(totals.totalBonus)}</td>
                <td style={{ fontWeight: '700', color: 'var(--danger)' }}>-{formatCurrency(totals.totalPenalty)}</td>
                <td style={{ fontWeight: '700', color: 'var(--danger)' }}>-{formatCurrency(totals.totalInventoryDeduction)}</td>
                <td style={{ fontWeight: '700', color: 'var(--warning)' }}>-{formatCurrency(totals.totalAdvance)}</td>
                <td style={{ fontWeight: '700', color: 'var(--success)', fontSize: '16px' }}>{formatCurrency(totals.totalNet)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────
function TasksTab({ tasksData, tasksLoading, currentMonth, currentYear, getTaskStatusBadge, staffList }) {
  if (tasksLoading) {
    return (
      <div className="glass-card" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
        <div>Đang tải dữ liệu nhiệm vụ...</div>
      </div>
    );
  }

  if (!tasksData || (tasksData.total === 0 && !tasksData.tasks)) {
    return (
      <div className="glass-card" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.4 }}>📋</div>
        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Chưa có nhiệm vụ nào</div>
        <div style={{ fontSize: '13px' }}>Tạo nhiệm vụ mới cho nhân viên tại trang Nhiệm Vụ</div>
      </div>
    );
  }

  const tasks = tasksData.tasks || [];
  const stats = {
    total: tasksData.total || tasks.length,
    pending: tasksData.pending || tasks.filter(t => t.status === 'pending' || t.status === 'assigned').length,
    inProgress: tasksData.inProgress || tasks.filter(t => t.status === 'in_progress').length,
    completed: tasksData.completed || tasks.filter(t => t.status === 'completed').length,
    overdue: tasksData.overdue || tasks.filter(t => t.status === 'overdue').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '12px' }}>
        {[
          { label: 'Tổng nhiệm vụ', value: stats.total, color: 'var(--info)', icon: '📋' },
          { label: 'Chờ xử lý', value: stats.pending, color: 'var(--warning)', icon: '⏳' },
          { label: 'Đang làm', value: stats.inProgress, color: 'var(--info)', icon: '🔄' },
          { label: 'Hoàn thành', value: stats.completed, color: 'var(--success)', icon: '✅' },
          { label: 'Quá hạn', value: stats.overdue, color: 'var(--danger)', icon: '⚠️' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>{s.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tasks by Staff */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
          📊 Nhiệm vụ theo nhân viên
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {staffList.slice(0, 12).map(staff => {
            const staffTasks = tasks.filter(t => {
              const assigneeId = t.assignee?._id || t.assigneeId || t.assignee;
              return assigneeId === (staff.id || staff._id);
            });
            const completed = staffTasks.filter(t => t.status === 'completed').length;
            const percentage = staffTasks.length > 0 ? Math.round((completed / staffTasks.length) * 100) : 0;

            return (
              <div key={staff.id || staff._id} style={{
                padding: '14px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px',
                border: '1px solid var(--border-glass)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', flexShrink: 0
                  }}>
                    {(staff.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {staff.name || '—'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {completed}/{staffTasks.length} hoàn thành
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: percentage === 100 ? 'var(--success)' : percentage > 50 ? 'var(--info)' : 'var(--warning)',
                    borderRadius: '3px',
                    transition: 'width 0.3s'
                  }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>
                  {percentage}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tasks List */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            📝 Danh sách nhiệm vụ
          </h4>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>NHIỆM VỤ</th>
                <th>NGƯỜI PHỤ TRÁCH</th>
                <th>NGÀY BẮT ĐẦU</th>
                <th>HẠN CUỐI</th>
                <th>TRẠNG THÁI</th>
                <th>ƯU TIÊN</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length > 0 ? (
                tasks.map((task, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px', maxWidth: '300px' }}>
                        {task.title || task.name || '—'}
                      </div>
                      {task.description && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: '700', color: 'var(--text-primary)'
                        }}>
                          {(task.assignee?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{task.assignee?.name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {task.startDate ? new Date(task.startDate).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td>{getTaskStatusBadge(task.status)}</td>
                    <td>
                      {task.priority === 'high' && <span style={{ color: 'var(--danger)', fontWeight: '600', fontSize: '12px' }}>Cao</span>}
                      {task.priority === 'medium' && <span style={{ color: 'var(--warning)', fontWeight: '600', fontSize: '12px' }}>TB</span>}
                      {task.priority === 'low' && <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '12px' }}>Thấp</span>}
                      {!task.priority && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                    Chưa có nhiệm vụ nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
