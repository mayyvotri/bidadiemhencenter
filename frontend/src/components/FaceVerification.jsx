import { useState, useEffect, useRef, useCallback } from 'react';
import { faceRecognitionApi, attendanceApi } from '../services/api';

const MODEL_URL = '/models';

export default function FaceVerification({ verificationType, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(true); // models + camera loading
  const [cameraReady, setCameraReady] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [detectedUser, setDetectedUser] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectIntervalRef = useRef(null);
  const modelsLoadedRef = useRef(false);

  // ── Load face-api.js models ────────────────────────────────────────────────
  const loadModels = useCallback(async () => {
    if (window.faceapi && modelsLoadedRef.current) return true;

    return new Promise((resolve, reject) => {
      if (window.faceapi && !modelsLoadedRef.current) {
        // Models not yet loaded but library exists — try loading
      }

      const existing = document.querySelector('script[src*="face-api"]');
      if (existing) {
        // Script already added, wait a bit and check
        const check = setInterval(() => {
          if (modelsLoadedRef.current || window.faceapi?.nets?.tinyFaceDetector?._weightsLoaded) {
            clearInterval(check);
            resolve(true);
          }
        }, 200);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
      script.async = true;
      script.onload = async () => {
        try {
          await Promise.all([
            window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          ]);
          modelsLoadedRef.current = true;
          resolve(true);
        } catch (e) {
          reject(new Error('Không thể tải mô hình nhận diện khuôn mặt'));
        }
      };
      script.onerror = () => reject(new Error('Không thể tải thư viện face-api.js'));
      document.head.appendChild(script);
    });
  }, []);

  // ── Start camera ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready before marking camera as ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setCameraReady(true);
            setLoading(false);
          }).catch(() => {
            // Fallback: just set ready after metadata
            setCameraReady(true);
            setLoading(false);
          });
        };
        videoRef.current.onerror = () => {
          setError('Camera gặp lỗi');
          setLoading(false);
        };
      }
    } catch (e) {
      if (e.name === 'NotAllowedError') setError('Camera bị từ chối. Vui lòng cho phép truy cập camera.');
      else if (e.name === 'NotFoundError') setError('Không tìm thấy camera.');
      else setError('Không thể truy cập camera.');
      setLoading(false);
    }
  }, []);

  // ── Initialize on mount ───────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await loadModels();
        if (mounted) await startCamera();
      } catch (e) {
        if (mounted) { setError(e.message); setLoading(false); }
      }
    };

    init();

    return () => {
      mounted = false;
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [loadModels, startCamera]);

  // ── Real-time face detection while camera is active ───────────────────────
  useEffect(() => {
    if (!cameraReady || !videoRef.current || !canvasRef.current) return;

    const detectFace = async () => {
      try {
        const video = videoRef.current;
        if (!video || video.paused || video.ended || video.readyState < 2) return;
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        const detection = await window.faceapi
          .detectSingleFace(canvas, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
          .withFaceLandmarks();

        setFaceDetected(!!detection);
      } catch { /* silent — happens when video is not ready */ }
    };

    detectIntervalRef.current = setInterval(detectFace, 400);

    return () => {
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
    };
  }, [cameraReady]);

  // ── Verify ────────────────────────────────────────────────────────────────
  const handleVerify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      setError('Camera chưa sẵn sàng. Vui lòng đợi.');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      // Flip horizontally so the captured image matches the mirrored preview
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset

      const detection = await window.faceapi
        .detectSingleFace(canvas, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError('Không phát hiện được khuôn mặt. Hãy nhìn thẳng vào camera.');
        setVerifying(false);
        return;
      }

      const faceDescriptor = Array.from(detection.descriptor);

      // GPS location
      let location = {};
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true, timeout: 8000, maximumAge: 0
            });
          });
          location = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
        } catch { /* GPS optional */ }
      }

      // Verify face
      const verificationData = await faceRecognitionApi.verifyFace(faceDescriptor, verificationType);

      if (!verificationData.success) {
        setError(verificationData.message || 'Không thể xác thực khuôn mặt');
        setVerifying(false);
        return;
      }

      setDetectedUser(verificationData.data.user);
      setConfidence(verificationData.data.confidence);
      setSuccess(true);

      // Create attendance record
      const payload = {
        userId: verificationData.data.user._id,
        faceDescriptor,
        confidence: verificationData.data.confidence,
        ...location
      };

      const attendanceData = verificationType === 'checkin'
        ? await attendanceApi.checkInWithFace(payload)
        : await attendanceApi.checkOutWithFace(payload);

      if (attendanceData.success) {
        setTimeout(() => onSuccess(attendanceData.data), 1500);
      } else {
        setError(attendanceData.message);
        setSuccess(false);
      }
    } catch (err) {
      // Axios errors have response.data.message
      const msg = err.response?.data?.message || err.message || 'Lỗi khi xác thực khuôn mặt';
      setError(msg);
    } finally {
      setVerifying(false);
    }
  }, [verificationType, onSuccess]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📷</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Đang tải camera...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px' }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#fff', marginBottom: '8px' }}>
        Xác Thực Khuôn Mặt
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '13px' }}>
        {verificationType === 'checkin' ? 'Điểm danh vào ca bằng khuôn mặt' : 'Điểm danh ra ca bằng khuôn mặt'}
      </p>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px', padding: '12px', marginBottom: '16px',
          color: '#ef4444', fontSize: '13px'
        }}>
          {error}
        </div>
      )}

      {success && detectedUser && (
        <div style={{
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '12px', padding: '24px', marginBottom: '20px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: '#fff', marginBottom: '8px' }}>
            Xác Thực Thành Công
          </h3>
          <p style={{ color: '#fff', fontWeight: '600', marginBottom: '4px' }}>{detectedUser.name}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Độ chính xác: {confidence}%</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>Đang tạo bản ghi điểm danh...</p>
        </div>
      )}

      {/* Camera */}
      <div style={{
        background: '#000', borderRadius: '12px', overflow: 'hidden',
        position: 'relative', aspectRatio: '4/3', marginBottom: '16px'
      }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            display: 'block', transform: 'scaleX(-1)' // mirror
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Face guide overlay */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: '55%', height: '65%',
            borderRadius: '50%',
            border: faceDetected ? '2px solid #22c55e' : '2px dashed rgba(255,255,255,0.35)',
            boxShadow: faceDetected ? '0 0 24px rgba(34,197,94,0.25)' : 'none',
            transition: 'all 0.2s'
          }} />
        </div>

        {/* Status badge */}
        <div style={{
          position: 'absolute', bottom: '10px', left: '10px',
          padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
          background: faceDetected ? 'rgba(34,197,94,0.85)' : 'rgba(107,114,128,0.85)',
          color: '#fff'
        }}>
          {faceDetected ? '✓ Phát hiện khuôn mặt' : '○ Chưa phát hiện'}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleVerify}
          disabled={verifying || success}
          style={{
            flex: 1, padding: '14px 24px',
            background: verifying || success ? 'rgba(255,255,255,0.08)' : 'var(--primary)',
            border: verifying || success ? '1px solid var(--border-glass)' : 'none',
            borderRadius: '8px', color: '#fff', fontSize: '15px', fontWeight: '600',
            cursor: verifying || success ? 'not-allowed' : 'pointer',
            opacity: (verifying || success) ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
          }}
        >
          {verifying ? '⏳ Đang xác thực...' : success ? '✓ Đã xác thực' : '🔍 Xác Thực'}
        </button>
        <button
          onClick={onCancel}
          disabled={verifying}
          style={{
            flex: 1, padding: '14px 24px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid var(--border-glass)',
            borderRadius: '8px', color: '#fff', fontSize: '15px',
            cursor: verifying ? 'not-allowed' : 'pointer',
            opacity: verifying ? 0.5 : 1
          }}
        >
          Hủy
        </button>
      </div>

      {/* Guide */}
      <div style={{
        marginTop: '16px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border-glass)',
        borderRadius: '10px', padding: '14px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff', marginBottom: '8px' }}>Hướng dẫn</div>
        <ul style={{ color: 'var(--text-secondary)', fontSize: '12px', paddingLeft: '16px', lineHeight: '1.7', margin: 0 }}>
          <li>Đảm bảo ánh sáng tốt, tránh ngược sáng</li>
          <li>Nhìn thẳng vào camera — icon xanh = đã phát hiện</li>
          <li>Bỏ kính, khẩu trang, mũ trước khi xác thực</li>
          <li>Khuôn mặt cần rõ ràng trong vòng tròn hướng dẫn</li>
        </ul>
      </div>
    </div>
  );
}
