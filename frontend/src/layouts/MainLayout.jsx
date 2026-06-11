import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, logout } = useAuth();
  const [user, setUser] = useState({ name: 'Minh Nguyễn', role: 'Nhân viên Phục vụ', isAdmin: false });
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [salaryInfo, setSalaryInfo] = useState(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

  // Sync auth user into local state
  useEffect(() => {
    if (authUser) {
      const info = { ...authUser, name: authUser.name, role: authUser.role };
      setUser(info);
      localStorage.setItem('user_info', JSON.stringify(info));
    } else {
      const info = localStorage.getItem('user_info');
      if (info) setUser(JSON.parse(info));
    }
  }, [authUser]);

  // Load user info and clock status on mount
  useEffect(() => {
    const info = localStorage.getItem('user_info');
    if (info) {
      setUser(JSON.parse(info));
    }
    const clockStatus = localStorage.getItem('clock_status') === 'in';
    setIsClockedIn(clockStatus);

    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout().then(() => {
      navigate('/login', { replace: true });
    });
  };

  const toggleClock = () => {
    const nextState = !isClockedIn;
    setIsClockedIn(nextState);
    localStorage.setItem('clock_status', nextState ? 'in' : 'out');
    
    // Custom event to sync check-in status across components
    window.dispatchEvent(new Event('clock_sync'));
  };

  const fetchSalaryInfo = async () => {
    if (salaryInfo) return;
    setSalaryLoading(true);
    try {
      if (user.isAdmin) {
        // Admin: get payroll stats
        const data = await api.get('/salary/stats');
        if (data.success) {
          setSalaryInfo({ isAdmin: true, stats: data.data });
        }
      } else {
        // Staff: get personal salary summary
        const data = await api.get('/salary/summary');
        if (data.success && data.salary) {
          setSalaryInfo(data.salary);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setSalaryLoading(false);
    }
  };

  const handleProfileClick = () => {
    setShowProfile(!showProfile);
    if (!showProfile) fetchSalaryInfo();
  };

  // Menu options based on role
  const staffMenu = [
    { label: 'DASHBOARD', path: '/dashboard', icon: '📊' },
    { label: 'ATTENDANCE', path: '/attendance', icon: '🕒' },
    { label: 'HISTORY', path: '/attendance-history', icon: '📋' },
    { label: 'SHIFTS', path: '/schedule', icon: '📅' },
    { label: 'TASKS', path: '/tasks', icon: '📋' }
  ];

  const managerMenu = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Staff List', path: '/staff-list', icon: '👥' },
    { label: 'Shift Schedule', path: '/schedule', icon: '📅' },
    { label: 'Duyệt Chấm Công', path: '/attendance-approval', icon: '✅' },
    { label: 'Báo cáo', path: '/reports', icon: '📊' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
    { label: 'System Admin', path: '/system-admin', icon: '🖥️' }
  ];

  const menu = user.isAdmin ? managerMenu : staffMenu;

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-main)',
      color: 'var(--text-primary)'
    }}>
      {/* Pending Approval Warning Banner */}
      {user?.approvalStatus === 'pending' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(234, 179, 8, 0.95)',
          color: '#1a1a1a',
          padding: '10px 16px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: '600',
          backdropFilter: 'blur(8px)'
        }}>
          ⏳ Tài khoản của bạn đang chờ được quản lý duyệt. Một số chức năng có thể bị hạn chế.
        </div>
      )}

      {/* Sidebar */}
      <aside style={{
        width: '260px',
        background: '#0d111a',
        borderRight: '1px solid var(--border-glass)',
        padding: '28px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 10
      }}>
        <div>
          {/* Logo Section */}
          <div style={{ padding: '0 8px', marginBottom: '32px', textAlign: 'left' }}>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '20px',
              fontWeight: '700',
              letterSpacing: '0.5px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {user.isAdmin ? (
                <>
                  <span style={{ color: 'var(--primary)', fontWeight: '800' }}>ĐIỂM HẸN</span>
                </>
              ) : (
                <>
                  <span style={{ fontWeight: '800' }}>ĐIỂM HẸN BILLIARDS</span>
                </>
              )}
            </h2>
            <div style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginTop: '2px'
            }}>
              {user.isAdmin ? 'Billiards Center' : 'Staff Portal'}
            </div>
          </div>

          {/* Navigation links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {menu.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    fontWeight: isActive ? '600' : '400',
                    fontSize: user.isAdmin ? '14px' : '13px',
                    letterSpacing: user.isAdmin ? '0' : '0.8px',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer - Roles Specific */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Manager Specific: Book Table Action */}
          {user.isAdmin && (
            <button 
              className="btn-primary" 
              style={{
                width: '100%',
                padding: '12px',
                fontWeight: '600',
                fontSize: '14px',
                borderRadius: '8px'
              }}
              onClick={() => alert('Chức năng đặt bàn nhanh cho khách hàng.')}
            >
              Book Table
            </button>
          )}

          {/* User profile card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-glass)',
            borderRadius: '10px',
            padding: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={handleProfileClick}>
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces'}
                alt="Avatar"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '6px',
                  objectFit: 'cover',
                  border: user.isAdmin ? 'none' : '2px solid var(--primary)'
                }}
              />
              <div style={{ textAlign: 'left', flexGrow: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.role}
                </div>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: showProfile ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </div>

            {/* Profile dropdown */}
            {showProfile && (
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-glass)'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Thông tin lương
                </div>
                {salaryLoading ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>Đang tải...</div>
                ) : salaryInfo ? (
                  user.isAdmin ? (
                    // Admin: show summary stats
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tổng NV</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
                          {salaryInfo.stats?.totalEmployees || 0}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Đã thanh toán</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--success)' }}>
                          {salaryInfo.stats?.paid || 0}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quỹ lương</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
                          {salaryInfo.stats?.totalNet != null ? new Intl.NumberFormat('vi-VN').format(salaryInfo.stats.totalNet) + 'đ' : '—'}
                        </span>
                      </div>
                      <button
                        onClick={() => { navigate('/payroll'); setShowProfile(false); }}
                        style={{
                          marginTop: '6px',
                          padding: '6px 10px',
                          background: 'var(--primary)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          width: '100%',
                          letterSpacing: '0.3px'
                        }}
                      >
                        Xem chi tiết →
                      </button>
                    </div>
                  ) : (
                    // Staff: show personal salary
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lương NET</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--success)' }}>
                          {salaryInfo.netSalary != null ? new Intl.NumberFormat('vi-VN').format(salaryInfo.netSalary) + 'đ' : '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lương GROSS</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
                          {salaryInfo.grossSalary != null ? new Intl.NumberFormat('vi-VN').format(salaryInfo.grossSalary) + 'đ' : '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tổng giờ</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
                          {salaryInfo.totalHours != null ? salaryInfo.totalHours.toFixed(1) + 'h' : '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tháng</span>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
                          {salaryInfo.month ? `${salaryInfo.month}/${salaryInfo.year || new Date().getFullYear()}` : '—'}
                        </span>
                      </div>
                      <button
                        onClick={() => { navigate('/salary'); setShowProfile(false); }}
                        style={{
                          marginTop: '6px',
                          padding: '6px 10px',
                          background: 'var(--primary)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          width: '100%',
                          letterSpacing: '0.3px'
                        }}
                      >
                        Xem chi tiết →
                      </button>
                    </div>
                  )
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
                    Chưa có dữ liệu lương
                  </div>
                )}
              </div>
            )}

            {/* Staff Specific: Clock In / Clock Out Button */}
            {!user.isAdmin && (
              <button 
                onClick={toggleClock}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '8px',
                  background: isClockedIn ? 'rgba(16, 185, 129, 0.15)' : 'var(--primary)',
                  color: isClockedIn ? '#34d399' : '#fff',
                  border: isClockedIn ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {isClockedIn ? '🟢 CLOCKED IN' : '🔴 CLOCK IN'}
              </button>
            )}
          </div>

          {/* Logout line */}
          <div 
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              justifyContent: 'flex-start',
              transition: 'color var(--transition-fast)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <span>🚪</span>
            <span style={{ fontWeight: '500', letterSpacing: '0.5px' }}>
              {user.isAdmin ? 'Logout' : 'ĐĂNG XUẤT'}
            </span>
          </div>

        </div>
      </aside>

      {/* Content Area */}
      <div style={{
        flexGrow: 1,
        marginLeft: '260px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Top Header */}
        <header style={{
          height: '64px',
          borderBottom: '1px solid var(--border-glass)',
          padding: '0 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 18, 29, 0.4)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 5
        }}>
          {/* Left info or Breadcrumbs */}
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            📍 Chi nhánh: <strong>Nguyễn Oanh, Gò Vấp</strong>
          </div>

          {/* Right quick controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              🕒 {currentTime || '--:--:--'}
            </span>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <NotificationBell userId={user.id || user._id} />
              <button
                onClick={() => navigate('/notifications')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px' }}
                title="Cài đặt thông báo"
              >
                ⚙️
              </button>
            </div>
          </div>
        </header>

        {/* Content body */}
        <main style={{
          flexGrow: 1,
          padding: '32px 40px'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
