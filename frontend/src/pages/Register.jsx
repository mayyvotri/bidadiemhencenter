import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'staff'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
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

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0d111a'
    }}>
      {/* Left Panel - Register Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        maxWidth: '50%',
        background: '#0d111a'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #e11d48, #be123c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#fff',
              fontFamily: 'var(--font-heading)'
            }}>
              ĐH
            </div>
            <span style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#fff',
              fontFamily: 'var(--font-heading)'
            }}>
              Điểm Hẹn Billiards
            </span>
          </div>
        </div>

        {/* Welcome Message */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '42px',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '16px',
            lineHeight: '1.2'
          }}>
            Tạo tài khoản mới
          </h1>
          <p style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            maxWidth: '420px'
          }}>
            Tham gia đội ngũ Điểm Hẹn Billiards và bắt đầu quản lý công việc của bạn ngay hôm nay.
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

        {/* Register Form */}
        <form onSubmit={handleSubmit}>
          {/* Name Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}>
              Họ và tên
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập họ và tên của bạn"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s'
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
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@diemhen.vn"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s'
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

          {/* Phone Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}>
              Số điện thoại
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="090 xxx xxxx"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s'
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}>
              Vai trò
            </label>
            <div style={{
              padding: '14px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              fontSize: '15px'
            }}>
              Nhân viên
            </div>
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}>
              Mật khẩu
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s'
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

          {/* Confirm Password Input */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}>
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s'
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

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? 'rgba(225, 29, 72, 0.5)' : 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'var(--font-heading)'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.background = 'var(--primary-hover)';
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.target.style.background = 'var(--primary)';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            {loading ? 'Đang đăng ký...' : 'Đăng ký tài khoản →'}
          </button>
        </form>

        {/* Login Link */}
        <div style={{ marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            textDecoration: 'none'
          }}>
            Đăng nhập
          </Link>
        </div>
      </div>

      {/* Right Panel - Background Image */}
      <div style={{
        flex: 1,
        position: 'relative',
        background: 'url("https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=1920&h=1080&fit=crop") center/cover',
        minHeight: '100vh'
      }}>
        {/* Dark Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)'
        }}></div>

        {/* Testimonial Card */}
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
          {/* Star Icon */}
          <div style={{
            width: '48px',
            height: '48px',
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

          {/* Quote */}
          <blockquote style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#fff',
            fontFamily: 'var(--font-heading)',
            marginBottom: '24px',
            lineHeight: '1.4'
          }}>
            "Đội ngũ chuyên nghiệp. Công việc hiệu quả. Tương lai rực rỡ."
          </blockquote>

          {/* Separator */}
          <div style={{
            width: '60px',
            height: '2px',
            background: 'var(--primary)',
            marginBottom: '24px'
          }}></div>

          {/* Standard Text */}
          <div style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            fontWeight: '600',
            marginBottom: '32px'
          }}>
            THAM GIA ĐIỂM HẸN BILLIARDS
          </div>

          {/* Thumbnail Images */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{
              width: '80px',
              height: '60px',
              borderRadius: '8px',
              background: 'url("https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=200&h=150&fit=crop") center/cover',
              border: '2px solid rgba(255, 255, 255, 0.1)'
            }}></div>
            <div style={{
              width: '80px',
              height: '60px',
              borderRadius: '8px',
              background: 'url("https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&h=150&fit=crop") center/cover',
              border: '2px solid rgba(255, 255, 255, 0.1)'
            }}></div>
            <div style={{
              width: '80px',
              height: '60px',
              borderRadius: '8px',
              background: 'url("https://images.unsplash.com/photo-1578849917418-4b8b4c5c1a0f?w=200&h=150&fit=crop") center/cover',
              border: '2px solid rgba(255, 255, 255, 0.1)'
            }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
