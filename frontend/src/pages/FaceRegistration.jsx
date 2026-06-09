import { useState, useEffect, useRef, useCallback } from 'react';
import { faceRecognitionApi } from '../services/api';

const MIN_SAMPLES = 5;
const MAX_SAMPLES = 10;
const MODEL_URL = '/models';

const fmtDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';

const GuideItem = ({ children }) => (
  <div style={{ marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}>{children}</div>
);

const ProgressBar = ({ current, max }) => {
  const pct = Math.round((current / max) * 100);
  const color = current >= MIN_SAMPLES ? '#22c55e' : current >= 3 ? '#f59e0b' : '#6b7280';
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Tiến độ chụp:</span>
        <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>{current} / {max} mẫu</span>
      </div>
      <div style={{ height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.4s ease, background 0.3s' }} />
      </div>
      {current < MIN_SAMPLES && (
        <p style={{ color: '#f59e0b', fontSize: '11px', marginTop: '4px' }}>
          Cần thêm {MIN_SAMPLES - current} mẫu để đăng ký
        </p>
      )}
      {current >= MIN_SAMPLES && (
        <p style={{ color: '#22c55e', fontSize: '11px', marginTop: '4px' }}>
          ✓ Đủ điều kiện đăng ký
        </p>
      )}
    </div>
  );
};

export default function FaceRegistration() {
  const [step, setStep] = useState('idle'); // idle | camera | capturing | preview | registering | success | error
  const [profile, setProfile] = useState(null);
  const [descriptors, setDescriptors] = useState([]);
  const [capturedFrames, setCapturedFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [lastCaptureTime, setLastCaptureTime] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectIntervalRef = useRef(null);
  const captureCountRef = useRef(0);

  const stopCamera = useCallback(() => {
    if (detectIntervalRef.current) { clearInterval(detectIntervalRef.current); detectIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, []);

  const loadModels = useCallback(async () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
      script.async = true;
      script.onload = async () => {
        try {
          await Promise.all([
            window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            window.faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
          ]);
          resolve();
        } catch (e) {
          reject(new Error('Không thể tải mô hình AI. Vui lòng kiểm tra kết nối mạng.'));
        }
      };
      script.onerror = () => reject(new Error('Không thể tải thư viện face-api.js'));
      document.head.appendChild(script);
    });
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
      }
    } catch (e) {
      if (e.name === 'NotAllowedError') setError('Camera bị từ chối. Vui lòng cho phép truy cập camera.');
      else if (e.name === 'NotFoundError') setError('Không tìm thấy camera. Hãy kết nối camera và thử lại.');
      else setError('Không thể truy cập camera.');
      setStep('error');
    }
  }, []);

  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.paused || video.ended) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      const detection = await window.faceapi
        .detectSingleFace(canvas, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor()
        .withFaceExpressions();

      setFaceDetected(!!detection);
    } catch { /* silent */ }
  }, [cameraReady]);

  const initCamera = useCallback(async () => {
    setStep('camera');
    setError('');
    setLoading(true);
    setDescriptors([]);
    setCapturedFrames([]);
    captureCountRef.current = 0;

    try {
      await loadModels();
      await startCamera();
    } catch (e) {
      setError(e.message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  }, [loadModels, startCamera]);

  useEffect(() => {
    if (step === 'camera' && cameraReady) {
      detectIntervalRef.current = setInterval(detectFace, 300);
    }
    return () => { if (detectIntervalRef.current) clearInterval(detectIntervalRef.current); };
  }, [step, cameraReady, detectFace]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const data = await faceRecognitionApi.getFaceProfile();
        if (data.success) setProfile(data.data);
      } catch { /* not registered yet */ }
      finally { setLoading(false); }
    };
    fetchProfile();
  }, []);

  const captureFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (!faceDetected) { setError('Không phát hiện khuôn mặt. Hãy đảm bảo khuôn mặt rõ ràng trong khung hình.'); return; }
    const now = Date.now();
    if (now - lastCaptureTime < 1500) return;
    setLastCaptureTime(now);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    try {
      const detection = await window.faceapi
        .detectSingleFace(canvas, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError('Không phát hiện được khuôn mặt. Hãy thử lại.');
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      const newCount = captureCountRef.current + 1;
      captureCountRef.current = newCount;

      // Capture video frame as thumbnail
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 120;
      thumbCanvas.height = 90;
      const thumbCtx = thumbCanvas.getContext('2d');
      thumbCtx.drawImage(video, 0, 0, 120, 90);

      setDescriptors(prev => {
        const next = [...prev, descriptor];
        return next;
      });
      setCapturedFrames(prev => {
        const next = [...prev, thumbCanvas.toDataURL('image/jpeg', 0.7)];
        return next;
      });

      if (newCount >= MAX_SAMPLES) {
        setStep('preview');
        stopCamera();
      }
    } catch (e) {
      setError('Lỗi khi chụp khuôn mặt: ' + e.message);
    }
  }, [faceDetected, lastCaptureTime, stopCamera]);

  const handleRegister = async () => {
    if (descriptors.length < MIN_SAMPLES) {
      setError(`Cần ít nhất ${MIN_SAMPLES} mẫu để đăng ký`);
      return;
    }

    setStep('registering');
    setError('');

    try {
      const data = await faceRecognitionApi.registerFace(descriptors);
      if (data.success) {
        setProfile({
          id: data.data.id,
          captureCount: data.data.captureCount,
          descriptorCount: data.data.descriptorCount,
          registeredAt: data.data.registeredAt,
          isActive: data.data.isActive
        });
        setSuccessMsg(data.data.isUpdate ? 'Đã cập nhật khuôn mặt thành công!' : 'Đăng ký khuôn mặt thành công!');
        setStep('success');
      } else {
        setError(data.message);
        setStep('preview');
      }
    } catch (e) {
      setError(e.message || 'Không thể đăng ký khuôn mặt');
      setStep('preview');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa hồ sơ khuôn mặt? Bạn sẽ không thể điểm danh bằng khuôn mặt.')) return;
    try {
      const data = await faceRecognitionApi.deleteFaceProfile();
      if (data.success) { setProfile(null); setSuccessMsg('Đã xóa hồ sơ khuôn mặt.'); setStep('idle'); }
      else { setError(data.message); }
    } catch (e) { setError(e.message); }
  };

  const resetAndRetry = () => {
    stopCamera();
    setDescriptors([]);
    setCapturedFrames([]);
    setError('');
    captureCountRef.current = 0;
    setStep('camera');
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
        <p style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</p>
      </div>
    );
  }

  // ── Registered state ───────────────────────────────────────────────────────
  if (profile && step === 'idle') {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'left', maxWidth: '600px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
          🧠 Khuôn Mặt Của Tôi
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '13px' }}>
          Quản lý hồ sơ nhận diện khuôn mặt để điểm danh tự động
        </p>

        {successMsg && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '14px', marginBottom: '20px', color: '#22c55e', fontSize: '14px' }}>
            {successMsg}
          </div>
        )}

        <div className="glass-card" style={{ padding: '28px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              ✅
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#22c55e' }}>Đã Đăng Ký</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Hồ sơ {profile.isActive ? 'đang hoạt động' : 'bị vô hiệu hóa'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Mẫu khuôn mặt', value: `${profile.captureCount} mẫu` },
              { label: 'Đăng ký lúc', value: fmtDate(profile.registeredAt) },
              { label: 'Cập nhật lúc', value: fmtDate(profile.updatedAt) },
              { label: 'Lần cuối dùng', value: fmtDate(profile.lastUsedAt) }
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Chất lượng mô hình</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                {profile.qualityScore ? `${profile.qualityScore.toFixed(1)}%` : 'Chưa đo'}
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {profile.captureCount >= 8 ? '🟢 Tốt' : profile.captureCount >= 5 ? '🟡 Trung bình' : '🔴 Cần thêm mẫu'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" onClick={initCamera} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            🔄 Cập nhật khuôn mặt
          </button>
          <button onClick={handleDelete}
            style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '13px', cursor: 'pointer' }}>
            🗑️ Xóa
          </button>
        </div>

        <div className="glass-card" style={{ padding: '16px', marginTop: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '10px' }}>Hướng dẫn</h4>
          <ul style={{ paddingLeft: '18px' }}>
            <GuideItem>Đăng ký lại nếu ngoại hình thay đổi nhiều (cắt tóc, giảm/cân nặng)</GuideItem>
            <GuideItem>Đăng ký thêm mẫu để tăng độ chính xác</GuideItem>
            <GuideItem>Mỗi lần đăng ký sẽ thay thế mẫu cũ</GuideItem>
          </ul>
        </div>
      </div>
    );
  }

  // ── Camera / Capture state ──────────────────────────────────────────────────
  if (step === 'camera' || step === 'preview' || step === 'registering' || step === 'error') {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'left', maxWidth: '700px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
          {profile ? '🔄 Cập Nhật Khuôn Mặt' : '📸 Đăng Ký Khuôn Mặt'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '13px' }}>
          Chụp {MIN_SAMPLES}–{MAX_SAMPLES} mẫu khuôn mặt từ các góc độ khác nhau
        </p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#ef4444', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {step === 'registering' && (
          <div style={{ textAlign: 'center', padding: '60px 32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}>⏳</div>
            <p style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>Đang đăng ký khuôn mặt...</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>Vui lòng chờ trong giây lát</p>
          </div>
        )}

        {step !== 'registering' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Camera */}
              <div>
                <div style={{ background: '#000', borderRadius: '12px', overflow: 'hidden', position: 'relative', aspectRatio: '4/3' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  {/* Face detection overlay */}
                  {step === 'camera' && (
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                      <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                        width: '55%', height: '65%', borderRadius: '50%',
                        border: faceDetected ? '2px solid #22c55e' : '2px dashed rgba(255,255,255,0.4)',
                        transition: 'border-color 0.2s',
                        boxShadow: faceDetected ? '0 0 20px rgba(34,197,94,0.3)' : 'none'
                      }} />
                    </div>
                  )}

                  {/* Status badge */}
                  {step === 'camera' && (
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: faceDetected ? 'rgba(34,197,94,0.85)' : 'rgba(107,114,128,0.85)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#fff', fontWeight: '600' }}>
                      {faceDetected ? '✓ Phát hiện khuôn mặt' : '○ Chưa phát hiện'}
                    </div>
                  )}
                </div>

                {step === 'camera' && (
                  <button
                    className="btn-primary"
                    onClick={captureFace}
                    disabled={!faceDetected || descriptors.length >= MAX_SAMPLES}
                    style={{ width: '100%', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: (!faceDetected || descriptors.length >= MAX_SAMPLES) ? 0.5 : 1 }}
                  >
                    📷 Chụp {descriptors.length >= MAX_SAMPLES ? '(Đã đủ)' : `(${descriptors.length}/${MAX_SAMPLES})`}
                  </button>
                )}

                {step === 'preview' && (
                  <button className="btn-secondary" onClick={resetAndRetry} style={{ width: '100%', marginTop: '12px' }}>
                    🔄 Chụp lại
                  </button>
                )}
              </div>

              {/* Right panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="glass-card" style={{ padding: '16px' }}>
                  <ProgressBar current={descriptors.length} max={MAX_SAMPLES} />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Tối thiểu {MIN_SAMPLES} mẫu — tối đa {MAX_SAMPLES} mẫu
                  </div>
                </div>

                {/* Thumbnails */}
                <div className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '10px' }}>Ảnh đã chụp ({capturedFrames.length})</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {Array.from({ length: MAX_SAMPLES }, (_, i) => (
                      <div key={i} style={{
                        aspectRatio: '4/3', borderRadius: '4px', overflow: 'hidden',
                        background: i < capturedFrames.length ? `url(${capturedFrames[i]}) center/cover` : 'rgba(255,255,255,0.05)',
                        border: i < capturedFrames.length ? '1px solid rgba(34,197,94,0.4)' : '1px dashed rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', color: 'rgba(255,255,255,0.2)'
                      }}>
                        {i < capturedFrames.length ? '' : (i + 1)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Guide */}
                <div className="glass-card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '10px' }}>Hướng dẫn</div>
                  <ul style={{ paddingLeft: '16px' }}>
                    <GuideItem>Ánh sáng tốt, tránh ngược sáng</GuideItem>
                    <GuideItem>Nhìn thẳng, nghiêng trái/phải</GuideItem>
                    <GuideItem>Bỏ kính, khẩu trang, mũ</GuideItem>
                    <GuideItem>Giữ khuôn mặt trong khung hình</GuideItem>
                    <GuideItem>Chụp đều đặn mỗi 1-2 giây</GuideItem>
                  </ul>
                </div>
              </div>
            </div>

            {/* Register button */}
            {step === 'preview' && (
              <div style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  className="btn-primary"
                  onClick={handleRegister}
                  style={{ flex: 1, padding: '14px', fontSize: '15px' }}
                >
                  ✅ Xác nhận đăng ký ({descriptors.length} mẫu)
                </button>
                <button className="btn-secondary" onClick={resetAndRetry}>Hủy</button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', padding: '80px 32px', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ fontSize: '72px', marginBottom: '24px' }}>🎉</div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#fff', marginBottom: '12px' }}>
          {successMsg}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px' }}>
          Bạn đã đăng ký thành công {profile?.captureCount || descriptors.length} mẫu khuôn mặt. Giờ có thể điểm danh bằng nhận diện khuôn mặt.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={() => window.location.href = '/attendance'} style={{ padding: '12px 24px' }}>
            🕒 Điểm danh ngay
          </button>
          <button className="btn-secondary" onClick={() => setStep('idle')} style={{ padding: '12px 24px' }}>
            ← Quay lại
          </button>
        </div>
      </div>
    );
  }

  // ── Initial / Not registered ───────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ textAlign: 'left', maxWidth: '560px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
        📸 Đăng Ký Khuôn Mặt
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '13px' }}>
        Đăng ký khuôn mặt để sử dụng tính năng điểm danh bằng nhận diện khuôn mặt thay vì thủ công
      </p>

      <div className="glass-card" style={{ padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
            🧠
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Nhận Diện Khuôn Mặt</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>face-api.js — xử lý tại thiết bị</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {[
            { icon: '📷', text: `${MIN_SAMPLES}–${MAX_SAMPLES} mẫu khuôn mặt` },
            { icon: '🔒', text: 'Dữ liệu được mã hóa' },
            { icon: '⚡', text: 'Xác thực nhanh chóng' },
            { icon: '🔄', text: 'Cập nhật không giới hạn' }
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>{item.icon}</span> {item.text}
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={initCamera} style={{ width: '100%', padding: '14px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          🚀 Bắt Đầu Đăng Ký
        </button>
      </div>

      <div className="glass-card" style={{ padding: '16px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '10px' }}>Yêu cầu trước khi đăng ký</h4>
        <ul style={{ paddingLeft: '18px' }}>
          <GuideItem>Camera được kết nối và hoạt động bình thường</GuideItem>
          <GuideItem>Cho phép trình duyệt truy cập camera</GuideItem>
          <GuideItem>Đảm bảo ánh sáng xung quanh đủ sáng</GuideItem>
          <GuideItem>Khuôn mặt rõ ràng, không bị che khuất</GuideItem>
        </ul>
      </div>
    </div>
  );
}
