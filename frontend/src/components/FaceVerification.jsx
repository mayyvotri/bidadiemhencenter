import { useState, useEffect, useRef, useCallback } from 'react';
import { faceRecognitionApi, attendanceApi } from '../services/api';

export default function FaceVerification({ verificationType, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [detectedUser, setDetectedUser] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const loadFaceApi = useCallback(async () => {
    try {
      if (window.faceapi) {
        startCamera();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
      script.async = true;
      script.onload = async () => {
        try {
          await window.faceapi.nets.tinyFaceDetector.loadFromUri('/models');
          await window.faceapi.nets.faceLandmark68Net.loadFromUri('/models');
          await window.faceapi.nets.faceRecognitionNet.loadFromUri('/models');
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
  }, []);

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

  useEffect(() => {
    loadFaceApi();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [loadFaceApi]);

  const handleVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setVerifying(true);
    setError('');

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

      if (!detection) {
        setError('Không phát hiện được khuôn mặt. Vui lòng thử lại.');
        setVerifying(false);
        return;
      }

      const faceDescriptor = Array.from(detection.descriptor);

      // Get GPS location
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
        } catch (err) {
          console.error('GPS error:', err);
        }
      }

      // Verify face with backend
      const verificationData = await faceRecognitionApi.verifyFace(faceDescriptor, verificationType);

      if (verificationData.success) {
        setDetectedUser(verificationData.data.user);
        setConfidence(verificationData.data.confidence);
        setSuccess(true);

        // Create attendance record
        const attendanceData = verificationType === 'checkin'
          ? await attendanceApi.checkInWithFace({
              userId: verificationData.data.user._id,
              faceDescriptor,
              confidence: verificationData.data.confidence,
              ...location
            })
          : await attendanceApi.checkOutWithFace({
              userId: verificationData.data.user._id,
              faceDescriptor,
              confidence: verificationData.data.confidence,
              ...location
            });

        if (attendanceData.success) {
          setTimeout(() => {
            onSuccess(attendanceData.data);
          }, 2000);
        } else {
          setError(attendanceData.message);
          setSuccess(false);
        }
      } else {
        setError(verificationData.message || 'Không thể xác thực khuôn mặt');
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi xác thực khuôn mặt');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>
        Đang tải...
      </div>
    );
  }

  return (
    <div style={{ padding: '32px' }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#fff', marginBottom: '8px' }}>
        Xác Thực Khuôn Mặt
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        {verificationType === 'checkin' ? 'Điểm danh vào ca bằng khuôn mặt' : 'Điểm danh ra ca bằng khuôn mặt'}
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '20px', color: '#ef4444', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {success && detectedUser && (
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: '#fff', marginBottom: '8px' }}>
            Xác Thực Thành Công
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
            {detectedUser.name}
          </p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Độ chính xác: {confidence}%
          </p>
        </div>
      )}

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
          onClick={handleVerify}
          disabled={verifying || success}
          style={{
            flex: 1,
            padding: '16px 24px',
            background: verifying || success ? 'rgba(255, 255, 255, 0.1)' : 'var(--primary)',
            border: verifying || success ? '1px solid var(--border-glass)' : 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '600',
            cursor: verifying || success ? 'not-allowed' : 'pointer',
            opacity: verifying || success ? 0.5 : 1
          }}
        >
          {verifying ? 'Đang xác thực...' : success ? 'Đã xác thực' : 'Xác Thực'}
        </button>
        <button
          onClick={onCancel}
          disabled={verifying}
          style={{
            flex: 1,
            padding: '16px 24px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid var(--border-glass)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '16px',
            cursor: verifying ? 'not-allowed' : 'pointer',
            opacity: verifying ? 0.5 : 1
          }}
        >
          Hủy
        </button>
      </div>

      <div style={{ marginTop: '24px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', color: '#fff', marginBottom: '12px' }}>
          Hướng Dẫn
        </h3>
        <ul style={{ color: 'var(--text-secondary)', fontSize: '13px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li style={{ marginBottom: '4px' }}>Đảm bảo ánh sáng tốt</li>
          <li style={{ marginBottom: '4px' }}>Nhìn thẳng vào camera</li>
          <li style={{ marginBottom: '4px' }}>Không đeo kính râm hoặc khẩu trang</li>
          <li style={{ marginBottom: '4px' }}>Đảm bảo khuôn mặt rõ nét</li>
        </ul>
      </div>
    </div>
  );
}
