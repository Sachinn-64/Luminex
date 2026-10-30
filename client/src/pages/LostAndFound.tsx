import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Detection {
  frame: number;
  timestamp_sec: number;
  frame_image: string;   // base64 full frame with bounding box
  face_crop: string;     // base64 cropped face
  bbox: number[];
  saved_file: string;
  engine?: string;       // "dlib" | "insightface" | "both"
  score?: number;        // confidence score
}

interface StreamResult {
  success: boolean;
  message: string;
  total_frames_scanned: number;
  detections: Detection[];
  person_found: boolean;
  error?: string;
}

interface VideoResult {
  success: boolean;
  message: string;
  output_video: string;
  detection_frame: string;
  detection_summary: {
    total_frames: number;
    detected_frames: number;
    detection_timestamps: number[];
    output_video_path: string;
    detection_frame_path: string | null;
  };
  error?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const API_URL = 'http://localhost:5004';
const ALLOWED_IMG = ['png', 'jpg', 'jpeg', 'gif', 'bmp'];
const ALLOWED_VID = ['mp4', 'avi', 'mov', 'mkv', 'wmv'];

// ─── Main Component ────────────────────────────────────────────────────────
export default function LostAndFound() {
  const navigate = useNavigate();
  const personInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Mode: 'camera' (live webcam) or 'video' (upload video file)
  const [mode, setMode] = useState<'camera' | 'video'>('camera');

  // Person image
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [personPreview, setPersonPreview] = useState<string | null>(null);

  // Video file (video mode only)
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // Parameters
  const [tolerance, setTolerance] = useState(0.6);
  const [frameSkip, setFrameSkip] = useState(5);
  const [scanDuration, setScanDuration] = useState(30);

  // State
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Results
  const [streamResult, setStreamResult] = useState<StreamResult | null>(null);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);

  const [dragActive, setDragActive] = useState(false);

  // Live camera
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Start / stop browser webcam when in camera mode
  useEffect(() => {
    if (mode !== 'camera') {
      // Stop camera when leaving camera mode
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
      }
      setCameraActive(false);
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
        }
        setCameraActive(true);
        setCameraError(null);
      } catch (err) {
        if (!cancelled) {
          setCameraActive(false);
          setCameraError(
            err instanceof Error
              ? `Camera access denied: ${err.message}`
              : 'Could not access camera. Please grant camera permissions.'
          );
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
      }
      setCameraActive(false);
    };
  }, [mode]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handlePersonFile = useCallback((f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_IMG.includes(ext)) {
      setError(`Invalid image format. Allowed: ${ALLOWED_IMG.join(', ')}`);
      return;
    }
    setPersonFile(f);
    setPersonPreview(URL.createObjectURL(f));
    setError(null);
    setStreamResult(null);
    setVideoResult(null);
    setSelectedDetection(null);
  }, []);

  const handleVideoFile = useCallback((f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_VID.includes(ext)) {
      setError(`Invalid video format. Allowed: ${ALLOWED_VID.join(', ')}`);
      return;
    }
    setVideoFile(f);
    setVideoPreview(URL.createObjectURL(f));
    setError(null);
  }, []);

  // ── Camera Detection (uses backend webcam via /api/detect-stream) ──────
  const detectInStream = async () => {
    if (!personFile) return;
    setLoading(true);
    setError(null);
    setStreamResult(null);
    setSelectedDetection(null);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + Math.random() * 4));
    }, 800);

    try {
      const formData = new FormData();
      formData.append('person_image', personFile);
      formData.append('tolerance', tolerance.toString());
      formData.append('frame_skip', frameSkip.toString());
      formData.append('max_seconds', scanDuration.toString());

      const res = await fetch(`${API_URL}/api/detect-stream`, {
        method: 'POST',
        body: formData,
      });

      const data: StreamResult = await res.json();
      clearInterval(interval);
      setProgress(100);

      if (!res.ok || !data.success) {
        setError(data.error || 'Stream detection failed.');
      } else {
        setStreamResult(data);
        if (data.detections.length > 0) {
          setSelectedDetection(data.detections[0]);
        }
      }
    } catch (err: unknown) {
      clearInterval(interval);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Network error: ${msg}. Make sure the API is running at ${API_URL}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Video Detection ────────────────────────────────────────────────────
  const detectInVideo = async () => {
    if (!personFile || !videoFile) return;
    setLoading(true);
    setError(null);
    setVideoResult(null);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + Math.random() * 5));
    }, 700);

    try {
      const formData = new FormData();
      formData.append('person_image', personFile);
      formData.append('crowd_video', videoFile);
      formData.append('tolerance', tolerance.toString());
      formData.append('frame_skip', frameSkip.toString());

      const res = await fetch(`${API_URL}/api/detect`, {
        method: 'POST',
        body: formData,
      });

      const data: VideoResult = await res.json();
      clearInterval(interval);
      setProgress(100);

      if (!res.ok || !data.success) {
        setError(data.error || 'Video detection failed.');
      } else {
        setVideoResult(data);
      }
    } catch (err: unknown) {
      clearInterval(interval);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Network error: ${msg}. Make sure the API is running at ${API_URL}`);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPersonFile(null);
    setPersonPreview(null);
    setVideoFile(null);
    setVideoPreview(null);
    setStreamResult(null);
    setVideoResult(null);
    setSelectedDetection(null);
    setError(null);
    setProgress(0);
    if (personInputRef.current) personInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const hasResult = streamResult || videoResult;

  // Derive layout: camera mode uses side-by-side layout
  const isCameraMode = mode === 'camera';

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingTop: '5rem', minHeight: '100vh', background: '#050508' }}>
      {/* Header */}
      <div style={{ maxWidth: isCameraMode ? '1600px' : '1200px', margin: '0 auto', padding: '2rem 2rem 0', transition: 'max-width 0.3s' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
            color: 'rgba(255,255,255,0.5)', padding: '6px 14px', fontSize: '0.75rem',
            cursor: 'pointer', marginBottom: '1.5rem', transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.color = '#93c5fd'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
        >
          ← Back to Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.3rem' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
          }}>
            🔍
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
              Biometric Module
            </p>
            <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
              Lost & Found — Person Finder
            </h1>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
          Upload a photo of the missing person. The system will scan the live CCTV stream or uploaded video to locate them using facial recognition.
        </p>
        <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(59,130,246,0.3), transparent)' }} />
      </div>

      <div style={{ maxWidth: isCameraMode ? '1600px' : '1200px', margin: '0 auto', padding: '2rem', transition: 'max-width 0.3s' }}>
        <div style={{
          display: isCameraMode ? 'grid' : 'block',
          gridTemplateColumns: isCameraMode ? '1fr 400px' : '1fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}>
          {/* ═══ Left Column — Controls & Results ═══ */}
          <div>
        {/* ── Mode Selector ───────────────────────────────────────── */}
        {!hasResult && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
            {(['camera', 'video'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                  background: mode === m
                    ? (m === 'camera' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)')
                    : 'rgba(255,255,255,0.04)',
                  color: mode === m ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.3s',
                }}
              >
                {m === 'camera' ? '📹  Live Camera' : '🎥  Upload Video'}
              </button>
            ))}
          </div>
        )}

        {/* ── Upload Area ─────────────────────────────────────────── */}
        {!hasResult && (
          <div style={{ display: 'grid', gridTemplateColumns: mode === 'video' ? '1fr 1fr' : '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Person Image Upload */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) handlePersonFile(e.dataTransfer.files[0]); }}
              onClick={() => personInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '16px', padding: '2rem',
                background: dragActive ? 'rgba(59,130,246,0.05)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'all 0.3s', textAlign: 'center',
                minHeight: '260px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <input
                ref={personInputRef}
                type="file"
                accept={ALLOWED_IMG.map((e) => `.${e}`).join(',')}
                onChange={(e) => { if (e.target.files?.[0]) handlePersonFile(e.target.files[0]); }}
                style={{ display: 'none' }}
              />

              {personPreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src={personPreview}
                    alt="Person"
                    style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(59,130,246,0.4)' }}
                  />
                  <p style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>{personFile?.name}</p>
                  <p style={{ color: 'rgba(59,130,246,0.7)', fontSize: '0.7rem', margin: 0 }}>Click to change</p>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.4 }}>👤</div>
                  <p style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, margin: 0 }}>Upload Person's Photo</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '0.3rem' }}>Drag & drop or click to browse</p>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', marginTop: '0.75rem' }}>
                    Use a clear face photo for best results · JPG, PNG, BMP
                  </p>
                </>
              )}
            </div>

            {/* Video Upload (video mode only) */}
            {mode === 'video' && (
              <div
                onClick={() => videoInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(255,255,255,0.1)',
                  borderRadius: '16px', padding: '2rem',
                  background: 'rgba(255,255,255,0.02)',
                  cursor: 'pointer', transition: 'all 0.3s', textAlign: 'center',
                  minHeight: '260px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  accept={ALLOWED_VID.map((e) => `.${e}`).join(',')}
                  onChange={(e) => { if (e.target.files?.[0]) handleVideoFile(e.target.files[0]); }}
                  style={{ display: 'none' }}
                />

                {videoFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    {videoPreview && (
                      <video src={videoPreview} controls style={{ width: '100%', maxHeight: '180px', borderRadius: '10px' }} />
                    )}
                    <p style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{videoFile.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0 }}>
                      {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.4 }}>🎬</div>
                    <p style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, margin: 0 }}>Upload Crowd Video</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '0.3rem' }}>MP4, AVI, MOV — Max 100 MB</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Parameters ──────────────────────────────────────────── */}
        {!hasResult && personFile && (
          <div style={{
            display: 'grid', gridTemplateColumns: isCameraMode ? '1fr 1fr 1fr' : '1fr 1fr',
            gap: '1rem', marginBottom: '1.5rem', padding: '1.25rem', borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Tolerance ({tolerance})
              </label>
              <input
                type="range" min="0.3" max="0.9" step="0.05" value={tolerance}
                onChange={(e) => setTolerance(parseFloat(e.target.value))}
                style={{ width: '100%', marginTop: '0.4rem', accentColor: '#3b82f6' }}
              />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', margin: '0.2rem 0 0' }}>Lower = stricter matching</p>
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Frame Skip ({frameSkip})
              </label>
              <input
                type="range" min="1" max="15" step="1" value={frameSkip}
                onChange={(e) => setFrameSkip(parseInt(e.target.value))}
                style={{ width: '100%', marginTop: '0.4rem', accentColor: '#3b82f6' }}
              />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', margin: '0.2rem 0 0' }}>Process every Nth frame</p>
            </div>
            {isCameraMode && (
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Scan Duration ({scanDuration}s)
                </label>
                <input
                  type="range" min="10" max="120" step="5" value={scanDuration}
                  onChange={(e) => setScanDuration(parseInt(e.target.value))}
                  style={{ width: '100%', marginTop: '0.4rem', accentColor: '#3b82f6' }}
                />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', margin: '0.2rem 0 0' }}>Seconds to scan via camera</p>
              </div>
            )}
          </div>
        )}

        {/* ── Action Buttons ──────────────────────────────────────── */}
        {!hasResult && personFile && (isCameraMode || videoFile) && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button
              onClick={isCameraMode ? detectInStream : detectInVideo}
              disabled={loading}
              style={{
                flex: 1, padding: '14px 28px', borderRadius: '12px', border: 'none',
                background: loading
                  ? 'rgba(59,130,246,0.3)'
                  : isCameraMode
                    ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                    : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s', letterSpacing: '0.03em',
              }}
            >
              {loading
                ? (isCameraMode ? 'Scanning Camera…' : 'Analyzing Video…')
                : (isCameraMode ? '📹  Start Live Camera Scan' : '🔍  Search in Video')}
            </button>
            {!loading && (
              <button
                onClick={reset}
                style={{
                  padding: '14px 24px', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                  color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* ── Progress Bar ────────────────────────────────────────── */}
        {loading && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '3px',
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                width: `${progress}%`, transition: 'width 0.5s ease',
              }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'center' }}>
              {isCameraMode
                ? `Scanning live camera for ~${scanDuration}s… Face recognition in progress.`
                : 'Processing video frames… This may take a few minutes for longer videos.'}
            </p>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────── */}
        {error && (
          <div style={{
            padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '2rem',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          }}>
            <p style={{ color: '#ef4444', margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STREAM RESULTS
           ══════════════════════════════════════════════════════════ */}
        {streamResult && (
          <>
            {/* Summary banner */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1.25rem 1.5rem', borderRadius: '14px', marginBottom: '1.5rem',
              background: streamResult.person_found ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${streamResult.person_found ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>{streamResult.person_found ? '✅' : '❌'}</span>
                <div>
                  <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                    {streamResult.person_found
                      ? `Person Found! ${streamResult.detections.length} detection(s)`
                      : 'Person Not Found in Stream'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', margin: '0.15rem 0 0' }}>
                    Scanned {streamResult.total_frames_scanned} frames · {streamResult.message}
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                style={{
                  padding: '8px 18px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
                  color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                New Search
              </button>
            </div>

            {/* Detections grid */}
            {streamResult.detections.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
                {/* Selected detection detail */}
                <div style={{
                  borderRadius: '14px', padding: '1.5rem',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {selectedDetection ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 0.3rem' }}>
                            Frame #{selectedDetection.frame} · {selectedDetection.timestamp_sec}s
                          </p>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: '#22c55e', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)',
                              borderRadius: '6px', padding: '3px 10px',
                            }}>
                              ✓ Person Found
                            </span>
                            {selectedDetection.engine && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                                color: selectedDetection.engine === 'both' ? '#a78bfa' : selectedDetection.engine === 'insightface' ? '#38bdf8' : '#fbbf24',
                                background: selectedDetection.engine === 'both' ? 'rgba(167,139,250,0.10)' : selectedDetection.engine === 'insightface' ? 'rgba(56,189,248,0.10)' : 'rgba(251,191,36,0.10)',
                                border: `1px solid ${selectedDetection.engine === 'both' ? 'rgba(167,139,250,0.3)' : selectedDetection.engine === 'insightface' ? 'rgba(56,189,248,0.3)' : 'rgba(251,191,36,0.3)'}`,
                                borderRadius: '6px', padding: '3px 10px',
                              }}>
                                {selectedDetection.engine === 'both' ? '◆ Both Engines' : selectedDetection.engine === 'insightface' ? '◈ ArcFace' : '◇ dlib'}
                                {selectedDetection.score != null && ` · ${(selectedDetection.score * 100).toFixed(1)}%`}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Face crop */}
                        <img
                          src={selectedDetection.face_crop}
                          alt="Face"
                          style={{
                            width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover',
                            border: '3px solid rgba(34,197,94,0.4)',
                          }}
                        />
                      </div>

                      {/* Full frame screenshot */}
                      <div style={{
                        borderRadius: '10px', overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.08)', background: '#000',
                      }}>
                        <img
                          src={selectedDetection.frame_image}
                          alt={`Detection at ${selectedDetection.timestamp_sec}s`}
                          style={{ width: '100%', display: 'block' }}
                        />
                      </div>

                      {/* Download link */}
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                        <a
                          href={`${API_URL}/api/download/${selectedDetection.saved_file}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '8px 16px', borderRadius: '8px',
                            background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
                            color: '#93c5fd', fontSize: '0.75rem', fontWeight: 600,
                            textDecoration: 'none', display: 'inline-block',
                          }}
                        >
                          ↓ Download Frame
                        </a>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>Select a detection →</p>
                    </div>
                  )}
                </div>

                {/* Detection timeline */}
                <div style={{
                  borderRadius: '14px', padding: '1rem',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  maxHeight: '550px', overflowY: 'auto',
                }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 0.75rem', padding: '0 0.25rem' }}>
                    Detections ({streamResult.detections.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {streamResult.detections.map((det, idx) => {
                      const isSelected = selectedDetection?.frame === det.frame;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedDetection(det)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.6rem 0.7rem', borderRadius: '10px', width: '100%',
                            border: isSelected ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.04)',
                            background: isSelected ? 'rgba(34,197,94,0.08)' : 'transparent',
                            cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                          }}
                        >
                          <img
                            src={det.face_crop}
                            alt="Face"
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(34,197,94,0.3)', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <p style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 600, margin: 0 }}>
                              Detection #{idx + 1}
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', margin: '0.1rem 0 0' }}>
                              Frame {det.frame} · {det.timestamp_sec}s
                              {det.engine && (
                                <span style={{
                                  marginLeft: '0.4rem',
                                  color: det.engine === 'both' ? '#a78bfa' : det.engine === 'insightface' ? '#38bdf8' : '#fbbf24',
                                  fontWeight: 600,
                                }}>
                                  · {det.engine === 'both' ? 'Both' : det.engine === 'insightface' ? 'ArcFace' : 'dlib'}
                                </span>
                              )}
                            </p>
                          </div>
                          <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: '#22c55e', boxShadow: '0 0 6px #22c55e', flexShrink: 0,
                          }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            VIDEO RESULTS
           ══════════════════════════════════════════════════════════ */}
        {videoResult && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1.25rem 1.5rem', borderRadius: '14px', marginBottom: '1.5rem',
              background: videoResult.detection_summary.detected_frames > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${videoResult.detection_summary.detected_frames > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>
                  {videoResult.detection_summary.detected_frames > 0 ? '✅' : '❌'}
                </span>
                <div>
                  <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                    {videoResult.detection_summary.detected_frames > 0
                      ? `Person Found in ${videoResult.detection_summary.detected_frames} frame(s)!`
                      : 'Person Not Found in Video'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', margin: '0.15rem 0 0' }}>
                    Processed {videoResult.detection_summary.total_frames} frames
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                style={{
                  padding: '8px 18px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
                  color: '#fff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                New Search
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total Frames', value: videoResult.detection_summary.total_frames, color: '#3b82f6' },
                { label: 'Detections', value: videoResult.detection_summary.detected_frames, color: '#22c55e' },
                { label: 'Timestamps', value: videoResult.detection_summary.detection_timestamps.length, color: '#f59e0b' },
              ].map((s) => (
                <div key={s.label} style={{
                  padding: '1rem', borderRadius: '12px', textAlign: 'center',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <p style={{ color: s.color, fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>{s.value}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '0.2rem 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Detection timestamps */}
            {videoResult.detection_summary.detection_timestamps.length > 0 && (
              <div style={{
                padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '2rem',
                background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Detection Timestamps
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {videoResult.detection_summary.detection_timestamps.map((t, i) => (
                    <span key={i} style={{
                      display: 'inline-block', fontSize: '0.7rem', fontWeight: 600,
                      color: '#22c55e', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                      borderRadius: '6px', padding: '4px 10px',
                    }}>
                      {t.toFixed(2)}s
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Video + Detection Frame */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Output video */}
              <div style={{
                borderRadius: '14px', overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)', background: '#0a0b12',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '1rem 1rem 0.5rem' }}>
                  Output Video
                </p>
                <video
                  src={`${API_URL}/api/view/${videoResult.output_video}`}
                  controls
                  style={{ width: '100%', display: 'block' }}
                />
                <div style={{ padding: '0.75rem 1rem' }}>
                  <a
                    href={`${API_URL}/api/download/${videoResult.output_video}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '6px 14px', borderRadius: '6px',
                      background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
                      color: '#93c5fd', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none',
                    }}
                  >
                    ↓ Download Video
                  </a>
                </div>
              </div>

              {/* Detection frame image */}
              {videoResult.detection_summary.detection_frame_path && (
                <div style={{
                  borderRadius: '14px', overflow: 'hidden',
                  border: '1px solid rgba(34,197,94,0.2)', background: '#0a0b12',
                }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '1rem 1rem 0.5rem' }}>
                    First Detection Frame
                  </p>
                  <img
                    src={`${API_URL}/api/view/${videoResult.detection_frame}`}
                    alt="Detection"
                    style={{ width: '100%', display: 'block' }}
                  />
                  <div style={{ padding: '0.75rem 1rem' }}>
                    <a
                      href={`${API_URL}/api/download/${videoResult.detection_frame}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '6px 14px', borderRadius: '6px',
                        background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                        color: '#86efac', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none',
                      }}
                    >
                      ↓ Download Frame
                    </a>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
          </div>

          {/* ═══ Right Column — Live Camera Preview ═══ */}
          {isCameraMode && (
            <div style={{
              position: 'sticky', top: '6rem',
              borderRadius: '16px', overflow: 'hidden',
              border: `1px solid ${cameraActive ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)'}`,
              background: '#0a0b12',
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'rgba(59,130,246,0.06)',
                borderBottom: '1px solid rgba(59,130,246,0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: cameraActive ? '#22c55e' : '#ef4444',
                    boxShadow: cameraActive ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
                    animation: cameraActive ? 'pulse-dot 1.6s ease-in-out infinite' : 'none',
                  }} />
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {cameraActive ? 'Camera Active' : 'Camera Off'}
                  </span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem' }}>
                  📹 Webcam
                </span>
              </div>

              {/* Video player — browser webcam */}
              <div style={{ position: 'relative', background: '#000', minHeight: '240px' }}>
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%', height: '280px', display: 'block',
                    objectFit: 'cover', transform: 'scaleX(-1)',
                  }}
                />

                {/* Offline / error overlay */}
                {!cameraActive && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '0.75rem',
                  }}>
                    <div style={{ fontSize: '2.5rem', opacity: 0.3 }}>📹</div>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>
                      {cameraError ? 'Camera Error' : 'Starting Camera…'}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.68rem', margin: 0, textAlign: 'center', padding: '0 1rem' }}>
                      {cameraError || 'Requesting camera permission…'}
                    </p>
                  </div>
                )}

                {/* Scanning overlay */}
                {loading && isCameraMode && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(2px)',
                  }}>
                    <div style={{
                      width: '50px', height: '50px', border: '3px solid rgba(59,130,246,0.3)',
                      borderTop: '3px solid #3b82f6', borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                    <p style={{ color: '#93c5fd', fontSize: '0.78rem', fontWeight: 600, marginTop: '0.75rem' }}>
                      Scanning camera…
                    </p>
                  </div>
                )}
              </div>

              {/* Info footer */}
              <div style={{
                padding: '0.6rem 1rem',
                background: 'rgba(255,255,255,0.02)',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>
                  Device Webcam
                </span>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem' }}>
                  getUserMedia · 720p
                </span>
              </div>
            </div>
          )}

        </div>{/* end grid */}
      </div>{/* end max-width container */}

      {/* Spinner keyframe (injected once) */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
