import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';
import { useMediaQuery } from '../hooks/useMediaQuery';

const inputStyle = (isMobile) => ({
  width: '100%',
  padding: '14px 16px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--border-glass)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '16px',
  outline: 'none',
  minHeight: isMobile ? '48px' : 'auto',
  boxSizing: 'border-box',
  fontFamily: 'inherit'
});

const labelStyle = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '500',
  color: 'var(--text-secondary)',
  marginBottom: '8px'
};

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [token, setToken] = useState(location.state?.token || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token) { setError('Token là bắt buộc. Vui lòng lấy token từ trang Quên mật khẩu.'); return; }
    if (newPassword.length < 6) { setError('Mật khẩu mới phải có ít nhất 6 ký tự'); return; }
    if (newPassword !== confirmPassword) { setError('Mật khẩu mới không khớp'); return; }
    setLoading(true);
    try {
      const result = await resetPassword(token, newPassword);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Đặt Lại Mật Khẩu"
      subtitle="Nhập token và mật khẩu mới để đặt lại mật khẩu của bạn."
      icon="🔓"
    >
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', color: 'var(--danger)', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {success ? (
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '16px', borderRadius: '8px' }}>
          <p style={{ color: 'var(--success-text)', fontSize: '14px', margin: 0 }}>
            ✓ Đặt lại mật khẩu thành công! Đang chuyển đến trang đăng nhập...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Reset Token</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              placeholder="Nhập token từ trang Quên mật khẩu"
              style={inputStyle(isMobile)}
            />
          </div>
          <div>
            <label style={labelStyle}>Mật khẩu mới</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Ít nhất 6 ký tự"
              style={inputStyle(isMobile)}
            />
          </div>
          <div>
            <label style={labelStyle}>Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Nhập lại mật khẩu"
              style={inputStyle(isMobile)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px',
              fontSize: '16px',
              fontWeight: '600',
              marginTop: '8px',
              background: loading ? 'rgba(225, 29, 72, 0.5)' : 'var(--primary)',
              color: 'var(--text-primary)',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              minHeight: isMobile ? '52px' : 'auto'
            }}
          >
            {loading ? 'Đang xử lý...' : 'Đặt Lại Mật Khẩu'}
          </button>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '14px', flexWrap: 'wrap' }}>
            <Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', padding: '8px 12px', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
              Đăng nhập
            </Link>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>|</span>
            <Link to="/forgot-password" style={{ color: 'var(--text-secondary)', textDecoration: 'none', padding: '8px 12px', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
              Lấy token mới
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
