import { useMediaQuery } from '../hooks/useMediaQuery';

/**
 * ResponsiveTable - Trên desktop hiển thị dạng table, trên mobile chuyển thành card list
 *
 * Props:
 *  - columns: [{ key, label, render?, width?, align? }]
 *  - data: array of objects
 *  - keyField: tên field unique (mặc định '_id')
 *  - onRowClick: function(row)
 *  - emptyText
 */
export default function ResponsiveTable({
  columns = [],
  data = [],
  keyField = '_id',
  onRowClick,
  emptyText = 'Không có dữ liệu',
  cardRenderer
}) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (!data || data.length === 0) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '14px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-glass)',
        borderRadius: '12px'
      }}>
        {emptyText}
      </div>
    );
  }

  // ── Mobile: card list ──
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {data.map((row, idx) => (
<div
        key={row[keyField] ?? idx}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          cursor: onRowClick ? 'pointer' : 'default',
          transition: 'all var(--transition-fast)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
            {cardRenderer ? cardRenderer(row, idx) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {columns.map((col) => {
                  const value = col.render ? col.render(row) : row[col.key];
                  if (value === null || value === undefined || value === '') return null;
                  return (
                    <div key={col.key} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                      fontSize: '13px'
                    }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px', flexShrink: 0 }}>
                        {col.label}
                      </span>
                      <span style={{
                        color: 'var(--text-primary)',
                        textAlign: col.align === 'right' ? 'right' : 'left',
                        fontWeight: col.primary ? '600' : '500',
                        wordBreak: 'break-word',
                        textAlignLast: 'right'
                      }}>
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── Desktop: table ──
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-glass)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px'
        }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-glass)' }}>
              {columns.map((col) => (
                <th key={col.key} style={{
                  padding: '12px 16px',
                  textAlign: col.align || 'left',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                  width: col.width,
                  background: '#f8fafc'
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={row[keyField] ?? idx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{
                  borderBottom: idx < data.length - 1 ? '1px solid var(--border-glass)' : 'none',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background var(--transition-fast)'
                }}
                onMouseEnter={(e) => { if (onRowClick) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={(e) => { if (onRowClick) e.currentTarget.style.background = 'transparent'; }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{
                    padding: '12px 16px',
                    textAlign: col.align || 'left',
                    color: 'var(--text-primary)',
                    verticalAlign: 'middle'
                  }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
