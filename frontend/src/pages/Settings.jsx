import { useState } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';

export default function Settings() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      branchName: 'Điểm Hẹn Billiards - Nguyễn Oanh',
      branchAddress: '123 Nguyễn Oanh, Gò Vấp, TP.HCM',
      phoneNumber: '090 123 4567',
      email: 'contact@diemhen.vn',
      businessHours: '08:00 - 23:30'
    },
    notifications: {
      emailAlerts: true,
      lowStockAlerts: true,
      shiftChangeAlerts: true,
      maintenanceAlerts: true
    },
    system: {
      autoBackup: true,
      backupFrequency: 'daily',
      dataRetention: '90 days',
      enableAuditLogs: true
    },
    appearance: {
      theme: 'dark',
      language: 'vi',
      dateFormat: 'DD/MM/YYYY'
    }
  });

  const tabs = [
    { id: 'general', label: 'Cài đặt chung', icon: '⚙️' },
    { id: 'notifications', label: 'Thông báo', icon: '🔔' },
    { id: 'system', label: 'Hệ thống', icon: '🖥️' },
    { id: 'appearance', label: 'Giao diện', icon: '🎨' }
  ];

  const handleSave = () => {
    alert('Đã lưu cài đặt thành công!');
  };

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>
          Cài đặt Hệ thống
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Quản lý cấu hình và tùy chọn hệ thống.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: activeTab === tab.id ? 'none' : '1px solid var(--border-glass)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? '600' : '400',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all var(--transition-fast)'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="glass-card" style={{ padding: '24px' }}>
        
        {/* General Settings */}
        {activeTab === 'general' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Cài đặt chung
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Tên chi nhánh</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={settings.general.branchName}
                  onChange={(e) => setSettings({
                    ...settings,
                    general: { ...settings.general, branchName: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Địa chỉ</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={settings.general.branchAddress}
                  onChange={(e) => setSettings({
                    ...settings,
                    general: { ...settings.general, branchAddress: e.target.value }
                  })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={settings.general.phoneNumber}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, phoneNumber: e.target.value }
                    })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={settings.general.email}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, email: e.target.value }
                    })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Giờ hoạt động</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={settings.general.businessHours}
                  onChange={(e) => setSettings({
                    ...settings,
                    general: { ...settings.general, businessHours: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Notifications Settings */}
        {activeTab === 'notifications' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Cài đặt thông báo
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { key: 'emailAlerts', label: 'Cảnh báo qua email', desc: 'Nhận thông báo quan trọng qua email' },
                { key: 'lowStockAlerts', label: 'Cảnh báo tồn kho thấp', desc: 'Thông báo khi hàng hóa sắp hết' },
                { key: 'shiftChangeAlerts', label: 'Cảnh báo thay đổi ca', desc: 'Nhắc nhở trước khi ca thay đổi' },
                { key: 'maintenanceAlerts', label: 'Cảnh báo bảo trì', desc: 'Thông báo lịch bảo trì định kỳ' }
              ].map((item) => (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.desc}</div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                    <input 
                      type="checkbox" 
                      checked={settings.notifications[item.key]}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, [item.key]: e.target.checked }
                      })}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: settings.notifications[item.key] ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                      transition: '0.3s',
                      borderRadius: '24px'
                    }}></span>
                    <span style={{
                      position: 'absolute',
                      content: '',
                      height: '18px',
                      width: '18px',
                      left: settings.notifications[item.key] ? '27px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'var(--text-primary)',
                      transition: '0.3s',
                      borderRadius: '50%'
                    }}></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Settings */}
        {activeTab === 'system' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Cài đặt hệ thống
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>Sao lưu tự động</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tự động sao lưu dữ liệu định kỳ</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                  <input 
                    type="checkbox" 
                    checked={settings.system.autoBackup}
                    onChange={(e) => setSettings({
                      ...settings,
                      system: { ...settings.system, autoBackup: e.target.checked }
                    })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: settings.system.autoBackup ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                    transition: '0.3s',
                    borderRadius: '24px'
                  }}></span>
                  <span style={{
                    position: 'absolute',
                    content: '',
                    height: '18px',
                    width: '18px',
                    left: settings.system.autoBackup ? '27px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'var(--text-primary)',
                    transition: '0.3s',
                    borderRadius: '50%'
                  }}></span>
                </label>
              </div>
              
              <div className="form-group">
                <label className="form-label">Tần suất sao lưu</label>
                <select 
                  className="form-input" 
                  style={{ background: 'var(--bg-darker)' }}
                  value={settings.system.backupFrequency}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, backupFrequency: e.target.value }
                  })}
                >
                  <option value="hourly">Mỗi giờ</option>
                  <option value="daily">Hàng ngày</option>
                  <option value="weekly">Hàng tuần</option>
                  <option value="monthly">Hàng tháng</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Thời gian lưu trữ dữ liệu</label>
                <select 
                  className="form-input" 
                  style={{ background: 'var(--bg-darker)' }}
                  value={settings.system.dataRetention}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: { ...settings.system, dataRetention: e.target.value }
                  })}
                >
                  <option value="30 days">30 ngày</option>
                  <option value="90 days">90 ngày</option>
                  <option value="180 days">180 ngày</option>
                  <option value="365 days">1 năm</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>Bật nhật ký hệ thống</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ghi lại tất cả hoạt động hệ thống</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                  <input 
                    type="checkbox" 
                    checked={settings.system.enableAuditLogs}
                    onChange={(e) => setSettings({
                      ...settings,
                      system: { ...settings.system, enableAuditLogs: e.target.checked }
                    })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: settings.system.enableAuditLogs ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                    transition: '0.3s',
                    borderRadius: '24px'
                  }}></span>
                  <span style={{
                    position: 'absolute',
                    content: '',
                    height: '18px',
                    width: '18px',
                    left: settings.system.enableAuditLogs ? '27px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'var(--text-primary)',
                    transition: '0.3s',
                    borderRadius: '50%'
                  }}></span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Appearance Settings */}
        {activeTab === 'appearance' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '20px' }}>
              Cài đặt giao diện
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Chủ đề</label>
                <select 
                  className="form-input" 
                  style={{ background: 'var(--bg-darker)' }}
                  value={settings.appearance.theme}
                  onChange={(e) => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, theme: e.target.value }
                  })}
                >
                  <option value="dark">Tối (Dark)</option>
                  <option value="light">Sáng (Light)</option>
                  <option value="auto">Tự động</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ngôn ngữ</label>
                <select 
                  className="form-input" 
                  style={{ background: 'var(--bg-darker)' }}
                  value={settings.appearance.language}
                  onChange={(e) => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, language: e.target.value }
                  })}
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Định dạng ngày tháng</label>
                <select 
                  className="form-input" 
                  style={{ background: 'var(--bg-darker)' }}
                  value={settings.appearance.dateFormat}
                  onChange={(e) => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, dateFormat: e.target.value }
                  })}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-glass)' }}>
          <button className="btn-primary" onClick={handleSave}>
            💾 Lưu Cài Đặt
          </button>
        </div>

      </div>
    </div>
  );
}
