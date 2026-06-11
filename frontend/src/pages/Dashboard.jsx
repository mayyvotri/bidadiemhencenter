import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getTaskId } from '../services/api';
import { payrollApi } from '../services/api';
import { onEvent, Events } from '../utils/events';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: '', role: '', isAdmin: false });
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0, highPriority: 0 });
  const [tableStats, setTableStats] = useState({ total: 0, occupied: 0, available: 0 });
  const [tables, setTables] = useState([]);
  const [staffCount, setStaffCount] = useState({ total: 0, active: 0 });
  const [salaryPreview, setSalaryPreview] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState(null);
  const [swapPending, setSwapPending] = useState(0);
  const [payrollStats, setPayrollStats] = useState({ totalEmployees: 0, totalNet: 0, paid: 0, draft: 0 });

  // Sync state with MainLayout or storage + fetch from server
  const syncClock = async () => {
    const info = localStorage.getItem('user_info');
    if (info) {
      const userInfo = JSON.parse(info);
      setUser(userInfo);
    }
    setIsClockedIn(localStorage.getItem('clock_status') === 'in');

    // Fetch today's attendance status from server
    try {
      const todayStatus = await api.get('/attendance/today-status');
      if (todayStatus.success) {
        localStorage.setItem('clock_status', todayStatus.isClockedIn ? 'in' : 'out');
        setIsClockedIn(todayStatus.isClockedIn);
        // Also store check-in time for display
        if (todayStatus.checkInTime) {
          const checkInDate = new Date(todayStatus.checkInTime);
          const timeStr = checkInDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          localStorage.setItem('clock_checkin_time', timeStr);
        }
      }
    } catch (err) {
      console.log('[Dashboard] Could not fetch attendance status:', err.message);
    }
  };

  useEffect(() => {
    syncClock();
    
    // Listen for clock sync events from other components
    window.addEventListener('clock_sync', syncClock);

    // Listen for attendance updates from other pages
    const unsubscribe = onEvent(Events.PAYROLL_UPDATED, () => {
      syncClock();
      fetchData();
    });

    // Poll for attendance status every 30 seconds
    const pollInterval = setInterval(syncClock, 30000);

    const fetchData = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        if (userInfo.name) {
          const taskData = await api.get(`/tasks?assignedTo=${encodeURIComponent(userInfo.name)}`);
          if (taskData.success) setTasks(taskData.data.slice(0, 3));
          const statsData = await api.get('/tasks/stats');
          if (statsData.success) setTaskStats(statsData.stats);
        }
        if (userInfo.isAdmin) {
          const [staffData, tableData, statsData, swapsData, payrollData] = await Promise.all([
            api.get('/staff'),
            api.get('/tables'),
            api.get('/tables/stats/overview'),
            api.get('/schedule/swaps'),
            payrollApi.getPayrollStats()
          ]);
          if (staffData.success) {
            setStaffCount({
              total: staffData.data.length,
              active: staffData.data.filter(s => s.status === 'Đang làm').length
            });
          }
          if (tableData.success) setTables(tableData.data);
          if (statsData.success) setTableStats(statsData.data);
          if (swapsData.success) setSwapPending(swapsData.pendingCount || 0);
          if (payrollData.success) setPayrollStats(payrollData.data);
        } else {
          try {
            const salaryData = await api.get('/salary/summary');
            if (salaryData.success) setSalaryPreview(salaryData.salary);
            
            // Fetch attendance history for staff
            const attendanceData = await payrollApi.getAttendanceHistory();
            if (attendanceData.success) setAttendanceHistory(attendanceData.data);
          } catch { /* salary optional for staff */ }
        }
      } catch {
        setTasks([]);
      }
    };

    fetchData();
    
    return () => {
      window.removeEventListener('clock_sync', syncClock);
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  const handleClockToggle = (state) => {
    localStorage.setItem('clock_status', state ? 'in' : 'out');
    setIsClockedIn(state);
    window.dispatchEvent(new Event('clock_sync'));
  };

  const toggleTask = async (task) => {
    const id = getTaskId(task);
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const data = await api.patch(`/tasks/${id}/status`, { status: newStatus });
      if (data.success) {
        setTasks(tasks.map(t => getTaskId(t) === id ? data.data : t));
      }
    } catch { /* silent on dashboard preview */ }
  };

  // ----------------------------------------------------
  // 1. STAFF PORTAL VIEW (Image 1)
  // ----------------------------------------------------
  const renderStaffPortal = () => (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700' }}>
          Bảng điều khiển
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Tìm kiếm nhiệm vụ..." 
            className="form-input" 
            style={{ width: '220px', padding: '6px 12px', fontSize: '13px', background: 'rgba(0,0,0,0.15)' }}
          />
        </div>
      </div>

      {/* Grid Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '3fr 1.3fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Greeting Box */}
          <div className="glass-card" style={{
            background: 'linear-gradient(135deg, rgba(22, 28, 45, 0.95), rgba(15, 18, 29, 0.95))',
            borderLeft: '4px solid var(--primary)',
            padding: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Chào buổi chiều, {user.name.split(' ')[0]}!
              </span>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: '700', marginTop: '4px', color: '#fff' }}>
                Sẵn sàng cho ca tối chưa?
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span style={{ color: isClockedIn ? 'var(--success)' : 'var(--text-muted)' }}>
                  {isClockedIn ? '✓' : '●'}
                </span>
                <span>
                  Bạn hiện đang {isClockedIn ? (
                    <strong style={{ color: 'var(--success)' }}>ĐÃ CHẤM CÔNG (Check-in lúc {localStorage.getItem('clock_checkin_time') || '--:--'})</strong>
                  ) : (
                    <strong style={{ color: 'var(--text-muted)' }}>CHƯA CHẤM CÔNG (Ngoại tuyến)</strong>
                  )}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => handleClockToggle(true)}
                style={{
                  background: isClockedIn ? 'rgba(255,255,255,0.02)' : 'var(--primary)',
                  color: isClockedIn ? 'var(--text-muted)' : '#fff',
                  border: isClockedIn ? '1px solid var(--border-glass)' : 'none',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: isClockedIn ? 'default' : 'pointer'
                }}
                disabled={isClockedIn}
              >
                ➔ CHẤM CÔNG VÀO
              </button>
              <button 
                onClick={() => handleClockToggle(false)}
                style={{
                  background: !isClockedIn ? 'rgba(255,255,255,0.02)' : 'transparent',
                  color: !isClockedIn ? 'var(--text-muted)' : '#fff',
                  border: '1px solid var(--border-glass)',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: !isClockedIn ? 'default' : 'pointer'
                }}
                disabled={!isClockedIn}
              >
                ← CHẤM CÔNG RA
              </button>
            </div>
          </div>

          {/* Cards Row: Next Shift & Revenue */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Shift Card */}
            <div className="glass-card" style={{ padding: '20px', position: 'relative' }}>
              <span className="badge" style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(225, 29, 72, 0.15)', color: 'var(--primary)', fontSize: '11px' }}>
                Ca tiếp theo
              </span>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📅</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Chưa có ca được giao</div>
              <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'var(--font-heading)', color: '#fff', margin: '4px 0 8px' }}>
                --
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                📍 Liên hệ quản lý để được phân công
              </div>
            </div>

            {/* Projected Salary Card */}
            <div className="glass-card" style={{ padding: '20px', position: 'relative' }}>
              <span className="badge" style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '11px' }}>
                Tháng {payrollStats.month}/{payrollStats.year}
              </span>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>💵</div>
              {user.isAdmin ? (
                <>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Quỹ lương tháng này</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'var(--font-heading)', color: 'var(--success)', margin: '4px 0 8px' }}>
                    {payrollStats.totalEmployees > 0 ? new Intl.NumberFormat('vi-VN').format(payrollStats.totalNet) + 'đ' : 'Chưa tính'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {payrollStats.totalEmployees} nhân viên · {payrollStats.paid} đã thanh toán
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Lương tháng này</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'var(--font-heading)', color: '#fff', margin: '4px 0 8px' }}>
                    {attendanceHistory ? new Intl.NumberFormat('vi-VN').format(attendanceHistory.summary.grossSalary) + 'đ' : salaryPreview ? new Intl.NumberFormat('vi-VN').format(salaryPreview.netSalary) + 'đ' : '0đ'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {attendanceHistory ? `${attendanceHistory.summary.totalHoursWorked}h làm việc · ${attendanceHistory.summary.totalDaysWorked} ngày` : salaryPreview ? `${salaryPreview.totalHours}h làm việc` : 'Chưa có dữ liệu'}
                  </div>
                </>
              )}
            </div>

          </div>

          {/* Tasks List Box */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff' }}>
                Nhiệm vụ được giao
              </h3>
              <span style={{ fontSize: '13px', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                Xem tất cả
              </span>
            </div>
            
            <div>
              {tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                  <div style={{ fontSize: '14px' }}>Chưa có nhiệm vụ nào được giao</div>
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>Nhiệm vụ sẽ xuất hiện ở đây khi được phân công</div>
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task._id || task.id} className={`task-item ${task.status === 'completed' ? 'completed' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div 
                        className="task-checkbox" 
                        onClick={() => toggleTask(task)}
                      >
                        {task.status === 'completed' && <span style={{ color: 'white', fontSize: '11px' }}>✓</span>}
                      </div>
                      <span className="task-title" style={{ color: task.status === 'completed' ? 'var(--text-muted)' : '#fff' }}>
                        {task.title} - {task.deadline}
                      </span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer' }}>⋮</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Table statuses */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
              Trạng thái bàn hiện tại
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '14px 10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--success)' }}>{tableStats.available || '-'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>Trống</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '14px 10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>{tableStats.occupied || '-'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>Đang chơi</div>
              </div>
            </div>
            <button className="btn-secondary" style={{ width: '100%', fontSize: '13px', padding: '10px' }} onClick={() => alert('Chi tiết sơ đồ bàn.')}>
              CHI TIẾT BÀN
            </button>
          </div>

          {/* Notifications Panel */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
              Thông báo gần đây
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔔</div>
                <div style={{ fontSize: '13px' }}>Chưa có thông báo nào</div>
              </div>
            </div>

            <button className="btn-secondary" style={{ width: '100%', fontSize: '13px', padding: '10px' }}>
              XEM TẤT CẢ THÔNG BÁO
            </button>
          </div>

          {/* Banner Promo */}
          <div className="glass-card" style={{
            background: 'linear-gradient(rgba(225, 29, 72, 0.1), rgba(15, 18, 29, 0.9)), url("https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&h=200&fit=crop")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid rgba(225, 29, 72, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            justifyContent: 'flex-end',
            minHeight: '160px'
          }}>
            <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
              CƠ HỘI THĂNG TIẾN
            </span>
            <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', margin: 0 }}>
              Tuyển Trưởng ca mới
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Đăng ký phỏng vấn nội bộ trước 31/10.
            </p>
          </div>

        </div>
      </div>
    </div>
  );

  // ----------------------------------------------------
  // 2. MANAGER DASHBOARD VIEW (Image 2)
  // ----------------------------------------------------
  const renderManagerDashboard = () => (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Quản trị hoạt động và phối hợp nhân viên ca trực.
          </p>
        </div>

        {/* Search & Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '13px' }} onClick={() => navigate('/tasks')}>
            ➕ Tạo Nhiệm Vụ
          </button>
      </div>

      {/* KPI Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {/* Total Staff */}
        <div className="glass-card" style={{ padding: '16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '18px' }}>👥</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng nhân viên</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>
            {staffCount.active} <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '400' }}>/ {staffCount.total}</span>
          </div>
        </div>

        {/* Active Tables */}
        <div className="glass-card" style={{ padding: '16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '18px' }}>🎱</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bàn đang dùng</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>
            {tableStats.occupied} <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '400' }}>/ {tableStats.total}</span>
          </div>
        </div>

        {/* Task: Tổng */}
        <div className="glass-card" style={{ padding: '16px 14px', cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '18px' }}>📋</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng nhiệm vụ</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff' }}>{taskStats.total}</div>
        </div>

        {/* Task: Đang thực hiện */}
        <div className="glass-card" style={{ padding: '16px 14px', cursor: 'pointer', border: taskStats.inProgress > 0 ? '1px solid rgba(96,165,250,0.3)' : '' }} onClick={() => navigate('/tasks')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚙️</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Đang thực hiện</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#60a5fa' }}>{taskStats.inProgress}</div>
        </div>

        {/* Task: Quá hạn */}
        <div className="glass-card" style={{ padding: '16px 14px', cursor: 'pointer', border: taskStats.overdue > 0 ? '1px solid rgba(239,68,68,0.3)' : '' }} onClick={() => navigate('/tasks')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quá hạn</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: taskStats.overdue > 0 ? '#ef4444' : '#10b981' }}>{taskStats.overdue}</div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Task Board Preview */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff' }}>📋 Nhiệm vụ tuần này</h3>
              <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => navigate('/tasks')}>
                Xem chi tiết →
              </button>
            </div>

            {/* Task mini stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Chưa thực hiện', value: taskStats.pending, color: '#f59e0b' },
                { label: 'Đang thực hiện', value: taskStats.inProgress, color: '#60a5fa' },
                { label: 'Hoàn thành', value: taskStats.completed, color: '#10b981' },
                { label: 'Quá hạn', value: taskStats.overdue, color: '#ef4444' },
              ].map(s => (
                <div key={s.label} style={{ padding: '10px', background: `${s.color}12`, borderRadius: '8px', textAlign: 'center', border: `1px solid ${s.color}30` }}>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Task list preview */}
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>📋</div>
                <div>Chưa có nhiệm vụ nào</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tasks.slice(0, 5).map(task => {
                  const pColor = task.priority === 'urgent' ? '#ef4444' : task.priority === 'high' ? '#f97316' : task.priority === 'medium' ? '#eab308' : '#6b7280';
                  const sColor = task.status === 'completed' ? '#10b981' : task.status === 'in_progress' ? '#60a5fa' : '#f59e0b';
                  return (
                    <div key={getTaskId(task)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                      onClick={() => navigate('/tasks')}>
                      <input type="checkbox" checked={task.status === 'completed'}
                        onChange={(e) => { e.stopPropagation(); toggleTask(task); }}
                        onClick={e => e.stopPropagation()}
                        style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }} />
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                          {task.title}
                        </div>
                        {task.assignedTo && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>👤 {task.assignedTo}</div>
                        )}
                      </div>
                      {task.deadline && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>🕐 {task.deadline}</span>
                      )}
                      <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '600', color: sColor, background: `${sColor}15`, flexShrink: 0 }}>
                        {task.status === 'pending' ? 'Chờ' : task.status === 'in_progress' ? 'Đang' : 'Xong'}
                      </span>
                    </div>
                  );
                })}
                {tasks.length > 5 && (
                  <button className="btn-secondary" style={{ padding: '8px', fontSize: '12px', marginTop: '4px' }} onClick={() => navigate('/tasks')}>
                    + Xem thêm {tasks.length - 5} nhiệm vụ khác
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Table Management Board */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff' }}>Table Management</h3>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span> Occupied
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)' }}></span> Available
                </span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
              {tables.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎱</div>
                  <div style={{ fontSize: '14px' }}>Chưa có bàn nào được thêm</div>
                </div>
              ) : tables.map(table => (
                <div key={table.id} style={{
                  background: table.status === 'Occupied' ? 'rgba(225, 29, 72, 0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${table.status === 'Occupied' ? 'var(--primary)' : 'var(--border-glass)'}`,
                  borderRadius: '8px', padding: '16px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{table.id}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{table.type || 'STD'}</div>
                  <div style={{ fontSize: '10px', color: table.status === 'Occupied' ? 'var(--primary)' : 'var(--success)', marginTop: '6px', fontWeight: '600' }}>
                    {table.status === 'Occupied' ? 'Đang chơi' : 'Trống'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Shift Staff */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff' }}>Shift Staff</h3>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => navigate('/staff-list')}>
                MANAGE ROSTER
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>👥</div>
              <div style={{ fontSize: '13px' }}>Chưa có nhân viên nào trong ca</div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>Nhân viên sẽ xuất hiện khi được phân công</div>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Critical Alerts */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
              ⚠️ Thông báo
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {taskStats.overdue > 0 && (
                <div style={{ padding: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#ef4444' }}>⚠️ {taskStats.overdue} nhiệm vụ quá hạn</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Cần xử lý ngay</div>
                </div>
              )}
              {taskStats.highPriority > 0 && (
                <div style={{ padding: '10px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '8px', cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#f97316' }}>🔥 {taskStats.highPriority} nhiệm vụ ưu tiên cao</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Cần hoàn thành sớm</div>
                </div>
              )}
              {swapPending > 0 && (
                <div style={{ padding: '10px', background: 'rgba(225, 29, 72, 0.05)', border: '1px solid rgba(225, 29, 72, 0.2)', borderRadius: '8px', cursor: 'pointer' }} onClick={() => navigate('/schedule')}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)' }}>🔄 {swapPending} yêu cầu đổi ca chờ duyệt</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Nhấn để xem chi tiết</div>
                </div>
              )}
              {taskStats.overdue === 0 && taskStats.highPriority === 0 && swapPending === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
                  <div style={{ fontSize: '12px' }}>Mọi thứ đang ổn định</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
              ⚡ Thao tác nhanh
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { icon: '📋', label: 'Tạo nhiệm vụ', path: '/tasks', color: '#60a5fa' },
                { icon: '👥', label: 'Quản lý nhân viên', path: '/staff-list', color: '#a855f7' },
                { icon: '📅', label: 'Xếp lịch ca', path: '/schedule', color: '#10b981' },
                { icon: '✅', label: 'Duyệt chấm công', path: '/attendance-approval', color: '#f59e0b' },
              ].map(action => (
                <button key={action.path} className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', fontSize: '13px', justifyContent: 'flex-start' }}
                  onClick={() => navigate(action.path)}>
                  <span style={{ fontSize: '16px' }}>{action.icon}</span>
                  <span style={{ color: action.color, fontWeight: '600' }}>{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Task: Ưu tiên cao */}
          {taskStats.highPriority > 0 && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '14px' }}>
                🔥 Nhiệm vụ ưu tiên cao
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tasks.filter(t => ['urgent', 'high'].includes(t.priority) && t.status !== 'completed').slice(0, 3).map(task => (
                  <div key={getTaskId(task)} style={{ padding: '10px 12px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '8px', cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#f97316', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      👤 {task.assignedTo || '—'} {task.deadline ? `· 🕐 ${task.deadline}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  return user.isAdmin ? renderManagerDashboard() : renderStaffPortal();
}
