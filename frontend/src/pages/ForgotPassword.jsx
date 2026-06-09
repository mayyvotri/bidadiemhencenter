import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Email là bắt buộc');
      return;
    }

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
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '32px', textAlign: 'left' }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', marginBottom: '8px', color: '#fff' }}>
        Quên Mật Khẩu
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Nhập email của bạn để nhận token đặt lại mật khẩu.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: '#ef4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {success ? (
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          <p style={{ color: '#22c55e', fontSize: '14px', marginBottom: '12px' }}>
            Token đặt lại mật khẩu đã được tạo!
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
            style={{ display: 'inline-block', marginTop: '12px', color: 'var(--primary)', fontSize: '14px', textDecoration: 'none' }}
          >
            Đến trang đặt lại mật khẩu →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ padding: '12px', fontSize: '14px', fontWeight: '600', marginTop: '8px' }}
          >
            {loading ? 'Đang xử lý...' : 'Gửi Token'}
          </button>

          <Link to="/login" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' }}>
            Quay lại đăng nhập
          </Link>
        </form>
      )}
    </div>
  );
}
