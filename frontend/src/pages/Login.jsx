import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('bida_staff');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network latency
    setTimeout(() => {
      if (username === 'bida_staff' && password === 'password123') {
        localStorage.setItem('auth_token', 'mock_jwt_token_xyz');
        localStorage.setItem('user_info', JSON.stringify({
          name: 'Phú Nguyễn',
          role: 'Quản lý Ca',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'
        }));
        setLoading(false);
        navigate('/dashboard');
      } else {
        setError('Tài khoản hoặc mật khẩu không chính xác!');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Decorative Glows */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'rgba(139, 92, 246, 0.15)',
        filter: 'blur(80px)',
        top: '20%',
        left: '20%'
      }}></div>
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'rgba(59, 130, 246, 0.12)',
        filter: 'blur(80px)',
        bottom: '20%',
        right: '20%'
      }}></div>

      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
        padding: '40px 32px',
        zIndex: 1
      }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 16px rgba(139, 92, 246, 0.3)',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#fff'
          }}>
            B
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', color: 'var(--text-primary)' }}>
            Điểm Hẹn Center
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Hệ thống quản lý nhân viên phục vụ
          </p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ display: 'flex', marginBottom: '20px', width: '100%', justifyContent: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Tài khoản</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tài khoản"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label">Mật khẩu</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '14px' }}
            disabled={loading}
          >
            {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
          </button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Tài khoản demo: <code style={{ color: 'var(--primary)' }}>bida_staff</code> / <code style={{ color: 'var(--primary)' }}>password123</code>
        </div>
      </div>
    </div>
  );
}
