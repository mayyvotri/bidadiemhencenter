import { useState, useEffect } from 'react';
import { attendanceApi, systemSettingsApi } from '../services/api';
import FaceVerification from '../components/FaceVerification';

const formatTime = (date) => {
  if (!date) return '--:--';
  return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (date) => {
  if (!date) return '--/--/----';
  return new Date(date).toLocaleDateString('vi-VN');
};

const formatWorkingHours = (hours) => {
  if (!hours) return '0h';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

const getStatusLabel = (status) => {
  const labels = {
    on_time: 'Đúng giờ',
    late: 'Đến muộn',
    early_leave: 'Về sớm',
    absent: 'Vắng mặt'
  };
  return labels[status] || status;
};

const getStatusColor = (status) => {
  const colors = {
    on_time: '#22c55e',
    late: '#eab308',
    early_leave: '#f97316',
    absent: '#ef4444'
  };
  return colors[status] || '#6b7280';
};

const getShiftName = (hour) => {
  if (hour >= 6 && hour < 12) return 'Ca sáng';
  if (hour >= 12 && hour < 18) return 'Ca chiều';
  return 'Ca tối';
};

export default function Attendance() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [session, setSession] = useState(null);
  const [timeStr, setTimeStr] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [useFaceVerification, setUseFaceVerification] = useState(false);
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [verificationType, setVerificationType] = useState('checkin');
  const [location, setLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString('vi-VN'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await systemSettingsApi.getSettings();
        if (data.success) {
          setSettings(data.data);
          setGpsEnabled(data.data.gpsVerificationEnabled);
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!gpsEnabled) return;

    const requestLocation = () => {
      if (!navigator.geolocation) {
        setLocationPermission('not_supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setLocationPermission('granted');
        },
        (error) => {
          if (error.code === 1) {
            setLocationPermission('denied');
          } else {
            setLocationPermission('error');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    requestLocation();
  }, [gpsEnabled]);

  const fetchAttendance = async () => {
    try {
      const [activeData, logsData] = await Promise.all([
        attendanceApi.getActiveSession(),
        attendanceApi.getLogs({ limit: 30 })
      ]);
      
      if (activeData.success && activeData.active) {
        setIsCheckedIn(true);
        setSession(activeData.data);
      }
      
      if (logsData.success) {
        setLogs(logsData.data);
      }
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu điểm danh');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleCheckIn = async () => {
    if (useFaceVerification) {
      setVerificationType('checkin');
      setShowFaceVerification(true);
      return;
    }

    try {
      const payload = {};
      if (location && gpsEnabled) {
        payload.latitude = location.latitude;
        payload.longitude = location.longitude;
        payload.accuracy = location.accuracy;
      }

      const data = await attendanceApi.checkIn(payload);
      if (data.success) {
        setIsCheckedIn(true);
        setSession(data.data);
        await fetchAttendance();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể check-in');
    }
  };

  const handleCheckOut = async () => {
    if (useFaceVerification) {
      setVerificationType('checkout');
      setShowFaceVerification(true);
      return;
    }

    try {
      const payload = {};
      if (location && gpsEnabled) {
        payload.latitude = location.latitude;
        payload.longitude = location.longitude;
        payload.accuracy = location.accuracy;
      }

      const data = await attendanceApi.checkOut(payload);
      if (data.success) {
        setIsCheckedIn(false);
        setSession(null);
        await fetchAttendance();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể check-out');
    }
  };

  const handleFaceVerificationSuccess = (data) => {
    setShowFaceVerification(false);
    setIsCheckedIn(verificationType === 'checkin');
    setSession(data);
    fetchAttendance();
  };

  const handleFaceVerificationCancel = () => {
    setShowFaceVerification(false);
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', padding: '40px' }}>Đang tải dữ liệu chấm công...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', marginBottom: '8px' }}>
        Điểm Danh & Ghi Nhận Công
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Ghi nhận thời gian đến và về tại chi nhánh hoạt động.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: '#ef4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* GPS Location Status */}
      {gpsEnabled && (
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#fff', marginBottom: '0' }}>
              Trạng thái GPS
            </h3>
            {locationPermission === 'granted' && location && (
              <span style={{ color: '#22c55e', fontSize: '13px' }}>✓ Đã xác định vị trí</span>
            )}
            {locationPermission === 'denied' && (
              <span style={{ color: '#ef4444', fontSize: '13px' }}>✗ Từ chối quyền truy cập</span>
            )}
            {locationPermission === 'not_supported' && (
              <span style={{ color: '#f97316', fontSize: '13px' }}>✗ Không hỗ trợ GPS</span>
            )}
            {locationPermission === 'error' && (
              <span style={{ color: '#ef4444', fontSize: '13px' }}>✗ Lỗi GPS</span>
            )}
            {!locationPermission && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Đang xác định...</span>
            )}
          </div>
          {locationPermission === 'granted' && location && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
              Vĩ độ: {location.latitude.toFixed(6)}, Kinh độ: {location.longitude.toFixed(6)}, Độ chính xác: {location.accuracy?.toFixed(0)}m
            </p>
          )}
        </div>
      )}

      {/* Face Verification Toggle */}
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#fff', marginBottom: '4px' }}>
            Sử dụng nhận diện khuôn mặt
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Điểm danh bằng nhận diện khuôn mặt thay vì thủ công
          </p>
        </div>
        <button
          onClick={() => setUseFaceVerification(!useFaceVerification)}
          style={{
            padding: '12px 24px',
            background: useFaceVerification ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
            border: useFaceVerification ? 'none' : '1px solid var(--border-glass)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          {useFaceVerification ? 'Bật' : 'Tắt'}
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        alignItems: 'start'
      }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Giờ Hệ Thống
          </div>
          <div style={{ fontSize: '42px', fontWeight: '700', fontFamily: 'var(--font-heading)', color: 'var(--primary)', marginBottom: '24px' }}>
            {timeStr || '--:--:--'}
          </div>

          {!isCheckedIn ? (
            <div style={{ width: '100%' }}>
              <div style={{
                background: useFaceVerification ? 'rgba(59, 130, 246, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                border: useFaceVerification ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '28px',
                fontSize: '14px',
                color: useFaceVerification ? 'var(--info)' : 'var(--warning)',
                textAlign: 'left'
              }}>
                {useFaceVerification ? '�' : '�'} <strong>{useFaceVerification ? 'Nhận diện khuôn mặt' : 'Ca tiếp theo:'}</strong> {useFaceVerification ? 'Hệ thống sẽ xác thực khuôn mặt của bạn' : 'Hệ thống tự động xác định ca dựa trên giờ check-in.'}
              </div>
              <button className="btn-primary" onClick={handleCheckIn} style={{ padding: '16px 40px', fontSize: '16px', width: '100%' }}>
                🟢 Check-in Vào Ca
              </button>
            </div>
          ) : (
            <div style={{ width: '100%' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '28px',
                fontSize: '14px',
                color: 'var(--success)',
                textAlign: 'left'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>✓ Đã Check-in Thành Công</div>
                <div><strong>Giờ vào:</strong> {formatTime(session?.checkIn)}</div>
                <div><strong>Ca trực:</strong> {getShiftName(new Date(session?.checkIn).getHours())}</div>
                <div><strong>Ngày:</strong> {formatDate(session?.date)}</div>
              </div>
              <button className="btn-secondary" onClick={handleCheckOut} style={{ padding: '16px 40px', fontSize: '16px', width: '100%', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
                🔴 Check-out Ra Ca
              </button>
            </div>
          )}
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', marginBottom: '20px' }}>
            Lịch sử công tháng này
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Ca</th>
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th>Giờ làm</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      Chưa có lịch sử chấm công
                    </td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ fontWeight: '500' }}>{formatDate(log.date)}</td>
                    <td>{getShiftName(new Date(log.checkIn).getHours())}</td>
                    <td>{formatTime(log.checkIn)}</td>
                    <td>{formatTime(log.checkOut)}</td>
                    <td>{formatWorkingHours(log.workingHours)}</td>
                    <td>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        background: `${getStatusColor(log.status)}20`,
                        color: getStatusColor(log.status)
                      }}>
                        {getStatusLabel(log.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Face Verification Modal */}
      {showFaceVerification && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d111a', border: '1px solid var(--border-glass)', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <FaceVerification
              verificationType={verificationType}
              onSuccess={handleFaceVerificationSuccess}
              onCancel={handleFaceVerificationCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
}
