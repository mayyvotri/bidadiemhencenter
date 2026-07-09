import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useMediaQuery } from '../hooks/useMediaQuery';

const inputStyle = (isMobile) => ({
  width: '100%',
  padding: isMobile ? '14px 16px' : '14px 16px',
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

const focusIn = (e) => {
  e.target.style.borderColor = 'var(--primary)';
  e.target.style.boxShadow = '0 0 0 3px rgba(225, 29, 72, 0.1)';
};
const focusOut = (e) => {
  e.target.style.borderColor = 'var(--border-glass)';
  e.target.style.boxShadow = 'none';
};

const labelStyle = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '500',
  color: 'var(--text-secondary)',
  marginBottom: '8px'
};

export default function Register() {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 767px)');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      setError('Vui lòng điền đầy đủ thông tin');
      setLoading(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      setLoading(false);
      return;
    }

    try {
      await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: 'staff'
      });
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.');
      setLoading(false);
    }
  };

  const form = (
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
      <div style={{ marginBottom: isMobile ? '24px' : '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
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
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-heading)'
          }}>
            ĐH
          </div>
          <span style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            Điểm Hẹn Billiards
          </span>
        </div>
      </div>

      <div style={{ marginBottom: isMobile ? '24px' : '40px' }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: isMobile ? '28px' : '42px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: isMobile ? '12px' : '16px',
          lineHeight: '1.2'
        }}>
          Tạo tài khoản mới
        </h1>
        <p style={{ fontSize: isMobile ? '14px' : '16px', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '420px', margin: 0 }}>
          Tham gia đội ngũ Điểm Hẹn Billiards và bắt đầu quản lý công việc của bạn ngay hôm nay.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '24px',
          color: 'var(--danger-text)',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {[
          { name: 'name', label: 'Họ và tên', type: 'text', placeholder: 'Nhập họ và tên của bạn' },
          { name: 'email', label: 'Email công việc', type: 'email', placeholder: 'email@diemhen.vn' },
          { name: 'phone', label: 'Số điện thoại', type: 'tel', placeholder: '090 xxx xxxx' }
        ].map((f) => (
          <div key={f.name} style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{f.label}</label>
            <input
              type={f.type}
              name={f.name}
              value={formData[f.name]}
              onChange={handleChange}
              placeholder={f.placeholder}
              required
              style={inputStyle(isMobile)}
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </div>
        ))}

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Vai trò</label>
          <div style={{
            padding: '14px 16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-glass)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            fontSize: '16px',
            minHeight: isMobile ? '48px' : 'auto',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box'
          }}>
            Nhân viên
          </div>
        </div>

        {[
          { name: 'password', label: 'Mật khẩu', placeholder: '••••••••' },
          { name: 'confirmPassword', label: 'Xác nhận mật khẩu', placeholder: '••••••••' }
        ].map((f) => (
          <div key={f.name} style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>{f.label}</label>
            <input
              type="password"
              name={f.name}
              value={formData[f.name]}
              onChange={handleChange}
              placeholder={f.placeholder}
              required
              style={inputStyle(isMobile)}
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            background: loading ? 'rgba(225, 29, 72, 0.5)' : 'var(--primary)',
            color: 'var(--text-primary)',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            minHeight: isMobile ? '52px' : 'auto',
            fontFamily: 'var(--font-heading)'
          }}
        >
          {loading ? 'Đang đăng ký...' : 'Đăng ký tài khoản →'}
        </button>
      </form>

      <div style={{ marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Đã có tài khoản?{' '}
        <Link to="/login" style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: '600', textDecoration: 'none', padding: '4px 8px' }}>
          Đăng nhập
        </Link>
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
      {form}
      {!isMobile && (
        <div style={{
          flex: 1, position: 'relative',
          background: 'url("https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=1920&h=1080&fit=crop") center/cover',
          minHeight: '100vh'
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.5)' }}></div>
          <div style={{
            position: 'absolute', bottom: '80px', left: '80px', right: '80px',
            background: 'rgba(13, 17, 26, 0.9)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px',
            padding: '40px', maxWidth: '500px'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', fontSize: '24px' }}>⭐</div>
            <blockquote style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', marginBottom: '24px', lineHeight: '1.4' }}>
              "Đội ngũ chuyên nghiệp. Công việc hiệu quả. Tương lai rực rỡ."
            </blockquote>
            <div style={{ width: '60px', height: '2px', background: 'var(--primary)', marginBottom: '24px' }}></div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '600', marginBottom: '32px' }}>
              THAM GIA ĐIỂM HẸN BILLIARDS
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
