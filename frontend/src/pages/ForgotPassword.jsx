import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';
import { useMediaQuery } from '../hooks/useMediaQuery';

const inputStyle = (isMobile) => ({
  width: '100%',
  padding: isMobile ? '14px 16px' : '14px 16px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--border-glass)',
  borderRadius: '8px',
  color: '#fff',
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

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!email) { setError('Email là bắt buộc'); return; }
    setLoading(true);
    try {
      const result = await forgotPassword(email);
      if (result.success) {
        setSuccess(true);
        setResetToken(result.resetToken);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message || 'Gửi yêu cầu đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Quên Mật Khẩu"
      subtitle="Nhập email của bạn để nhận token đặt lại mật khẩu."
      icon="🔑"
    >
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#ef4444',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {success ? (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <p style={{ color: '#22c55e', fontSize: '14px', marginBottom: '12px' }}>
            ✓ Token đặt lại mật khẩu đã được tạo!
          </p>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>Reset Token:</p>
            <code style={{ color: '#fff', fontSize: '13px', wordBreak: 'break-all' }}>{resetToken}</code>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            Sử dụng token này để đặt lại mật khẩu của bạn.
          </p>
          <Link
            to="/reset-password"
            state={{ token: resetToken }}
            style={{
              display: 'inline-block',
              marginTop: '12px',
              color: 'var(--primary)',
              fontSize: '14px',
              fontWeight: '600',
              textDecoration: 'none',
              minHeight: '44px',
              padding: '12px 0'
            }}
          >
            Đến trang đặt lại mật khẩu →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@diemhen.vn"
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
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              minHeight: isMobile ? '52px' : 'auto'
            }}
          >
            {loading ? 'Đang xử lý...' : 'Gửi Token'}
          </button>
          <Link
            to="/login"
            style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              textDecoration: 'none',
              padding: '12px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ← Quay lại đăng nhập
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
