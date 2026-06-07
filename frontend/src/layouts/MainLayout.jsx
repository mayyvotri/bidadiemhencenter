import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user_info') || '{"name": "Phú Nguyễn", "role": "Quản lý Ca"}');

  const menuItems = [
    { label: '📊 Tổng quan', path: '/dashboard' },
    { label: '🕒 Điểm danh', path: '/attendance' },
    { label: '📅 Lịch trực', path: '/schedule' },
    { label: '💰 Lương bổng', path: '/salary' }
  ];

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    navigate('/login');
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-main)',
      color: 'var(--text-primary)'
    }}>
      {/* Sidebar */}
      <aside className="glass-card" style={{
        width: '260px',
        borderRadius: 0,
        borderWidth: '0 1px 0 0',
        padding: '32px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 10,
        background: 'rgba(10, 15, 30, 0.8)'
      }}>
        <div>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '16px'
            }}>
              B
            </div>
            <span style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'var(--font-heading)', letterSpacing: '0.5px' }}>
              Điểm Hẹn Staff
            </span>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'block',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    fontWeight: isActive ? '600' : '400',
                    transition: 'all var(--transition-fast)',
                    border: isActive ? '1px solid var(--primary)' : '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
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
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile and Logout */}
        <div style={{
          borderTop: '1px solid var(--border-glass)',
          paddingTop: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces'}
              alt="Avatar"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid var(--primary)',
                objectFit: 'cover'
              }}
            />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{user.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.role}</div>
            </div>
          </div>
          <button
            className="btn-secondary"
            onClick={handleLogout}
            style={{
              padding: '10px',
              fontSize: '13px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            🚪 Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{
        flexGrow: 1,
        marginLeft: '260px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Navbar */}
        <header className="glass-card" style={{
          borderRadius: 0,
          borderWidth: '0 0 1px 0',
          padding: '16px 40px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          background: 'rgba(14, 19, 31, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              📅 Hôm nay: <strong>{new Date().toLocaleDateString('vi-VN')}</strong>
            </span>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--success)',
              boxShadow: '0 0 8px var(--success)'
            }}></div>
          </div>
        </header>

        {/* Content Body */}
        <main style={{
          flexGrow: 1,
          padding: '40px',
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
