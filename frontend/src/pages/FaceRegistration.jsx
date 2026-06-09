import { useState, useEffect, useRef, useCallback } from 'react';
import { faceRecognitionApi } from '../services/api';

export default function FaceRegistration() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [capturedDescriptors, setCapturedDescriptors] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [faceProfile, setFaceProfile] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const MIN_CAPTURES = 3;
  const MAX_CAPTURES = 5;

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setLoading(false);
      }
    } catch {
      setError('Không thể truy cập camera');
      setLoading(false);
    }
  }, []);

  const loadFaceApi = useCallback(async () => {
    try {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
      script.async = true;
      script.onload = async () => {
        try {
          await window.faceapi.nets.tinyFaceDetector.loadFromUri('/models');
          await window.faceapi.nets.faceLandmark68Net.loadFromUri('/models');
          await window.faceapi.nets.faceRecognitionNet.loadFromUri('/models');
          await window.faceapi.nets.faceExpressionNet.loadFromUri('/models');
          startCamera();
        } catch {
          setError('Không thể tải mô hình nhận diện khuôn mặt');
          setLoading(false);
        }
      };
      script.onerror = () => {
        setError('Không thể tải thư viện face-api.js');
        setLoading(false);
      };
      document.head.appendChild(script);
    } catch {
      setError('Lỗi khi tải thư viện');
      setLoading(false);
    }
  }, [startCamera]);

  useEffect(() => {
    loadFaceApi();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [loadFaceApi]);

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      const detection = await window.faceapi
        .detectSingleFace(canvas, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const descriptor = Array.from(detection.descriptor);
        setCapturedDescriptors(prev => [...prev, descriptor]);
      } else {
        setError('Không phát hiện được khuôn mặt. Vui lòng thử lại.');
      }
    } catch {
      setError('Lỗi khi chụp khuôn mặt');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRegister = async () => {
    if (capturedDescriptors.length < MIN_CAPTURES) {
      setError(`Cần ít nhất ${MIN_CAPTURES} chụp khuôn mặt`);
      return;
    }

    setRegistering(true);
    setError('');

    try {
      const data = await faceRecognitionApi.registerFace(capturedDescriptors);
      if (data.success) {
        setFaceProfile(data.data);
        setCapturedDescriptors([]);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể đăng ký khuôn mặt');
    } finally {
      setRegistering(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa hồ sơ khuôn mặt?')) return;

    try {
      const data = await faceRecognitionApi.deleteFaceProfile();
      if (data.success) {
        setFaceProfile(null);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(err.message || 'Không thể xóa hồ sơ khuôn mặt');
    }
  };

  const resetCaptures = () => {
    setCapturedDescriptors([]);
    setError('');
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await faceRecognitionApi.getFaceProfile();
        if (data.success) {
          setFaceProfile(data.data);
        }
      } catch {
        // Profile doesn't exist yet
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>
        Đang tải...
      </div>
    );
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '32px', color: '#fff', marginBottom: '8px' }}>
        Đăng Ký Khuôn Mặt
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Đăng ký khuôn mặt để sử dụng tính năng điểm danh bằng nhận diện khuôn mặt.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: '#ef4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {faceProfile ? (
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#fff', marginBottom: '8px' }}>
            Đã Đăng Ký Khuôn Mặt
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Bạn đã đăng ký thành công {faceProfile.captureCount} khuôn mặt vào ngày {new Date(faceProfile.registeredAt).toLocaleDateString('vi-VN')}
          </p>
          <button
            onClick={handleDeleteProfile}
            style={{
              padding: '12px 24px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Xóa Hồ Sơ
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          <div>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', display: 'block' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={captureFace}
                disabled={isCapturing || capturedDescriptors.length >= MAX_CAPTURES}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: isCapturing || capturedDescriptors.length >= MAX_CAPTURES ? 'rgba(255, 255, 255, 0.1)' : 'var(--primary)',
                  border: isCapturing || capturedDescriptors.length >= MAX_CAPTURES ? '1px solid var(--border-glass)' : 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: isCapturing || capturedDescriptors.length >= MAX_CAPTURES ? 'not-allowed' : 'pointer',
                  opacity: isCapturing || capturedDescriptors.length >= MAX_CAPTURES ? 0.5 : 1
                }}
              >
                {isCapturing ? 'Đang chụp...' : 'Chụp Khuôn Mặt'}
              </button>
              <button
                onClick={resetCaptures}
                disabled={capturedDescriptors.length === 0}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: capturedDescriptors.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: capturedDescriptors.length === 0 ? 0.5 : 1
                }}
              >
                Đặt Lại
              </button>
            </div>
          </div>

          <div>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff', marginBottom: '16px' }}>
                Tiến Trình Đăng Ký
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Số lượng chụp:</span>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
                    {capturedDescriptors.length} / {MAX_CAPTURES}
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(capturedDescriptors.length / MAX_CAPTURES) * 100}%`,
                      background: 'var(--primary)',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
                Cần ít nhất {MIN_CAPTURES} chụp khuôn mặt để đăng ký
              </p>
              {capturedDescriptors.length >= MIN_CAPTURES && (
                <p style={{ color: '#22c55e', fontSize: '13px' }}>
                  ✓ Đã đủ số lượng chụp tối thiểu
                </p>
              )}
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: '#fff', marginBottom: '16px' }}>
                Hướng Dẫn
              </h3>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '13px', paddingLeft: '20px', lineHeight: '1.6' }}>
                <li style={{ marginBottom: '8px' }}>Đảm bảo ánh sáng tốt</li>
                <li style={{ marginBottom: '8px' }}>Nhìn thẳng vào camera</li>
                <li style={{ marginBottom: '8px' }}>Không đeo kính râm hoặc khẩu trang</li>
                <li style={{ marginBottom: '8px' }}>Chụp từ các góc độ khác nhau</li>
                <li style={{ marginBottom: '8px' }}>Đảm bảo khuôn mặt rõ nét</li>
              </ul>
            </div>

            <button
              onClick={handleRegister}
              disabled={capturedDescriptors.length < MIN_CAPTURES || registering}
              style={{
                width: '100%',
                padding: '16px 24px',
                background: capturedDescriptors.length < MIN_CAPTURES || registering ? 'rgba(255, 255, 255, 0.1)' : 'var(--primary)',
                border: capturedDescriptors.length < MIN_CAPTURES || registering ? '1px solid var(--border-glass)' : 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: capturedDescriptors.length < MIN_CAPTURES || registering ? 'not-allowed' : 'pointer',
                opacity: capturedDescriptors.length < MIN_CAPTURES || registering ? 0.5 : 1,
                marginTop: '24px'
              }}
            >
              {registering ? 'Đang đăng ký...' : 'Đăng Ký'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
