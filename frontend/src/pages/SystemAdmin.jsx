import { useState, useEffect } from 'react';

export default function SystemAdmin() {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const auditLogs = [
    { id: '02931', user: 'John Doe', action: 'Table Reservation', details: 'TABLE_09', time: '2 mins ago' },
    { id: '04412', user: 'Sarah King', action: 'Inventory Update', details: 'SUP_CHALK_01', time: '14 mins ago' },
    { id: 'CRON', user: 'System AI', action: 'Heatmap Gen', details: 'ARENA_NORTH', time: '22 mins ago' },
    { id: '01103', user: 'Mike West', action: 'Staff Login', details: 'AUTH_LDAP', time: '45 mins ago' },
    { id: '404', user: 'Gate Monitor', action: 'Auth Failure', details: 'DOOR_REAR_02', time: '1h 05m ago' }
  ];

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff' }}>
            System Administration
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Billiard Elite Admin v1.2.4-stable
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }}></span>
            <span style={{ fontSize: '13px', color: 'var(--success)', fontWeight: '600' }}>Live Server</span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {currentTime} | {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '24px' }}>
        <input 
          type="text" 
          placeholder="Search system logs..." 
          className="form-input" 
          style={{ width: '100%', maxWidth: '400px', padding: '10px 14px', fontSize: '14px', background: 'rgba(0,0,0,0.2)' }}
        />
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '20px',
        marginBottom: '24px'
      }}>
        
        {/* System Overview - 4 columns */}
        <div style={{ gridColumn: 'span 3' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>
              System Overview
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Users</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>1,482</div>
                <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '2px' }}>↑ 12%</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Active Sessions</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)' }}>244</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>High traffic</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>API Health</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)' }}>Active</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>99.9% uptime</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Cloud Storage</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--warning)' }}>74%</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>742 GB / 1 TB</div>
              </div>
            </div>
          </div>
        </div>

        {/* Service Status - 4 columns */}
        <div style={{ gridColumn: 'span 4' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
              Service Status
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Main Database</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Latency: 12ms</div>
                </div>
                <span className="badge badge-success">Stable</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>AI Analytics Engine</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Processing 1.2k req/s</div>
                </div>
                <span className="badge badge-success">Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Identity Service</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Last backup: 2h ago</div>
                </div>
                <span className="badge badge-success">Stable</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>Billing Gateway</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Scheduled maintenance in 4h</div>
                </div>
                <span className="badge badge-warning">Warning</span>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Roles - 4 columns */}
        <div style={{ gridColumn: 'span 5' }}>
          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>
              Staff Roles
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              {/* Circular Chart */}
              <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--primary)" strokeWidth="12" 
                    strokeDasharray="157 314" strokeDashoffset="0" transform="rotate(-90 60 60)" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--success)" strokeWidth="12" 
                    strokeDasharray="94 314" strokeDashoffset="-157" transform="rotate(-90 60 60)" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--info)" strokeWidth="12" 
                    strokeDasharray="63 314" strokeDashoffset="-251" transform="rotate(-90 60 60)" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>54</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Staff</div>
                </div>
              </div>
              
              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Admin (12)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)' }}></span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Staff (32)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--info)' }}></span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Contractor (10)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* System Activity Audit */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff' }}>
            System Activity Audit
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing 5 of 1,204 events
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>USER (ID)</th>
                <th>ACTION</th>
                <th>DETAILS</th>
                <th>TIME</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log, index) => (
                <tr key={index}>
                  <td>
                    <div style={{ fontWeight: '600', color: '#fff' }}>{log.user}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {log.id}</div>
                  </td>
                  <td>
                    <span className={`badge ${log.action === 'Auth Failure' ? 'badge-danger' : 'badge-info'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {log.details}
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <button className="btn-secondary" style={{ padding: '10px 24px', fontSize: '13px' }}>
            Load More Events
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
