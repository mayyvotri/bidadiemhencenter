import { useState, useEffect } from 'react';
import { systemSettingsApi } from '../services/api';

export default function BusinessLocationSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [address, setAddress] = useState('');
  const [allowedRadius, setAllowedRadius] = useState('');
  const [gpsVerificationEnabled, setGpsVerificationEnabled] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await systemSettingsApi.getSettings();
        if (data.success) {
          const s = data.data;
          setSettings(s);
          setBusinessName(s.businessName || '');
          setLatitude(s.location?.latitude || '');
          setLongitude(s.location?.longitude || '');
          setAddress(s.location?.address || '');
          setAllowedRadius(s.allowedRadius || 100);
          setGpsVerificationEnabled(s.gpsVerificationEnabled ?? true);
        }
      } catch (err) {
        setError(err.message || 'Không thể tải cài đặt');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ định vị GPS');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setError('');
      },
      (error) => {
        setError('Không thể lấy vị trí hiện tại. Vui lòng cấp quyền truy cập GPS.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        businessName,
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address
        },
        allowedRadius: parseInt(allowedRadius),
        gpsVerificationEnabled
      };

      const data = await systemSettingsApi.updateSettings(payload);
      if (data.success) {
        setSuccess('Cập nhật cài đặt thành công');
        setSettings(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể cập nhật cài đặt');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: '#fff', marginBottom: '8px' }}>
        Cài Đặt Vị Trí Doanh Nghiệp
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Cấu hình vị trí doanh nghiệp và cài đặt xác thực.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: '#ef4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: '#22c55e', fontSize: '14px' }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Business Information */}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff', marginBottom: '20px' }}>
            Thông tin doanh nghiệp
          </h3>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Tên doanh nghiệp</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Địa chỉ</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Địa chỉ doanh nghiệp"
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            />
          </div>
        </div>

        {/* Location Settings */}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff', marginBottom: '20px' }}>
            Cài đặt vị trí GPS
          </h3>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Vĩ độ (Latitude)</label>
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="Ví dụ: 21.0285"
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Kinh độ (Longitude)</label>
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="Ví dụ: 105.8542"
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <button
              type="button"
              onClick={getCurrentLocation}
              style={{ padding: '10px 16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#3b82f6', fontSize: '14px', cursor: 'pointer' }}
            >
              📍 Lấy vị trí hiện tại
            </button>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Bán kính cho phép (mét)</label>
            <input
              type="number"
              min="10"
              max="1000"
              value={allowedRadius}
              onChange={(e) => setAllowedRadius(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            />
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>Nhân viên chỉ có thể điểm danh trong bán kính này (10m - 1000m)</p>
          </div>
        </div>

        {/* Verification Settings */}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff', marginBottom: '20px' }}>
            Cài đặt xác thực
          </h3>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ color: '#fff', fontSize: '14px' }}>Bật xác thực GPS</span>
              <input
                type="checkbox"
                checked={gpsVerificationEnabled}
                onChange={(e) => setGpsVerificationEnabled(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
            </label>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>Yêu cầu nhân viên phải trong phạm vi địa điểm để điểm danh</p>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ gridColumn: '1 / -1' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '16px 32px',
              background: saving ? 'rgba(255, 255, 255, 0.1)' : 'var(--primary)',
              border: saving ? '1px solid var(--border-glass)' : 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.5 : 1
            }}
          >
            {saving ? 'Đang lưu...' : 'Lưu Cài Đặt'}
          </button>
        </div>
      </form>
    </div>
  );
}
