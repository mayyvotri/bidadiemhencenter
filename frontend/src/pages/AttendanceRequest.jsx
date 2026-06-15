import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendanceRequestApi } from '../services/attendanceRequestApi';
import { useMediaQuery } from '../hooks/useMediaQuery';

const formatDate = (date) => {
  if (!date) return '--/--/----';
  return new Date(date).toLocaleDateString('vi-VN');
};

export default function AttendanceRequestPage() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [currentTime, setCurrentTime] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastApproved, setLastApproved] = useState(null);
  const [showAlternatingModal, setShowAlternatingModal] = useState(false);
  const [alternatingModalMsg, setAlternatingModalMsg] = useState('');
  const [pendingRequests, setPendingRequests] = useState([]);

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    const update = () => setCurrentTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Reverse geocode location → address using Nominatim (free, no API key needed)
  useEffect(() => {
    if (!location) return;
    setAddressLoading(true);
    const controller = new AbortController();
    const { latitude, longitude } = location;

    // Try Nominatim (OpenStreetMap) — free, no API key
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      { signal: controller.signal, headers: { 'Accept-Language': 'vi' } }
    )
      .then(res => res.json())
      .then(data => {
        if (data && data.display_name) {
          const parts = data.display_name.split(', ');
          // Simplify: take first 3-4 parts for readability
          const shortParts = parts.slice(0, 4);
          setAddress(shortParts.join(', '));
        } else {
          setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
      })
      .catch(() => {
        setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      })
      .finally(() => {
        setAddressLoading(false);
      });

    return () => controller.abort();
  }, [location]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await new Promise(resolve => { video.onloadedmetadata = () => resolve(); });
      setCameraReady(true);
    } catch (e) {
      if (e.name === 'NotAllowedError') setError('Camera bị từ chối. Vui lòng cho phép truy cập camera.');
      else if (e.name === 'NotFoundError') setError('Không tìm thấy camera.');
      else setError('Không thể truy cập camera.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const capturePhoto = () => {
    if (!cameraReady) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.restore();
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhotoDataUrl(dataUrl);
    setStatus('captured');
    stopCamera();
  };

  const handleRetake = () => {
    setPhotoDataUrl('');
    setStatus('idle');
    startCamera();
  };

  const fetchLastApproved = async () => {
    try {
      const data = await attendanceRequestApi.getMyRequests({ limit: 100 });
      if (data.data && data.data.length > 0) {
        return data.data;
      }
    } catch { /* ignore */ }
    return [];
  };

  const handleSelectType = async (type) => {
    const requests = await fetchLastApproved();
    setLastApproved(requests[0] || null);
    setPendingRequests(requests);
    setSelectedType(type);
    setError('');
  };

  const handleSubmit = async () => {
    if (!selectedType || !photoDataUrl) return;
    setLoading(true);
    setError('');
    setStatus('submitting');
    try {
      await attendanceRequestApi.create(selectedType, photoDataUrl, location ? { ...location, address } : null);
      setStatus('success');
      setPendingRequests([]);
      // Refresh history in background so manager sees updates faster
      attendanceRequestApi.getMyRequests({ status: 'pending', limit: 1 }).catch(() => {});
    } catch (err) {
      setError(err.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedType('');
    setPhotoDataUrl('');
    setStatus('idle');
    setError('');
    setLastApproved(null);
    setPendingRequests([]);
    setShowAlternatingModal(false);
    startCamera();
  };

  const isCheckIn = selectedType === 'checkin';
  const accentColor = isCheckIn ? '#22c55e' : '#ef4444';

  // Static map URL
  const mapUrl = location
    ? `https://static-maps.yandex.ru/1.x/?ll=${location.longitude},${location.latitude}&z=17&l=map&size=600,200&pt=${location.longitude},${location.latitude},pm2blm`
    : null;

  return (
    <div className="animate-fade-in" style={{ textAlign: 'left' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', marginBottom: '4px', color: '#fff' }}>
          Chấm Công
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Chụp ảnh và gửi yêu cầu check-in / check-out
        </p>
      </div>

      {/* Alternating sequence modal */}
      {showAlternatingModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          backdropFilter: 'blur(4px)'
        }} onClick={() => setShowAlternatingModal(false)}>
          <div style={{
            background: 'linear-gradient(180deg, #1a1a2e 0%, #16162a 100%)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '20px', padding: '32px 28px', maxWidth: '400px', width: '100%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: '36px' }}>⚠️</span>
              </div>
            </div>
            <h2 style={{ textAlign: 'center', fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>
              Không thể thực hiện
            </h2>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px' }}>
              {alternatingModalMsg}
            </p>
            {pendingRequests.filter(r => r.type === 'checkin').length > pendingRequests.filter(r => r.type === 'checkout').length && (
              <button
                onClick={() => { setShowAlternatingModal(false); handleSelectType('checkout'); }}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                  border: 'none', color: '#fff', fontSize: '15px', fontWeight: '700',
                  cursor: 'pointer', marginBottom: '10px'
                }}
              >
                🔴 Check Out ngay
              </button>
            )}
            <button
              onClick={() => setShowAlternatingModal(false)}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)',
                color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
          color: '#ef4444', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {status === 'success' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: '20px' }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <span style={{ fontSize: '48px' }}>✓</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
              {isCheckIn ? 'Check-in' : 'Check-out'} Thành Công!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '360px' }}>
              Yêu cầu của bạn đã được gửi. Quản lý sẽ duyệt trong giây lát.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={() => navigate('/attendance-history')}
              style={{ padding: '12px 24px', borderRadius: '10px', background: 'var(--primary)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              📋 Lịch sử
            </button>
            <button
              onClick={handleReset}
              style={{ padding: '12px 24px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              ↻ Tiếp tục
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: '24px', alignItems: 'start' }}>
          {/* LEFT: Camera */}
          <div>
            {/* Type selector */}
            {status === 'idle' && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                {[
                  { type: 'checkin', label: 'Check In', emoji: '🟢', desc: 'Bắt đầu ca' },
                  { type: 'checkout', label: 'Check Out', emoji: '🔴', desc: 'Kết thúc ca' }
                ].map(opt => (
                  <button
                    key={opt.type}
                    onClick={() => handleSelectType(opt.type)}
                    style={{
                      flex: 1, padding: '16px 12px', borderRadius: '12px',
                      background: selectedType === opt.type
                        ? opt.type === 'checkin' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'
                        : 'rgba(255,255,255,0.03)',
                      border: selectedType === opt.type
                        ? `2px solid ${opt.type === 'checkin' ? '#22c55e' : '#ef4444'}`
                        : '2px solid var(--border-glass)',
                      cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: '10px'
                    }}
                  >
                    <span style={{ fontSize: '28px' }}>{opt.emoji}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: selectedType === opt.type ? (opt.type === 'checkin' ? '#22c55e' : '#ef4444') : '#fff' }}>{opt.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Camera */}
            <div style={{
              background: '#000', borderRadius: '16px', overflow: 'hidden',
              position: 'relative', aspectRatio: '4/3',
              border: selectedType ? `2px solid ${accentColor}40` : '2px solid var(--border-glass)',
              transition: 'border-color 0.3s'
            }}>
              {!photoDataUrl && (
                <>
                  <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  {cameraReady && selectedType && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{ width: '60%', aspectRatio: '0.78', borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.45)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.52)' }} />
                    </div>
                  )}
                  {!cameraReady && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '36px', animation: 'pulse 1.5s infinite' }}>📷</div>
                      <div style={{ color: '#fff', fontSize: '14px' }}>Đang khởi động camera...</div>
                    </div>
                  )}
                </>
              )}

              {photoDataUrl && (
                <img src={photoDataUrl} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              )}

              {/* Type badge */}
              <div style={{ position: 'absolute', top: '14px', right: '14px', background: selectedType ? accentColor : 'rgba(0,0,0,0.5)', borderRadius: '8px', padding: '6px 12px', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>{isCheckIn ? '🟢' : '🔴'}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{isCheckIn ? 'CHECK IN' : 'CHECK OUT'}</span>
              </div>

              {/* Time overlay */}
              <div style={{ position: 'absolute', bottom: '14px', left: '14px', background: 'rgba(0,0,0,0.6)', borderRadius: '8px', padding: '8px 14px', backdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', fontFamily: 'var(--font-heading)' }}>{currentTime}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{formatDate(new Date())}</div>
              </div>

              {/* GPS badge */}
              <div style={{ position: 'absolute', bottom: '14px', right: '14px', background: location ? 'rgba(34,197,94,0.8)' : 'rgba(234,179,8,0.8)', borderRadius: '8px', padding: '6px 10px', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '12px' }}>{location ? '📍' : '⏳'}</span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#fff' }}>{location ? 'GPS' : 'GPS...'}</span>
              </div>
            </div>

            {/* Capture button */}
            {status === 'idle' && (
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={capturePhoto}
                  disabled={!cameraReady || !selectedType}
                  style={{
                    width: '100%', padding: '18px', borderRadius: '14px',
                    background: selectedType && cameraReady
                      ? (isCheckIn ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'linear-gradient(135deg, #dc2626, #ef4444)')
                      : 'rgba(255,255,255,0.05)',
                    border: 'none',
                    color: selectedType && cameraReady ? '#fff' : 'var(--text-muted)',
                    fontSize: '16px', fontWeight: '700', cursor: selectedType && cameraReady ? 'pointer' : 'not-allowed',
                    opacity: selectedType && cameraReady ? 1 : 0.5,
                    transition: 'all 0.2s',
                    boxShadow: selectedType && cameraReady ? `0 4px 24px ${isCheckIn ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}` : 'none'
                  }}
                >
                  📷 {selectedType ? 'CHỤP ẢNH' : 'Chọn Check In / Check Out trước'}
                </button>
                {!selectedType && (
                  <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Chọn loại chấm công ở trên trước</p>
                )}
              </div>
            )}

            {status === 'captured' && (
              <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                <button onClick={handleRetake} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  🔄 Chụp lại
                </button>
                <button onClick={() => { setSelectedType(''); setPhotoDataUrl(''); setStatus('idle'); }} style={{ padding: '14px 20px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  ✕ Đổi loại
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: Info panel */}
          {(status === 'captured' || status === 'submitting' || status === 'error') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Photo preview */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Ảnh đã chụp</p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <img src={photoDataUrl} alt="Thumb" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-glass)' }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: isCheckIn ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isCheckIn ? '🟢' : '🔴'} {isCheckIn ? 'Check In' : 'Check Out'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{formatDate(new Date())} · {currentTime}</div>
                  </div>
                </div>
              </div>

              {/* Location card */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>📍 Vị trí của bạn</p>
                  {addressLoading && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>đang tải...</span>}
                </div>

                {/* Mini map */}
                {location && (
                  <div style={{ borderRadius: '10px', overflow: 'hidden', marginBottom: '12px', border: '1px solid var(--border-glass)', position: 'relative' }}>
                    <img
                      src={mapUrl}
                      alt="Bản đồ vị trí"
                      style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        // Fallback: use OpenStreetMap static
                        e.target.src = `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.002},${location.latitude - 0.002},${location.longitude + 0.002},${location.latitude + 0.002}&layer=mapnik&marker=${location.latitude},${location.longitude}`;
                        e.target.style.height = '160px';
                      }}
                    />
                    <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', borderRadius: '6px', padding: '4px 8px', backdropFilter: 'blur(4px)' }}>
                      <span style={{ fontSize: '10px', color: '#fff' }}>📍 {location.accuracy ? `±${location.accuracy.toFixed(0)}m` : 'vị trí'}</span>
                    </div>
                  </div>
                )}

                {/* Address */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '10px 12px' }}>
                  {addressLoading ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ animation: 'pulse 1s infinite' }}>⏳</span> Đang lấy địa chỉ...
                    </div>
                  ) : address ? (
                    <div style={{ fontSize: '13px', color: '#fff', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <span>📍</span>
                      <span style={{ lineHeight: '1.4' }}>{address}</span>
                    </div>
                  ) : location ? (
                    <div style={{ fontSize: '13px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📍</span>
                      <span>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#eab308', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ⚠️ Chưa lấy được vị trí
                    </div>
                  )}
                </div>

                {/* Coordinates */}
                {location && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Lat: {location.latitude.toFixed(6)}</span>
                    <span>Lng: {location.longitude.toFixed(6)}</span>
                  </div>
                )}

                {/* Retry GPS */}
                {!location && (
                  <button
                    onClick={getLocation}
                    style={{
                      marginTop: '10px', width: '100%', padding: '10px', borderRadius: '8px',
                      background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)',
                      color: '#eab308', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    📍 Lấy vị trí GPS ngay
                  </button>
                )}
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading || status === 'submitting'}
                style={{
                  padding: '18px', borderRadius: '14px',
                  background: loading
                    ? 'rgba(255,255,255,0.05)'
                    : (isCheckIn ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'linear-gradient(135deg, #dc2626, #ef4444)'),
                  border: 'none',
                  color: loading ? 'var(--text-muted)' : '#fff',
                  fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s',
                  boxShadow: !loading ? `0 4px 24px ${isCheckIn ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}` : 'none'
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ animation: 'pulse 1s infinite' }}>⏳</span>
                    Đang gửi yêu cầu...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    ✓ Gửi Yêu Cầu {isCheckIn ? 'Check-in' : 'Check-out'}
                  </span>
                )}
              </button>

              <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                Yêu cầu sẽ được gửi đến quản lý để duyệt
              </p>
            </div>
          )}

          {/* RIGHT: Camera instructions (when idle) */}
          {status === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Location card (always show GPS) */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>📍 Vị trí của bạn</p>
                  {addressLoading && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>đang tải...</span>}
                </div>

                {location && (
                  <div style={{ borderRadius: '10px', overflow: 'hidden', marginBottom: '12px', border: '1px solid var(--border-glass)', position: 'relative' }}>
                    <img
                      src={mapUrl}
                      alt="Bản đồ"
                      style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        e.target.src = `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.002},${location.latitude - 0.002},${location.longitude + 0.002},${location.latitude + 0.002}&layer=mapnik&marker=${location.latitude},${location.longitude}`;
                        e.target.style.height = '160px';
                      }}
                    />
                    <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', borderRadius: '6px', padding: '4px 8px', backdropFilter: 'blur(4px)' }}>
                      <span style={{ fontSize: '10px', color: '#fff' }}>📍 {location.accuracy ? `±${location.accuracy.toFixed(0)}m` : 'vị trí'}</span>
                    </div>
                  </div>
                )}

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '10px 12px' }}>
                  {addressLoading ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ animation: 'pulse 1s infinite' }}>⏳</span> Đang lấy địa chỉ...
                    </div>
                  ) : address ? (
                    <div style={{ fontSize: '13px', color: '#fff', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <span>📍</span>
                      <span style={{ lineHeight: '1.4' }}>{address}</span>
                    </div>
                  ) : location ? (
                    <div style={{ fontSize: '13px', color: '#fff' }}>
                      📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#eab308', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ⚠️ Đang lấy vị trí GPS...
                    </div>
                  )}
                </div>

                {location && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Lat: {location.latitude.toFixed(6)}</span>
                    <span>Lng: {location.longitude.toFixed(6)}</span>
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>💡 Hướng dẫn</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    '1. Chọn Check In hoặc Check Out',
                    '2. Nhìn thẳng vào camera',
                    '3. Đặt khuôn mặt trong vòng tròn',
                    '4. Đảm bảo ánh sáng đủ',
                    '5. Chụp ảnh và gửi yêu cầu'
                  ].map((tip, i) => (
                    <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: '700' }}>›</span> {tip}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <button
          onClick={() => navigate('/attendance-history')}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          📋 Xem lịch sử yêu cầu chấm công
        </button>
      </div>
    </div>
  );
}
