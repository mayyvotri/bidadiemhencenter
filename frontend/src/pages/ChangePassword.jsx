import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';
import { useMediaQuery } from '../hooks/useMediaQuery';

const inputStyle = (isMobile) => ({
  width: '100%',
  padding: '14px 16px',
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

export default function ChangePassword() {
  const { changePassword } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Mật khẩu mới phải có ít nhất 6 ký tự'); return; }
    if (newPassword !== confirmPassword) { setError('Mật khẩu mới không khớp'); return; }
    setLoading(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Đổi Mật Khẩu"
      subtitle="Bạn cần đổi mật khẩu để tiếp tục sử dụng hệ thống."
      icon="🔐"
    >
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', color: '#ef4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Mật khẩu hiện tại</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required style={inputStyle(isMobile)} />
        </div>
        <div>
          <label style={labelStyle}>Mật khẩu mới</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Ít nhất 6 ký tự" style={inputStyle(isMobile)} />
        </div>
        <div>
          <label style={labelStyle}>Xác nhận mật khẩu mới</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} style={inputStyle(isMobile)} />
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
          {loading ? 'Đang xử lý...' : 'Đổi Mật Khẩu'}
        </button>
      </form>
    </AuthLayout>
  );
}
