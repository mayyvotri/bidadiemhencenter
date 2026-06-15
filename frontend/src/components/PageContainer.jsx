import { useMediaQuery } from '../hooks/useMediaQuery';

/**
 * PageContainer - Wrapper responsive dùng chung cho mọi page
 * - Mobile: full-width, padding 16px
 * - Desktop: max-width 1400px, padding 32px 40px
 */
export default function PageContainer({ children, style = {} }) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  return (
    <div
      style={{
        maxWidth: '100%',
        width: '100%',
        margin: '0 auto',
        padding: isMobile ? '0' : '0',
        ...style
      }}
    >
      {children}
    </div>
  );
}

/**
 * PageHeader - Tiêu đề trang responsive
 */
export function PageHeader({ title, subtitle, actions, icon }) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      gap: isMobile ? '12px' : '16px',
      marginBottom: '24px',
      padding: isMobile ? '16px 16px 12px' : '0 0 24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        {icon && (
          <div style={{
            fontSize: isMobile ? '24px' : '32px',
            width: isMobile ? '40px' : '48px',
            height: isMobile ? '40px' : '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-glass)',
            borderRadius: '10px',
            flexShrink: 0
          }}>
            {icon}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontSize: isMobile ? '20px' : '28px',
            fontWeight: '700',
            color: '#fff',
            margin: 0,
            fontFamily: 'var(--font-heading)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: isMobile ? '12px' : '13px',
              color: 'var(--text-secondary)',
              margin: '2px 0 0'
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          width: isMobile ? '100%' : 'auto'
        }}>
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Card - Card responsive với padding động
 */
export function Card({ children, style = {}, padding, hoverable = false }) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const defaultPadding = isMobile ? '14px' : '20px';

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-glass)',
        borderRadius: isMobile ? '10px' : '12px',
        padding: padding || defaultPadding,
        backdropFilter: 'blur(8px)',
        transition: hoverable ? 'all var(--transition-fast)' : undefined,
        ...style
      }}
    >
      {children}
    </div>
  );
}

/**
 * Button - Button responsive với min-height 44px trên mobile (chuẩn touch target)
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  style = {},
  ...props
}) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  const variants = {
    primary: { background: 'var(--primary)', color: '#fff', border: 'none' },
    secondary: { background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-glass)' },
    success: { background: 'var(--success)', color: '#fff', border: 'none' },
    danger: { background: 'var(--danger)', color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }
  };

  const sizes = {
    sm: { padding: isMobile ? '8px 12px' : '6px 12px', fontSize: isMobile ? '13px' : '12px', minHeight: isMobile ? '36px' : '32px' },
    md: { padding: isMobile ? '10px 16px' : '8px 16px', fontSize: isMobile ? '14px' : '13px', minHeight: isMobile ? '44px' : '36px' },
    lg: { padding: isMobile ? '12px 20px' : '10px 20px', fontSize: isMobile ? '15px' : '14px', minHeight: isMobile ? '48px' : '40px' }
  };

  return (
    <button
      {...props}
      style={{
        ...variants[variant],
        ...sizes[size],
        fontWeight: '600',
        borderRadius: '8px',
        cursor: 'pointer',
        width: fullWidth ? '100%' : 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        transition: 'all var(--transition-fast)',
        ...style
      }}
    >
      {children}
    </button>
  );
}

/**
 * Grid - Grid responsive tự động
 */
export function Grid({ children, cols = 3, gap = 16, minWidth = 280, style = {} }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
        gap: `${gap}px`,
        ...style
      }}
    >
      {children}
    </div>
  );
}

/**
 * Stack - Flex column/row với gap responsive
 */
export function Stack({ children, direction = 'column', gap = 12, style = {}, align, justify }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: direction,
      gap: `${gap}px`,
      alignItems: align,
      justifyContent: justify,
      ...style
    }}>
      {children}
    </div>
  );
}
