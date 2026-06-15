import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 767px)');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        if (result.user.mustChangePassword) {
          navigate('/change-password');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const formPanel = (
    <div style={{
      flex: isMobile ? '1' : '0 0 50%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: isMobile ? '24px 20px' : '60px 80px',
      maxWidth: isMobile ? '100%' : '50%',
      background: '#0d111a',
      width: '100%',
      minHeight: isMobile ? '100vh' : 'auto',
      paddingTop: isMobile ? 'max(24px, env(safe-area-inset-top))' : '60px',
      paddingBottom: isMobile ? 'max(24px, env(safe-area-inset-bottom))' : '60px'
    }}>
      {/* Logo */}
      <div style={{ marginBottom: isMobile ? '24px' : '40px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '8px'
        }}>
          <div style={{
            width: isMobile ? '40px' : '48px',
            height: isMobile ? '40px' : '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #e11d48, #be123c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '16px' : '20px',
            fontWeight: 'bold',
            color: '#fff',
            fontFamily: 'var(--font-heading)',
            flexShrink: 0
          }}>
            ĐH
          </div>
          <span style={{
            fontSize: isMobile ? '18px' : '24px',
            fontWeight: '700',
            color: '#fff',
            fontFamily: 'var(--font-heading)'
          }}>
            Điểm Hẹn Billiards
          </span>
        </div>
      </div>

      {/* Welcome Message */}
      <div style={{ marginBottom: isMobile ? '24px' : '40px' }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: isMobile ? '28px' : '42px',
          fontWeight: '700',
          color: '#fff',
          marginBottom: isMobile ? '12px' : '16px',
          lineHeight: '1.2'
        }}>
          Chào mừng trở lại
        </h1>
        <p style={{
          fontSize: isMobile ? '14px' : '16px',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          maxWidth: '420px',
          margin: 0
        }}>
          Quản lý câu lạc bộ của bạn một cách chính xác. Đăng nhập vào cổng dành cho nhân viên.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '24px',
          color: '#f87171',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin}>
        {/* Email Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--text-secondary)',
            marginBottom: '8px'
          }}>
            Email công việc
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '18px',
              color: 'var(--text-muted)',
              pointerEvents: 'none'
            }}>
              ✉️
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@diemhen.vn"
              required
              style={{
                width: '100%',
                padding: isMobile ? '14px 16px 14px 48px' : '14px 16px 14px 48px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                outline: 'none',
                minHeight: isMobile ? '48px' : 'auto',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(225, 29, 72, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-glass)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Password Input */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--text-secondary)',
            marginBottom: '8px'
          }}>
            Mật khẩu
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '18px',
              color: 'var(--text-muted)',
              pointerEvents: 'none'
            }}>
              🔒
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '14px 16px 14px 48px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                outline: 'none',
                minHeight: isMobile ? '48px' : 'auto',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(225, 29, 72, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-glass)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          <div style={{ textAlign: 'right', marginTop: '8px' }}>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '13px',
                cursor: 'pointer',
                minHeight: '44px',
                padding: '8px'
              }}
              onClick={() => navigate('/forgot-password')}
            >
              Quên mật khẩu?
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px' }}>
          <input
            type="checkbox"
            id="remember"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            style={{
              width: '20px',
              height: '20px',
              cursor: 'pointer',
              accentColor: 'var(--primary)'
            }}
          />
          <label htmlFor="remember" style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}>
            Ghi nhớ đăng nhập
          </label>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: isMobile ? '16px' : '16px',
            background: loading ? 'rgba(225, 29, 72, 0.5)' : 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            minHeight: isMobile ? '52px' : 'auto',
            fontFamily: 'var(--font-heading)'
          }}
          onMouseOver={(e) => {
            if (!loading) e.target.style.background = 'var(--primary-hover)';
          }}
          onMouseOut={(e) => {
            if (!loading) e.target.style.background = 'var(--primary)';
          }}
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập vào Dashboard →'}
        </button>
      </form>

      {/* Sign Up Link */}
      <div style={{ marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Chưa có tài khoản?{' '}
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            padding: '4px 8px',
            minHeight: '44px'
          }}
          onClick={() => navigate('/register')}
        >
          Đăng ký ngay
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      minHeight: '100vh',
      background: '#0d111a'
    }}>
      {formPanel}

      {/* Right Panel - Ẩn trên mobile */}
      {!isMobile && (
        <div style={{
          flex: 1,
          position: 'relative',
          background: 'url("https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=1920&h=1080&fit=crop") center/cover',
          minHeight: '100vh'
        }}>
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)'
          }}></div>

          <div style={{
            position: 'absolute',
            bottom: '80px',
            left: '80px',
            right: '80px',
            background: 'rgba(13, 17, 26, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '500px'
          }}>
            <div style={{
              width: '48px', height: '48px',
              borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              fontSize: '24px'
            }}>
              ⭐
            </div>
            <blockquote style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#fff',
              fontFamily: 'var(--font-heading)',
              marginBottom: '24px',
              lineHeight: '1.4'
            }}>
              "Chính xác trong quản lý. Đẳng cấp trong từng đường cơ."
            </blockquote>
            <div style={{ width: '60px', height: '2px', background: 'var(--primary)', marginBottom: '24px' }}></div>
            <div style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              fontWeight: '600',
              marginBottom: '32px'
            }}>
              TIÊU CHUẨN ĐIỂM HẸN BILLIARDS
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                'https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=200&h=150&fit=crop',
                'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&h=150&fit=crop',
                'https://images.unsplash.com/photo-1578849917418-4b8b4c5c1a0f?w=200&h=150&fit=crop'
              ].map((url, i) => (
                <div key={i} style={{
                  width: '80px', height: '60px',
                  borderRadius: '8px',
                  background: `url("${url}") center/cover`,
                  border: '2px solid rgba(255, 255, 255, 0.1)'
                }}></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
