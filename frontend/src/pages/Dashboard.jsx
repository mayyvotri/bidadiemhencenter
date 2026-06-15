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
    window.addEventListener('clock_sync', syncClock);

    const unsubscribe = onEvent(Events.PAYROLL_UPDATED, () => {
      syncClock();
      fetchData();
    });

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
                    <strong style={{ color: 'var(--success)' }}>ĐÃ CHẤM CÔNG (Check-in lúc 14:00)</strong>
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
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Thu nhập dự kiến</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'var(--font-heading)', color: '#fff', margin: '4px 0 8px' }}>
                    {salaryPreview ? new Intl.NumberFormat('vi-VN').format(salaryPreview.netSalary) + 'đ' : '0đ'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {salaryPreview ? `${salaryPreview.totalHours}h làm việc` : 'Chưa có dữ liệu'}
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
            Trang Chủ Quản Lý
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Quản trị hoạt động và phối hợp nhân viên ca trực.
          </p>
        </div>
        
        {/* Search & Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input 
            type="text" 
            placeholder="Search tables, staff, or transactions..." 
            className="form-input" 
            style={{ width: '280px', padding: '8px 12px', fontSize: '13px', background: 'rgba(0,0,0,0.15)' }}
          />
        </div>
      </div>

      {/* KPI Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Total Staff */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TOTAL STAFF
            </span>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff', margin: '4px 0' }}>
              {staffCount.active} <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '400' }}>/ {staffCount.total}</span>
            </div>
          </div>
          <span className="badge badge-success">{staffCount.total > 0 ? 'LIVE' : 'NO DATA'}</span>
        </div>

        {/* Active Tables */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ACTIVE TABLES
            </span>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff', margin: '4px 0' }}>
              {tableStats.occupied} <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '400' }}>/ {tableStats.total}</span>
            </div>
          </div>
          <span className="badge badge-success">{tableStats.total > 0 ? 'LIVE' : 'NO DATA'}</span>
        </div>

        {/* Shift Revenue */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              SHIFT REVENUE
            </span>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff', margin: '4px 0' }}>
              0 <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>VND</span>
            </div>
          </div>
          <span className="badge badge-muted">NO DATA</span>
        </div>

        {/* Ambient Banner */}
        <div className="glass-card" style={{
          background: 'linear-gradient(rgba(15, 18, 29, 0.8), rgba(15, 18, 29, 0.9)), url("https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=300&h=200&fit=crop")',
          backgroundSize: 'cover',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          border: '1px solid rgba(59, 130, 246, 0.15)'
        }}>
          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', margin: 0 }}>
            Elite Ambience
          </h4>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Current Peak: High
          </span>
        </div>
      </div>

      {/* Main Grid: Tables & Staff List vs Alerts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '3fr 1.3fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Column Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Table Management Board */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff' }}>
                Table Management
              </h3>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></span> Occupied
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)' }}></span> Available
                </span>
              </div>
            </div>

            {/* Tables Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: '12px'
            }}>
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
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff' }}>
                Shift Staff
              </h3>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => navigate('/staff-list')}>
                MANAGE ROSTER
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>EMPLOYEE</th>
                    <th>POSITION</th>
                    <th>SHIFT START</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
                      <div style={{ fontSize: '14px' }}>Chưa có nhân viên nào trong ca</div>
                      <div style={{ fontSize: '12px', marginTop: '8px' }}>Nhân viên sẽ xuất hiện khi được phân công</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Critical Alerts */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
              ⚠️ Critical Alerts
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {swapPending > 0 ? (
                <div style={{
                  padding: '12px', background: 'rgba(225, 29, 72, 0.05)',
                  border: '1px solid rgba(225, 29, 72, 0.2)', borderRadius: '8px',
                  cursor: 'pointer'
                }} onClick={() => navigate('/schedule')}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)' }}>
                    {swapPending} yêu cầu đổi ca chờ duyệt
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Nhấn để xem chi tiết</div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔔</div>
                  <div style={{ fontSize: '13px' }}>Không có thông báo</div>
                </div>
              )}
            </div>
            <button className="btn-secondary" style={{ width: '100%', fontSize: '12px', padding: '8px', marginTop: '16px' }} onClick={() => navigate('/schedule')}>
              Quản lý đổi ca
            </button>
          </div>

          {/* Quick Actions Grid */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
              Quick Actions
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button className="btn-secondary" style={{ padding: '12px 6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={() => navigate('/staff-list')}>
                <span>👥</span>
                <span>Add Staff</span>
              </button>
              <button className="btn-secondary" style={{ padding: '12px 6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={() => navigate('/schedule')}>
                <span>📅</span>
                <span>Set Roster</span>
              </button>
              <button className="btn-secondary" style={{ padding: '12px 6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={() => alert('Đang xuất báo cáo doanh số ca trực.')}>
                <span>📊</span>
                <span>Reports</span>
              </button>
              <button className="btn-secondary" style={{ padding: '12px 6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={() => alert('Hệ thống kiểm kê kho.')}>
                <span>📦</span>
                <span>Stock Count</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );

  return user.isAdmin ? renderManagerDashboard() : renderStaffPortal();
}
