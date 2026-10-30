import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShieldAlert, Radio, Upload, Play, AlertTriangle,
  CheckCircle2, XCircle, Loader2, Target, Crosshair,
  Flame, Swords, Eye, RefreshCw, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GLASS = "bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl";

// ─── Types ──────────────────────────────────────────────────────────────────
interface PersonImage {
  image: string;
  confidence: number;
  bbox: number[];
}

interface FrameAnalysis {
  status: 'safe' | 'anomaly' | 'danger' | 'critical' | 'error';
  summary: string;
  weapons: string[];
  fighting_detected: boolean;
  fire_detected: boolean;
  suspicious_activity: boolean;
}

interface FrameResult {
  frame: number;
  timestamp_sec: number;
  analysis: FrameAnalysis;
  frame_screenshot?: string;
  person_images?: PersonImage[];
}

interface AnalysisResponse {
  success: boolean;
  results: FrameResult[];
  total_frames: number;
  threats_detected: number;
  error?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const API_URL = 'http://localhost:5002';
const STREAM_WEBRTC_URL = 'http://localhost:8889/webcam/';

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any; label: string }> = {
  safe:     { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: CheckCircle2, label: 'Safe' },
  anomaly:  { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle, label: 'Anomaly' },
  danger:   { color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: XCircle, label: 'Danger' },
  critical: { color: 'text-red-600', bg: 'bg-red-600/15', border: 'border-red-600/50', icon: ShieldAlert, label: 'Critical' },
  error:    { color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: AlertTriangle, label: 'Error' },
};

const ALLOWED_EXT = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'jpg', 'jpeg', 'png'];

// ─── Utility Components ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.error;
  const Icon = cfg.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border",
      cfg.color, cfg.bg, cfg.border
    )}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

function TagPill({ label, variant = 'default' }: { label: string; variant?: 'default' | 'danger' | 'warning' | 'fire' }) {
  const styles = {
    default: "text-rose-400 bg-rose-400/10 border-rose-400/30",
    danger: "text-red-500 bg-red-500/10 border-red-500/30",
    warning: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    fire: "text-orange-500 bg-orange-500/10 border-orange-500/30",
  };
  return (
    <span className={cn(
      "inline-flex items-center text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border",
      styles[variant]
    )}>
      {label}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function WeaponDetection() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode: 'stream' (live RTSP) or 'video' (upload file)
  const [mode, setMode] = useState<'stream' | 'video'>('stream');

  // Video mode state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Stream parameters
  const [scanDuration, setScanDuration] = useState(30);
  const [intervalSec, setIntervalSec] = useState(3);

  // Common state
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<FrameResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Live stream
  const [streamOnline, setStreamOnline] = useState(false);
  const iframeKey = useRef(0);
  const [iframeReloadKey, setIframeReloadKey] = useState(0);

  // ── WHEP probe for stream online/offline ─────────────────────────────
  useEffect(() => {
    if (mode !== 'stream') return;

    let cancelled = false;
    let wasOnline = false;

    const checkStream = async () => {
      try {
        const res = await fetch(`${STREAM_WEBRTC_URL}whep`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: 'v=0',
        });
        if (cancelled) return;
        const online = res.status !== 404;
        if (online && !wasOnline) {
          iframeKey.current += 1;
          setIframeReloadKey(iframeKey.current);
        }
        wasOnline = online;
        setStreamOnline(online);
      } catch {
        if (!cancelled) { wasOnline = false; setStreamOnline(false); }
      }
    };

    checkStream();
    const interval = setInterval(checkStream, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [mode]);

  // ── File handling (video mode) ──────────────────────────────────────
  const handleFile = useCallback((f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXT.includes(ext)) {
      setError(`Unsupported file type. Allowed: ${ALLOWED_EXT.join(', ')}`);
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setError('File size exceeds 100 MB limit.');
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
    setSelectedFrame(null);

    if (f.type.startsWith('image/') || f.type.startsWith('video/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  // ── Analyze uploaded file (video mode) ─────────────────────────────
  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedFrame(null);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + Math.random() * 8));
    }, 600);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data: AnalysisResponse = await res.json();
      clearInterval(interval);
      setProgress(100);

      if (!res.ok || !data.success) {
        setError(data.error || 'Analysis failed. Please try again.');
      } else {
        setResult(data);
        const firstThreat = data.results.find(
          (r) => r.analysis.status !== 'safe' && r.analysis.status !== 'error'
        );
        setSelectedFrame(firstThreat || data.results[0] || null);
      }
    } catch (err: unknown) {
      clearInterval(interval);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Network error: ${message}. Make sure the API is running at ${API_URL}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Scan live stream (stream mode) ─────────────────────────────────
  const analyzeStream = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedFrame(null);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + Math.random() * 3));
    }, 1000);

    try {
      const formData = new FormData();
      formData.append('max_seconds', scanDuration.toString());
      formData.append('interval_sec', intervalSec.toString());

      const res = await fetch(`${API_URL}/analyze-stream`, {
        method: 'POST',
        body: formData,
      });

      const data: AnalysisResponse = await res.json();
      clearInterval(interval);
      setProgress(100);

      if (!res.ok || !data.success) {
        setError(data.error || 'Stream analysis failed.');
      } else {
        setResult(data);
        const firstThreat = data.results.find(
          (r) => r.analysis.status !== 'safe' && r.analysis.status !== 'error'
        );
        setSelectedFrame(firstThreat || data.results[0] || null);
      }
    } catch (err: unknown) {
      clearInterval(interval);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Network error: ${message}. Make sure the API is running at ${API_URL}`);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setSelectedFrame(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Computed Stats ─────────────────────────────────────────────────
  const stats = result
    ? {
        total: result.total_frames,
        safe: result.results.filter((r) => r.analysis.status === 'safe').length,
        anomaly: result.results.filter((r) => r.analysis.status === 'anomaly').length,
        danger: result.results.filter((r) => r.analysis.status === 'danger').length,
        critical: result.results.filter((r) => r.analysis.status === 'critical').length,
        weaponsFound: [...new Set(result.results.flatMap((r) => r.analysis.weapons))],
        fightingFrames: result.results.filter((r) => r.analysis.fighting_detected).length,
        fireFrames: result.results.filter((r) => r.analysis.fire_detected).length,
      }
    : null;

  const overallStatus = stats
    ? stats.critical > 0
      ? 'critical'
      : stats.danger > 0
        ? 'danger'
        : stats.anomaly > 0
          ? 'anomaly'
          : 'safe'
    : null;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="pt-20 min-h-screen bg-background pb-20">
      {/* Header */}
      <header className={cn('rounded-xl h-24 lg:h-28 flex flex-col justify-center px-5 lg:px-8 mb-6 relative overflow-hidden mx-4 sm:mx-6 lg:mx-8 max-w-[1600px] xl:mx-auto', GLASS)}>
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-transparent pointer-events-none" />
        <div className="flex items-center gap-4 lg:gap-6 relative z-10">
          <button
            onClick={() => navigate('/dashboard')}
            className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-violet-500/20 hover:border-violet-500/30 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-10 w-px bg-white/10 hidden sm:block" />
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center shadow-lg shadow-violet-500/5">
                <Target className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-violet-400/80 mb-0.5">
                  Security Module
                </p>
                <h1 className="text-xl lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                  Weapon & Threat Detection
                </h1>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 hidden md:block max-w-2xl">
              Scan live CCTV streams or upload footage. AI analyzes each frame for weapons, fighting, fire, and suspicious activity.
            </p>
          </div>
        </div>
      </header>

      <div className={cn("mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300", mode === 'stream' ? 'max-w-[1600px]' : 'max-w-[1200px]')}>
        <div className={cn(
          "grid gap-6 lg:gap-8 items-start",
          mode === 'stream' ? "grid-cols-1 lg:grid-cols-[1fr_400px]" : "grid-cols-1"
        )}>
          {/* ═══ Left Column — Controls & Results ═══ */}
          <div className="space-y-6">
        {/* ── Mode Selector ───────────────────────────────────────── */}
        {!result && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
            {(['stream', 'video'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                  background: mode === m
                    ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                    : 'rgba(255,255,255,0.04)',
                  color: mode === m ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.3s',
                }}
              >
                {m === 'stream' ? '📡  Live Stream Scan' : '🎥  Upload Video'}
              </button>
            ))}
          </div>
        )}

        {/* ── Upload Area (video mode) ────────────────────────────── */}
        {mode === 'video' && !result && (
          <div style={{ display: 'grid', gridTemplateColumns: file ? '1fr 1fr' : '1fr', gap: '2rem', marginBottom: '2rem' }}>
            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '16px', padding: '3rem 2rem',
                background: dragActive ? 'rgba(139,92,246,0.05)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'all 0.3s', textAlign: 'center',
                minHeight: '280px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_EXT.map((e) => `.${e}`).join(',')}
                onChange={onFileChange}
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}>
                {file ? '📁' : '📤'}
              </div>
              {file ? (
                <>
                  <p style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, margin: 0 }}>{file.name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <p style={{ color: 'rgba(139,92,246,0.7)', fontSize: '0.7rem', marginTop: '0.5rem' }}>
                    Click to change file
                  </p>
                </>
              ) : (
                <>
                  <p style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                    Drop a video or image here
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                    or click to browse
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', marginTop: '1rem' }}>
                    Supported: MP4, AVI, MOV, MKV, WebM, JPG, PNG — Max 100 MB
                  </p>
                </>
              )}
            </div>

            {/* Preview */}
            {file && preview && (
              <div style={{
                borderRadius: '16px', overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)', background: '#0a0b12',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '280px',
              }}>
                {file.type.startsWith('video/') ? (
                  <video
                    src={preview}
                    controls
                    style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '350px' }}
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '350px' }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Stream Parameters ────────────────────────────────────── */}
        {mode === 'stream' && !result && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '1rem', marginBottom: '1.5rem', padding: '1.25rem', borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Scan Duration ({scanDuration}s)
              </label>
              <input
                type="range" min="10" max="120" step="5" value={scanDuration}
                onChange={(e) => setScanDuration(parseInt(e.target.value))}
                style={{ width: '100%', marginTop: '0.4rem', accentColor: '#8b5cf6' }}
              />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', margin: '0.2rem 0 0' }}>
                How long to scan the live stream
              </p>
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Snapshot Interval ({intervalSec}s)
              </label>
              <input
                type="range" min="1" max="10" step="1" value={intervalSec}
                onChange={(e) => setIntervalSec(parseInt(e.target.value))}
                style={{ width: '100%', marginTop: '0.4rem', accentColor: '#8b5cf6' }}
              />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', margin: '0.2rem 0 0' }}>
                Seconds between each Gemini AI snapshot
              </p>
            </div>
          </div>
        )}

        {/* ── Action Buttons ───────────────────────────────────────── */}
        {!result && (mode === 'stream' || (mode === 'video' && file)) && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button
              onClick={mode === 'stream' ? analyzeStream : analyze}
              disabled={loading}
              style={{
                flex: 1, padding: '14px 28px', borderRadius: '12px', border: 'none',
                background: loading
                  ? 'rgba(139,92,246,0.3)'
                  : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s', letterSpacing: '0.03em',
              }}
            >
              {loading
                ? (mode === 'stream' ? 'Scanning Live Stream…' : 'Analyzing…')
                : (mode === 'stream' ? '📡  Scan Live Stream for Threats' : '��  Analyze for Threats')}
            </button>
            {!loading && (
              <button
                onClick={reset}
                style={{
                  padding: '14px 24px', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                  color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '0.85rem',
                  cursor: 'pointer', transition: 'all 0.3s',
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* ── Progress bar ─────────────────────────────────────────── */}
        {loading && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              width: '100%', height: '6px', borderRadius: '3px',
              background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: '3px',
                background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                width: `${progress}%`, transition: 'width 0.5s ease',
              }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'center' }}>
              {mode === 'stream'
                ? `Scanning live stream for ~${scanDuration}s — sending snapshots to Gemini AI every ${intervalSec}s…`
                : 'Analyzing frames with Gemini AI… This may take a minute for longer videos.'}
            </p>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '2rem',
            background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)',
          }}>
            <p style={{ color: '#a78bfa', margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
              ⚠️ {error}
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            RESULTS (shared for both modes)
           ══════════════════════════════════════════════════════════ */}
        {result && stats && (
          <div className="space-y-6">
            {/* Overall summary bar */}
            <div className={cn(
              "flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl border",
              STATUS_CONFIG[overallStatus || 'safe'].bg,
              STATUS_CONFIG[overallStatus || 'safe'].border
            )}>
              <div className="flex items-center gap-4">
                <span className="text-3xl">
                  {overallStatus === 'critical' ? '🚨' : overallStatus === 'danger' ? '⛔' : overallStatus === 'anomaly' ? '⚠️' : '✅'}
                </span>
                <div>
                  <p className="text-white text-lg font-bold">
                    {overallStatus === 'safe' ? 'All Clear — No Threats Detected' :
                     overallStatus === 'anomaly' ? 'Suspicious Activity Detected' :
                     overallStatus === 'danger' ? 'Threats Detected!' :
                     'Critical Threats Detected!'}
                  </p>
                  <p className="text-white/60 text-sm mt-0.5">
                    {stats.total} frames analyzed &bull; {result.threats_detected} threat(s) found
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                className="px-5 py-2.5 rounded-lg border border-white/10 bg-black/20 hover:bg-white/10 text-white text-sm font-bold transition-all"
              >
                New Analysis
              </button>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {[
                { label: 'Frames', value: stats.total, color: 'text-violet-400' },
                { label: 'Safe', value: stats.safe, color: 'text-green-500' },
                { label: 'Anomaly', value: stats.anomaly, color: 'text-amber-500' },
                { label: 'Danger', value: stats.danger, color: 'text-rose-500' },
                { label: 'Critical', value: stats.critical, color: 'text-red-600' },
                { label: 'Fighting', value: stats.fightingFrames, color: 'text-orange-500' },
                { label: 'Fire', value: stats.fireFrames, color: 'text-red-500' },
              ].map((s) => (
                <div key={s.label} className={cn("p-4 rounded-xl text-center flex flex-col items-center justify-center", GLASS)}>
                  <p className={cn("text-2xl font-bold mb-1", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Weapons found */}
            {stats.weaponsFound.length > 0 && (
              <div className="p-5 rounded-xl border border-rose-500/30 bg-rose-500/10">
                <p className="text-[10px] uppercase tracking-widest font-bold text-rose-400 mb-3 flex items-center gap-2">
                  <Swords className="h-4 w-4" /> Weapons Identified
                </p>
                <div className="flex flex-wrap gap-2">
                  {stats.weaponsFound.map((w) => (
                    <TagPill key={w} label={w} variant="danger" />
                  ))}
                </div>
              </div>
            )}

            {/* Frame detail + timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
              {/* Left — Selected frame detail */}
              <div className={cn("rounded-xl p-6 flex flex-col", GLASS)}>
                {selectedFrame ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1.5">
                          Frame #{selectedFrame.frame} &bull; {selectedFrame.timestamp_sec}s
                        </p>
                        <StatusBadge status={selectedFrame.analysis.status} />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {selectedFrame.analysis.weapons.map((w) => <TagPill key={w} label={w} variant="danger" />)}
                        {selectedFrame.analysis.fighting_detected && <TagPill label="Fighting" variant="warning" />}
                        {selectedFrame.analysis.fire_detected && <TagPill label="Fire" variant="fire" />}
                        {selectedFrame.analysis.suspicious_activity && <TagPill label="Suspicious" variant="warning" />}
                      </div>
                    </div>

                    {/* Screenshot */}
                    {selectedFrame.frame_screenshot && (
                      <div className="rounded-xl overflow-hidden border border-white/10 bg-black mb-5">
                        <img
                          src={selectedFrame.frame_screenshot}
                          alt={`Frame ${selectedFrame.frame}`}
                          className="w-full object-contain"
                        />
                      </div>
                    )}

                    {/* Summary */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-5">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-violet-400 mb-2">
                        AI Analysis Summary
                      </p>
                      <p className="text-sm text-white/80 leading-relaxed">
                        {selectedFrame.analysis.summary}
                      </p>
                    </div>

                    {/* Person images */}
                    {selectedFrame.person_images && selectedFrame.person_images.length > 0 && (
                      <div className="mt-auto">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3 flex items-center gap-2">
                          <Users className="h-3 w-3" /> Detected Persons
                        </p>
                        <div className="flex gap-3 flex-wrap">
                          {selectedFrame.person_images.map((p, i) => (
                            <div key={i} className="rounded-lg overflow-hidden border border-rose-500/30 w-[100px] relative group">
                              <img src={p.image} alt={`Person ${i + 1}`} className="w-full aspect-[3/4] object-cover" />
                              <div className="absolute inset-x-0 bottom-0 p-1.5 bg-black/80 backdrop-blur-sm">
                                <p className="text-[9px] text-white/80 font-bold text-center">
                                  Conf: {(p.confidence * 100).toFixed(0)}%
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12 opacity-50">
                    <Eye className="h-12 w-12 mb-4" />
                    <p className="text-sm">Select a frame from the timeline</p>
                  </div>
                )}
              </div>

              {/* Right — Timeline */}
              <div className={cn("rounded-xl p-4 max-h-[700px] overflow-y-auto custom-scrollbar flex flex-col gap-2", GLASS)}>
                <div className="sticky top-0 bg-background/80 backdrop-blur-md pb-2 mb-2 z-10 -mt-2 pt-2 border-b border-white/10">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-2">
                    Frame Timeline
                  </p>
                </div>
                {result.results.map((frame) => {
                  const isSelected = selectedFrame?.frame === frame.frame;
                  const cfg = STATUS_CONFIG[frame.analysis.status] || STATUS_CONFIG.error;
                  return (
                    <button
                      key={frame.frame}
                      onClick={() => setSelectedFrame(frame)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all text-left w-full group",
                        isSelected ? cn(cfg.bg, cfg.border) : "border-white/5 hover:bg-white/5"
                      )}
                    >
                      <div className={cn(
                        "h-2 w-2 rounded-full shrink-0 transition-all",
                        cfg.color.replace('text-', 'bg-'),
                        frame.analysis.status !== 'safe' && !isSelected && "animate-pulse"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white mb-0.5">
                          {frame.timestamp_sec}s
                        </p>
                        <p className="text-[10px] text-white/40 truncate">
                          {frame.analysis.summary}
                        </p>
                      </div>
                      <div className="shrink-0 scale-90 opacity-80 group-hover:opacity-100 transition-opacity">
                        <StatusBadge status={frame.analysis.status} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
          </div>

          {/* ═══ Right Column — Live CCTV Stream ═══ */}
          {mode === 'stream' && (
            <div className={cn("sticky top-28 rounded-xl overflow-hidden flex flex-col", GLASS)}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    streamOnline ? "bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" : "bg-violet-500 shadow-[0_0_8px_#8b5cf6]"
                  )} />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-white/80">
                    {streamOnline ? 'Live Feed' : 'Offline'}
                  </span>
                </div>
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                  CCTV
                </span>
              </div>

              {/* Video player */}
              <div className="relative bg-black aspect-video flex-1 min-h-[240px]">
                <iframe
                  key={iframeReloadKey}
                  src={STREAM_WEBRTC_URL}
                  allow="autoplay"
                  className="w-full h-full border-none pointer-events-none"
                />

                {/* Offline overlay */}
                {!streamOnline && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <Radio className="h-10 w-10 text-white/20 mb-2" />
                    <p className="text-sm font-bold text-white/60 uppercase tracking-widest">
                      Stream Offline
                    </p>
                    <p className="text-[10px] text-white/30 max-w-[200px] leading-relaxed">
                      Make sure MediaMTX & ffmpeg are running. Retrying...
                    </p>
                  </div>
                )}

                {/* Scanning overlay */}
                {loading && mode === 'stream' && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center">
                    <Loader2 className="h-10 w-10 text-violet-500 animate-spin mb-3" />
                    <p className="text-xs font-bold text-violet-400 uppercase tracking-widest">
                      Scanning stream
                    </p>
                  </div>
                )}
              </div>

              {/* Info footer */}
              <div className="p-3 bg-white/5 border-t border-white/10 flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-white/30">
                <span>rtsp://localhost:8554/webcam</span>
                <span>WebRTC &bull; 720p</span>
              </div>
            </div>
          )}

        </div>{/* end grid */}
      </div>{/* end max-width container */}
    </div>
  );
}
