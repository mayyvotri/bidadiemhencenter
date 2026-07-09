import { useMediaQuery } from '../hooks/useMediaQuery';

/**
 * AuthLayout - Layout dùng chung cho các trang auth (Register, ForgotPassword, ResetPassword, ChangePassword)
 * - Mobile: full-width, có safe-area
 * - Desktop: panel giữa, max-width 480px
 */
export default function AuthLayout({ children, title, subtitle, icon = '🔐' }) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '0' : '40px 20px',
      paddingTop: isMobile ? 'max(24px, env(safe-area-inset-top))' : '40px',
      paddingBottom: isMobile ? 'max(24px, env(safe-area-inset-bottom))' : '40px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: isMobile ? 'transparent' : 'var(--bg-card)',
        border: isMobile ? 'none' : '1px solid var(--border-glass)',
        borderRadius: isMobile ? '0' : 'var(--radius-xl)',
        padding: isMobile ? '24px 20px' : '40px',
        boxShadow: isMobile ? 'none' : 'var(--shadow-lg)'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: isMobile ? '24px' : '32px' }}>
          <div style={{
            width: isMobile ? '40px' : '48px',
            height: isMobile ? '40px' : '48px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #e11d48, #be123c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '16px' : '20px',
            fontWeight: 'bold',
            color: '#fff',
            fontFamily: 'var(--font-heading)',
            flexShrink: 0,
            boxShadow: 'var(--shadow-md)'
          }}>
            {icon}
          </div>
          <span style={{
            fontSize: isMobile ? '18px' : '20px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-heading)'
          }}>
            Điểm Hẹn Billiards
          </span>
        </div>

        {/* Title */}
        {title && (
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: isMobile ? '24px' : '28px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>
            {title}
          </h1>
        )}
        {subtitle && (
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            marginBottom: '24px'
          }}>
            {subtitle}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}
