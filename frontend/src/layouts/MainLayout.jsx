import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const DESKTOP_BP = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < DESKTOP_BP : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < DESKTOP_BP);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

const BOTTOM_NAV_ITEMS = {
  manager: [
    { label: 'Trang Chủ', path: '/dashboard', icon: '📊' },
    { label: 'Lịch Ca', path: '/schedule', icon: '📅' },
    { label: 'Duyệt', path: '/attendance-approval', icon: '✅' },
    { label: 'Báo Cáo', path: '/reports', icon: '📈' },
    { label: 'Khác', path: '__more__', icon: '☰' }
  ],
  staff: [
    { label: 'Trang Chủ', path: '/dashboard', icon: '📊' },
    { label: 'Chấm Công', path: '/attendance', icon: '🕒' },
    { label: 'Ca Làm', path: '/schedule', icon: '📅' },
    { label: 'Nhiệm Vụ', path: '/tasks', icon: '📋' },
    { label: 'Khác', path: '__more__', icon: '☰' }
  ]
};

export default function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, logout } = useAuth();
  const isMobile = useIsMobile();

  const [user, setUser] = useState({ name: 'Minh Nguyễn', role: 'Nhân viên Phục vụ', isAdmin: false });
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [salaryInfo, setSalaryInfo] = useState(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

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

  useEffect(() => {
    const info = localStorage.getItem('user_info');
    if (info) setUser(JSON.parse(info));
    const clockStatus = localStorage.getItem('clock_status') === 'in';
    setIsClockedIn(clockStatus);

    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Đóng drawer khi đổi route trên mobile
  useEffect(() => {
    if (isMobile) setShowDrawer(false);
  }, [location.pathname, isMobile]);

  const handleLogout = () => {
    logout().then(() => navigate('/login', { replace: true }));
  };

  const toggleClock = () => {
    const nextState = !isClockedIn;
    setIsClockedIn(nextState);
    localStorage.setItem('clock_status', nextState ? 'in' : 'out');
    window.dispatchEvent(new Event('clock_sync'));
  };

  const fetchSalaryInfo = async () => {
    if (salaryInfo) return;
    setSalaryLoading(true);
    try {
      if (user.isAdmin) {
        const data = await api.get('/salary/stats');
        if (data.success) setSalaryInfo({ isAdmin: true, stats: data.data });
      } else {
        const data = await api.get('/salary/summary');
        if (data.success && data.salary) setSalaryInfo(data.salary);
      }
    } catch {
      /* bỏ qua */
    } finally {
      setSalaryLoading(false);
    }
  };

  const handleProfileClick = () => {
    setShowProfile(!showProfile);
    if (!showProfile) fetchSalaryInfo();
  };

  const staffMenu = [
    { label: 'TRANG CHỦ', path: '/dashboard', icon: '📊' },
    { label: 'CHẤM CÔNG', path: '/attendance', icon: '🕒' },
    { label: 'LỊCH SỬ', path: '/attendance-history', icon: '📋' },
    { label: 'CA LÀM', path: '/schedule', icon: '📅' },
    { label: 'NHIỆM VỤ', path: '/tasks', icon: '📋' }
  ];

  const managerMenu = [
    { label: 'Trang Chủ', path: '/dashboard', icon: '📊' },
    { label: 'Danh Sách NV', path: '/staff-list', icon: '👥' },
    { label: 'Lịch Ca', path: '/schedule', icon: '📅' },
    { label: 'Phân Nhiệm Vụ', path: '/task-management', icon: '📋' },
    { label: 'Duyệt Chấm Công', path: '/attendance-approval', icon: '✅' },
    { label: 'Báo Cáo', path: '/reports', icon: '📊' },
    { label: 'Cài Đặt', path: '/settings', icon: '⚙️' },
    { label: 'Quản Trị Hệ Thống', path: '/system-admin', icon: '🖥️' }
  ];

  const fullMenu = user.isAdmin ? managerMenu : staffMenu;
  const bottomItems = user.isAdmin ? BOTTOM_NAV_ITEMS.manager : BOTTOM_NAV_ITEMS.staff;

  const handleBottomNav = (item) => {
    if (item.path === '__more__') {
      setShowDrawer(true);
    } else {
      navigate(item.path);
    }
  };

  const profileCard = (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--border-glass)',
      borderRadius: '10px',
      padding: '12px',
      marginTop: isMobile ? '0' : '0'
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

      {showProfile && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Thông tin lương
          </div>
          {salaryLoading ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>Đang tải...</div>
          ) : salaryInfo ? (
            user.isAdmin ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tổng NV</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>{salaryInfo.stats?.totalEmployees || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Đã thanh toán</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--success)' }}>{salaryInfo.stats?.paid || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quỹ lương</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
                    {salaryInfo.stats?.totalNet != null ? new Intl.NumberFormat('vi-VN').format(salaryInfo.stats.totalNet) + 'đ' : '—'}
                  </span>
                </div>
                <button
                  onClick={() => { navigate('/payroll'); setShowProfile(false); }}
                  style={{ marginTop: '6px', padding: '6px 10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', width: '100%' }}
                >
                  Xem chi tiết →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lương NET</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--success)' }}>
                    {salaryInfo.netSalary != null ? new Intl.NumberFormat('vi-VN').format(salaryInfo.netSalary) + 'đ' : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lương GROSS</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
                    {salaryInfo.grossSalary != null ? new Intl.NumberFormat('vi-VN').format(salaryInfo.grossSalary) + 'đ' : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tổng giờ</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff' }}>
                    {salaryInfo.totalHours != null ? salaryInfo.totalHours.toFixed(1) + 'h' : '—'}
                  </span>
                </div>
                <button
                  onClick={() => { navigate('/salary'); setShowProfile(false); }}
                  style={{ marginTop: '6px', padding: '6px 10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', width: '100%' }}
                >
                  Xem chi tiết →
                </button>
              </div>
            )
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>Chưa có dữ liệu lương</div>
          )}
        </div>
      )}

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
            cursor: 'pointer'
          }}
        >
          {isClockedIn ? '🟢 CLOCKED IN' : '🔴 CLOCK IN'}
        </button>
      )}
    </div>
  );

  const navLinks = (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {fullMenu.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: isMobile ? '14px 16px' : '12px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              background: isActive ? 'var(--primary)' : 'transparent',
              fontWeight: isActive ? '600' : '400',
              fontSize: user.isAdmin ? (isMobile ? '15px' : '14px') : (isMobile ? '14px' : '13px'),
              letterSpacing: user.isAdmin ? '0' : '0.8px',
              minHeight: '44px',
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
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const sidebarContent = (
    <>
      <div>
        <div style={{ padding: '0 8px', marginBottom: '32px', textAlign: 'left' }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: isMobile ? '18px' : '20px',
            fontWeight: '700',
            letterSpacing: '0.5px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {user.isAdmin ? (
              <span style={{ color: 'var(--primary)', fontWeight: '800' }}>ĐIỂM HẸN</span>
            ) : (
              <span style={{ fontWeight: '800' }}>ĐIỂM HẸN BILLIARDS</span>
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
        {navLinks}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {user.isAdmin && (
          <button
            className="btn-primary"
            style={{ width: '100%', padding: '12px', fontWeight: '600', fontSize: '14px', borderRadius: '8px' }}
            onClick={() => alert('Chức năng đặt bàn nhanh cho khách hàng.')}
          >
            Book Table
          </button>
        )}
        {profileCard}
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
            minHeight: '44px',
            transition: 'color var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <span>🚪</span>
          <span style={{ fontWeight: '500', letterSpacing: '0.5px' }}>{user.isAdmin ? 'Logout' : 'ĐĂNG XUẤT'}</span>
        </div>
      </div>
    </>
  );

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-main)',
      color: 'var(--text-primary)'
    }}>
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
          ⏳ Tài khoản của bạn đang chờ được quản lý duyệt.
        </div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
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
          {sidebarContent}
        </aside>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <>
          {showDrawer && (
            <div
              onClick={() => setShowDrawer(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.6)',
                zIndex: 20,
                backdropFilter: 'blur(4px)'
              }}
            />
          )}
          <aside style={{
            width: '280px',
            maxWidth: '85vw',
            background: '#0d111a',
            borderRight: '1px solid var(--border-glass)',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            zIndex: 25,
            transform: showDrawer ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowY: 'auto',
            paddingTop: 'max(24px, env(safe-area-inset-top))',
            paddingBottom: 'max(24px, env(safe-area-inset-bottom))'
          }}>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Content Area */}
      <div style={{
        flexGrow: 1,
        marginLeft: isMobile ? '0' : '260px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        paddingBottom: isMobile ? '72px' : '0'
      }}>
        {/* Top Header */}
        <header style={{
          minHeight: isMobile ? '56px' : '64px',
          borderBottom: '1px solid var(--border-glass)',
          padding: isMobile ? '0 12px' : '0 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 18, 29, 0.4)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 5,
          gap: '8px',
          paddingTop: 'env(safe-area-inset-top)'
        }}>
          {isMobile && (
            <button
              onClick={() => setShowDrawer(true)}
              aria-label="Mở menu"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '24px',
                padding: '8px',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ☰
            </button>
          )}

          {!isMobile && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              📍 Chi nhánh: <strong>Nguyễn Oanh, Gò Vấp</strong>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '20px', marginLeft: 'auto' }}>
            {!isMobile && (
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                🕒 {currentTime || '--:--:--'}
              </span>
            )}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <NotificationBell userId={user.id || user._id} />
              {!isMobile && (
                <button
                  onClick={() => navigate('/notifications')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px', minWidth: '44px', minHeight: '44px' }}
                  title="Cài đặt thông báo"
                >
                  ⚙️
                </button>
              )}
            </div>
          </div>
        </header>

        <main style={{
          flexGrow: 1,
          padding: isMobile ? '16px' : '32px 40px',
          maxWidth: '100%',
          overflowX: 'hidden'
        }}>
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '64px',
            paddingBottom: 'env(safe-area-inset-bottom)',
            background: 'rgba(13, 17, 26, 0.95)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'space-around',
            zIndex: 15
          }}>
            {bottomItems.map((item) => {
              const isActive = item.path !== '__more__' && location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleBottomNav(item)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    cursor: 'pointer',
                    padding: '6px 4px',
                    minHeight: '56px',
                    fontSize: '10px',
                    fontWeight: isActive ? '600' : '400'
                  }}
                >
                  <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
                  <span style={{ lineHeight: 1.2 }}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
