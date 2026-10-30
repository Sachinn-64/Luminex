import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Search, Radio, Upload, SlidersHorizontal, ZoomIn,
  CheckCircle2, XCircle, Loader2, Fingerprint, Info, AlertTriangle,
  MapPin, Plus, Minus,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
interface SearchRequest {
  id: string;
  userId: string;
  userName: string;
  personName: string;
  personDescription: string;
  targetImageBase64: string;
  status: 'pending' | 'processing' | 'completed' | 'not_found';
  results: Detection[];
  createdAt: Timestamp | null;
  processedAt: Timestamp | null;
}

interface Detection {
  frame: number;
  timestamp_sec: number;
  frame_image: string;
  face_crop: string;
  bbox: number[];
  engine?: string;
  score?: number;
  saved_file?: string;
  location?: string;
  verified_by?: string;
}

interface StreamResult {
  success: boolean;
  message: string;
  total_frames_scanned: number;
  detections: Detection[];
  person_found: boolean;
  error?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const API_URL = 'http://localhost:5004';

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  processing: { label: 'Processing', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  completed: { label: 'Found', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  not_found: { label: 'Not Found', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
};

const GLASS = 'bg-white/60 dark:bg-[#16121a]/70 backdrop-blur-xl border border-black/[0.06] dark:border-violet-500/[0.15]';

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AdminLostAndFound() {
  const navigate = useNavigate();

  // All search requests
  const [requests, setRequests] = useState<SearchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'not_found'>('all');

  // Selected request for processing
  const [selectedRequest, setSelectedRequest] = useState<SearchRequest | null>(null);

  // Scan settings - OPTIMIZED for faster ~20s results
  const [scanMode, setScanMode] = useState<'camera' | 'video'>('camera');
  const [tolerance, setTolerance] = useState(0.55);
  const [frameSkip, setFrameSkip] = useState(15);  // Higher = faster (was 3)
  const [scanDuration, setScanDuration] = useState(20);  // Reduced from 45
  const [maxDetections, setMaxDetections] = useState(5);  // Early stop after N detections

  // Video upload (for video mode)
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<StreamResult | null>(null);
  const [scanError, setScanError] = useState('');

  // Camera preview
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // ── Fetch all requests ───────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'search_requests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SearchRequest)));
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Start / stop webcam when in camera mode with a case selected ─────
  useEffect(() => {
    if (scanMode !== 'camera' || !selectedRequest) {
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
  }, [scanMode, selectedRequest]);

  // ── Convert base64 to Blob ───────────────────────────────────────────
  const base64ToBlob = useCallback((base64: string): Blob => {
    const parts = base64.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  }, []);

  // ── Process request (run scan) ───────────────────────────────────────
  const processRequest = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    setScanError('');
    setScanResult(null);

    try {
      // Update status to processing
      await updateDoc(doc(db, 'search_requests', selectedRequest.id), {
        status: 'processing',
      });

      // Convert target image base64 to File
      const imageBlob = base64ToBlob(selectedRequest.targetImageBase64);
      const imageFile = new File([imageBlob], 'target.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('person_image', imageFile);
      formData.append('tolerance', tolerance.toString());
      formData.append('frame_skip', frameSkip.toString());

      let result: StreamResult;

      if (scanMode === 'camera') {
        formData.append('max_seconds', scanDuration.toString());
        formData.append('max_detections', maxDetections.toString());  // Early termination
        const res = await fetch(`${API_URL}/api/detect-stream`, {
          method: 'POST',
          body: formData,
        });
        result = await res.json();
        console.log('Scan result:', result);
        console.log('Detections count:', result.detections?.length);
        if (result.detections?.length > 0) {
          console.log('First detection frame_image exists:', !!result.detections[0].frame_image);
        }
      } else {
        if (!videoFile) {
          throw new Error('Please select a video file');
        }
        formData.append('crowd_video', videoFile);
        const res = await fetch(`${API_URL}/api/detect`, {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        // Convert video result format to stream result format
        result = {
          success: json.success,
          message: json.message,
          total_frames_scanned: json.detection_summary?.total_frames || 0,
          detections: [], // Video endpoint doesn't return base64 frames directly
          person_found: json.detection_summary?.detected_frames > 0,
        };
        // If found, we need to fetch the detection frame
        if (result.person_found && json.detection_frame) {
          const frameRes = await fetch(`${API_URL}/api/view/${json.detection_frame}`);
          const frameBlob = await frameRes.blob();
          const reader = new FileReader();
          reader.onload = () => {
            result.detections = [{
              frame: 0,
              timestamp_sec: json.detection_summary?.detection_timestamps?.[0] || 0,
              frame_image: reader.result as string,
              face_crop: reader.result as string,
              bbox: [],
              engine: 'hybrid',
              score: 0.9,
            }];
            setScanResult(result);
          };
          reader.readAsDataURL(frameBlob);
        }
      }

      setScanResult(result);

      // Update Firestore with results (without base64 images to avoid size limits)
      const newStatus = result.person_found ? 'completed' : 'not_found';
      // Only save metadata to Firestore, not the full images (but include location!)
      const resultsForFirestore = (result.detections || []).map(det => ({
        frame: det.frame,
        timestamp_sec: det.timestamp_sec,
        bbox: det.bbox,
        engine: det.engine,
        score: det.score,
        saved_file: det.saved_file || null,
        location: det.location || 'East Nada Gate',
        verified_by: det.verified_by || 'Admin',
      }));
      
      await updateDoc(doc(db, 'search_requests', selectedRequest.id), {
        status: newStatus,
        results: resultsForFirestore,
        processedAt: serverTimestamp(),
      });

      // Update local state (keep full detections with images for display)
      setSelectedRequest((prev) => prev ? { ...prev, status: newStatus, results: result.detections || [] } : null);

    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed');
      // Revert status
      await updateDoc(doc(db, 'search_requests', selectedRequest.id), { status: 'pending' });
    } finally {
      setProcessing(false);
    }
  };

  // ── Filter requests ──────────────────────────────────────────────────
  const filteredRequests = filter === 'all' ? requests : requests.filter((r) => r.status === filter);

  // ── Stats ────────────────────────────────────────────────────────────
  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    processing: requests.filter((r) => r.status === 'processing').length,
    completed: requests.filter((r) => r.status === 'completed').length,
    not_found: requests.filter((r) => r.status === 'not_found').length,
  };

  const statusMeta = selectedRequest ? (STATUS_META[selectedRequest.status] || STATUS_META.pending) : null;
  const detections = scanResult?.detections ?? [];

  return (
    <div className="pt-20 min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ═══════════════════ HEADER BAR ═══════════════════ */}
        <header className={cn('rounded-xl h-16 lg:h-20 flex items-center justify-between px-5 lg:px-8 mb-6', GLASS)}>
          <div className="flex items-center gap-3 lg:gap-4 min-w-0">
            <button
              onClick={() => selectedRequest ? (setSelectedRequest(null), setScanResult(null), setScanError('')) : navigate('/dashboard')}
              className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 hover:bg-violet-500/20 transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-8 w-px bg-violet-500/20 hidden sm:block shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {selectedRequest && <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shrink-0" />}
                <h1 className="text-lg sm:text-2xl font-black text-foreground tracking-tight truncate">
                  {selectedRequest ? `Case #${selectedRequest.id.slice(0, 8).toUpperCase()}` : 'Lost & Found — Admin'}
                </h1>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                {selectedRequest ? 'Target Tracking: Real-time analysis enabled' : 'Process search requests from users'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search events..."
                className="bg-violet-500/5 border border-violet-500/10 rounded-xl pl-9 pr-4 py-2 text-sm text-foreground focus:border-violet-500 focus:ring-0 outline-none w-48 lg:w-56 transition-all"
              />
            </div>
            {selectedRequest && (
              <button className="bg-violet-600 text-white px-4 lg:px-5 py-2 rounded-xl font-bold text-xs sm:text-sm hover:bg-violet-500 transition-colors flex items-center gap-2 shadow-lg shadow-violet-600/20">
                <Fingerprint className="h-4 w-4" />
                <span className="hidden sm:inline">Export Case</span>
              </button>
            )}
          </div>
        </header>

        {/* ═══════════════════ STATUS BAR ═══════════════════ */}
        <div className={cn('rounded-xl p-3 lg:p-4 flex flex-wrap items-center justify-between gap-3 mb-6', GLASS)}>
          {selectedRequest ? (
            <>
              <div className="flex flex-wrap gap-6 lg:gap-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Search Status</span>
                  <span className="text-sm font-bold" style={{ color: statusMeta!.color }}>{statusMeta!.label}</span>
                </div>
                <div className="flex flex-col border-l border-violet-500/10 pl-6">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Detections</span>
                  <span className="text-sm font-bold">{detections.length || selectedRequest.results?.length || 0} Total Instances</span>
                </div>
                <div className="flex flex-col border-l border-violet-500/10 pl-6">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Scan Mode</span>
                  <span className="text-sm font-bold capitalize">{scanMode === 'camera' ? 'Camera' : 'Video'}</span>
                </div>
              </div>
              <div className="flex gap-0.5 bg-black/20 p-0.5 rounded-[10px] border border-violet-500/20">
                {(['camera', 'video'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setScanMode(m)}
                    className={cn(
                      'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                      scanMode === m ? 'bg-violet-600 text-white shadow' : 'text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10',
                    )}
                  >
                    {m === 'camera' ? 'Live Camera' : 'Upload Video'}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-6 sm:gap-8">
                {[
                  { key: 'all', label: 'Total', value: stats.total, color: 'text-violet-400' },
                  { key: 'pending', label: 'Pending', value: stats.pending, color: 'text-amber-400' },
                  { key: 'processing', label: 'Processing', value: stats.processing, color: 'text-blue-400' },
                  { key: 'completed', label: 'Found', value: stats.completed, color: 'text-emerald-400' },
                  { key: 'not_found', label: 'Not Found', value: stats.not_found, color: 'text-red-400' },
                ].map((s, i) => (
                  <button key={s.key} onClick={() => setFilter(s.key as typeof filter)} className={cn('flex flex-col text-left', i > 0 && 'sm:border-l sm:border-violet-500/10 sm:pl-6')}>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{s.label}</span>
                    <span className={cn('text-sm font-bold', filter === s.key ? s.color : 'text-foreground')}>{s.value}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-0.5 bg-black/20 p-0.5 rounded-[10px] border border-violet-500/20">
                {(['all', 'pending', 'processing', 'completed', 'not_found'] as const).map((f) => (
                  <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all', filter === f ? 'bg-violet-600 text-white shadow' : 'text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10')}>
                    {f === 'all' ? 'All' : f === 'not_found' ? 'Not Found' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
        {selectedRequest ? (
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

            {/* ─── LEFT COLUMN: Feed + Controls + Results ─── */}
            <div className="flex-1 space-y-6">

              {/* Live feed / Video upload — ALWAYS visible */}
              {scanMode === 'camera' ? (
                <div className={cn('group rounded-xl overflow-hidden', GLASS, 'hover:border-violet-500/40 transition-all')}>
                  <div className="aspect-video relative bg-black overflow-hidden">
                    <video
                      ref={cameraVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    {/* Overlay when camera is not active */}
                    {!cameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center h-full gap-2 bg-black">
                        <Radio className="h-8 w-8 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-sm">{cameraError || 'Starting camera…'}</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1', cameraActive ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400')}>
                        {cameraActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        {cameraActive ? 'REC' : 'OFF'}
                      </span>
                    </div>
                    <span className={cn('absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider', cameraActive ? 'bg-emerald-500/90 text-black' : 'bg-red-500/90 text-white')}>
                      {cameraActive ? 'LIVE' : 'OFFLINE'}
                    </span>
                    <div className="absolute bottom-3 left-3">
                      <p className="text-white text-sm font-bold">Primary Feed — Live Camera</p>
                      <p className="text-violet-400 text-[10px] font-bold">Device Webcam</p>
                    </div>
                  </div>
                  <div className="p-2.5 text-[11px] text-muted-foreground flex justify-between items-center bg-black/20">
                    <span>CAM-01 MAIN FEED</span>
                    <span className="text-violet-400 font-mono font-bold">CAMERA: {cameraActive ? 'ACTIVE' : 'INACTIVE'}</span>
                  </div>
                </div>
              ) : (
                <div className={cn('rounded-xl overflow-hidden', GLASS)}>
                  <input type="file" ref={videoInputRef} accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="hidden" />
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full aspect-video flex flex-col items-center justify-center gap-3 bg-black/30 hover:bg-violet-500/5 transition-all group"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/20 group-hover:scale-110 transition-all">
                      <Upload className="h-6 w-6 text-violet-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">{videoFile ? videoFile.name : 'Upload Crowd Video'}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{videoFile ? 'Click to change file' : 'Click to select .mp4, .avi, .mov'}</p>
                    </div>
                  </button>
                  <div className="p-2.5 text-[11px] text-muted-foreground flex justify-between items-center bg-black/20">
                    <span>VIDEO UPLOAD MODE</span>
                    <span className="text-violet-400 font-mono font-bold">{videoFile ? 'FILE READY' : 'NO FILE'}</span>
                  </div>
                </div>
              )}

              {/* Scan parameters + button */}
              <div className={cn('rounded-xl overflow-hidden', GLASS)}>
                <div className="p-4 border-b border-violet-500/10 flex items-center justify-between bg-violet-500/5">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-violet-400" />
                    <span className="text-sm font-bold uppercase tracking-widest text-violet-400">Scan Parameters</span>
                  </div>
                  {scanError && <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Error</span>}
                </div>
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <label className="text-muted-foreground text-[11px] font-medium">Tolerance</label>
                        <span className="text-[11px] font-bold text-violet-400 font-mono">{tolerance}</span>
                      </div>
                      <input type="range" min="0.3" max="0.8" step="0.05" value={tolerance} onChange={(e) => setTolerance(parseFloat(e.target.value))} className="w-full accent-violet-500 h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <label className="text-muted-foreground text-[11px] font-medium">Frame Skip</label>
                        <span className="text-[11px] font-bold text-violet-400 font-mono">{frameSkip}</span>
                      </div>
                      <input type="range" min="5" max="30" value={frameSkip} onChange={(e) => setFrameSkip(parseInt(e.target.value))} className="w-full accent-violet-500 h-1.5" />
                    </div>
                    {scanMode === 'camera' && (
                      <>
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <label className="text-muted-foreground text-[11px] font-medium">Duration</label>
                            <span className="text-[11px] font-bold text-violet-400 font-mono">{scanDuration}s</span>
                          </div>
                          <input type="range" min="10" max="60" step="5" value={scanDuration} onChange={(e) => setScanDuration(parseInt(e.target.value))} className="w-full accent-violet-500 h-1.5" />
                        </div>
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <label className="text-muted-foreground text-[11px] font-medium">Max Detections</label>
                            <span className="text-[11px] font-bold text-violet-400 font-mono">{maxDetections}</span>
                          </div>
                          <input type="range" min="1" max="10" value={maxDetections} onChange={(e) => setMaxDetections(parseInt(e.target.value))} className="w-full accent-violet-500 h-1.5" />
                        </div>
                      </>
                    )}
                  </div>

                  {scanError && (
                    <div className="rounded-lg p-3 bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                      <p className="text-red-400 text-xs">{scanError}</p>
                    </div>
                  )}

                  <button
                    onClick={processRequest}
                    disabled={processing || (scanMode === 'camera' && !cameraActive) || (scanMode === 'video' && !videoFile)}
                    className={cn(
                      'w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all',
                      processing ? 'bg-violet-600/30 text-violet-300 cursor-not-allowed' : 'bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-600/20',
                    )}
                  >
                    {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning...</> : <><Fingerprint className="h-4 w-4" /> Start Biometric Scan</>}
                  </button>
                </div>
              </div>

              {/* Scan result banner */}
              {scanResult && (
                <div className={cn('rounded-xl p-4 flex items-center justify-between', GLASS, scanResult.person_found ? '!border-emerald-500/30' : '!border-red-500/30')}>
                  <div className="flex items-center gap-3">
                    {scanResult.person_found ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
                    <div>
                      <p className={cn('font-bold text-sm', scanResult.person_found ? 'text-emerald-400' : 'text-red-400')}>
                        {scanResult.person_found ? 'Person Found!' : 'Person Not Found'}
                      </p>
                      <p className="text-muted-foreground text-[11px]">{scanResult.total_frames_scanned} frames scanned &bull; {detections.length} detection(s)</p>
                    </div>
                  </div>
                  <button onClick={() => setScanResult(null)} className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-3 py-1.5 rounded-lg border border-violet-500/20 hover:bg-violet-500/20 transition-colors">
                    Clear
                  </button>
                </div>
              )}

              {/* Detection grid */}
              {detections.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {detections.slice(0, 6).map((det, idx) => (
                    <div key={idx} className={cn('group relative rounded-xl overflow-hidden hover:border-violet-500/40 transition-all', GLASS)}>
                      <div className="aspect-video relative overflow-hidden">
                        <img src={det.frame_image} alt={`Detection ${idx + 1}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        {idx === 0 && (
                          <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> REC
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                          <div>
                            <p className="text-white text-sm font-bold">{det.timestamp_sec.toFixed(0)}s — {det.location || `Frame ${det.frame}`}</p>
                            <p className="text-violet-400 text-[10px] font-bold">{det.score ? `${(det.score * 100).toFixed(1)}% Confidence` : 'Match detected'}</p>
                          </div>
                          <ZoomIn className="h-4 w-4 text-white/50 group-hover:text-violet-400 cursor-pointer transition-colors" />
                        </div>
                      </div>
                      <div className="p-2.5 text-[11px] text-muted-foreground flex justify-between items-center bg-black/20">
                        <span>CAM-{String(idx + 1).padStart(2, '0')} {det.engine?.toUpperCase() || 'HYBRID'}</span>
                        <span className="text-violet-400 font-mono font-bold tracking-tighter">POS: [{det.bbox?.[0]?.toFixed(0) || '40.7'}, {det.bbox?.[1]?.toFixed(0) || '-74.0'}]</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── RIGHT COLUMN: Subject Profile + Trail Map ─── */}
            <div className="w-full lg:w-96 shrink-0 space-y-6 lg:sticky lg:top-24 lg:self-start">

              {/* Master Subject Profile */}
              <div className={cn('rounded-xl overflow-hidden', GLASS)}>
                <div className="p-4 border-b border-violet-500/10 flex justify-between items-center bg-violet-500/5">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-violet-400">Master Subject Profile</h3>
                  <Fingerprint className="h-4 w-4 text-violet-400" />
                </div>
                <div className="p-5 space-y-5">
                  <div className="w-full aspect-square rounded-xl overflow-hidden ring-2 ring-violet-500/20 bg-muted">
                    <img src={selectedRequest.targetImageBase64} alt={selectedRequest.personName} className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Subject Name', value: selectedRequest.personName || 'Unknown' },
                      { label: 'Reported By', value: selectedRequest.userName },
                      { label: 'Case Status', value: STATUS_META[selectedRequest.status]?.label || selectedRequest.status, color: statusMeta!.color },
                      { label: 'Date Filed', value: selectedRequest.createdAt?.toDate().toLocaleDateString() || 'Just now' },
                    ].map((row) => (
                      <div key={row.label} className="bg-violet-500/5 p-3.5 rounded-xl border border-violet-500/5 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-tight">{row.label}</span>
                        <span className="text-sm font-bold" style={row.color ? { color: row.color } : undefined}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  {selectedRequest.personDescription && (
                    <div className="bg-violet-500/10 p-4 rounded-xl border border-violet-500/20">
                      <p className="text-[11px] font-bold text-violet-400 flex items-center gap-2 mb-2">
                        <Info className="h-3 w-3" /> AI Metadata Analysis
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed italic">
                        &ldquo;{selectedRequest.personDescription}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tactical Trail Map */}
              <div className={cn('rounded-xl overflow-hidden h-72 relative', GLASS)}>
                <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                  <p className="text-[10px] font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                    <MapPin className="h-3.5 w-3.5 text-violet-400" />
                    Tactical Trail Map
                  </p>
                </div>
                <div className="w-full h-full bg-slate-900 relative overflow-hidden">
                  {/* Grid overlay */}
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }} />
                  {/* Zone labels */}
                  <div className="absolute top-12 left-6 text-[9px] font-bold text-violet-400/40 uppercase tracking-widest">Zone A</div>
                  <div className="absolute top-12 right-6 text-[9px] font-bold text-violet-400/40 uppercase tracking-widest">Zone B</div>
                  <div className="absolute bottom-12 left-6 text-[9px] font-bold text-violet-400/40 uppercase tracking-widest">Zone C</div>
                  <div className="absolute bottom-12 right-6 text-[9px] font-bold text-violet-400/40 uppercase tracking-widest">Zone D</div>
                  {/* Trail path */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path d="M 20 40 L 40 60 L 60 45 L 80 70" fill="none" stroke="#7c3aed" strokeDasharray="2,1" strokeWidth="0.7" />
                    <circle cx="20" cy="40" r="1.5" fill="#7c3aed" />
                    <circle cx="40" cy="60" r="1.5" fill="#7c3aed" />
                    <circle cx="60" cy="45" r="1.5" fill="#7c3aed" />
                    <circle cx="80" cy="70" r="2.5" fill="#7c3aed" className="animate-pulse" />
                    {/* Node labels */}
                    <text x="20" y="36" fill="#a78bfa" fontSize="3" fontWeight="bold" textAnchor="middle">Entry</text>
                    <text x="40" y="56" fill="#a78bfa" fontSize="3" fontWeight="bold" textAnchor="middle">Lobby</text>
                    <text x="60" y="41" fill="#a78bfa" fontSize="3" fontWeight="bold" textAnchor="middle">Corridor</text>
                    <text x="80" y="66" fill="#a78bfa" fontSize="3" fontWeight="bold" textAnchor="middle">Last Seen</text>
                  </svg>
                  {/* Zoom controls */}
                  <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    <button className="w-8 h-8 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-violet-600 transition-colors">
                      <Plus className="h-4 w-4" />
                    </button>
                    <button className="w-8 h-8 rounded-lg bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-violet-600 transition-colors">
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* ═══════════════════ REQUEST LIST ═══════════════════ */
          loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                <p className="text-sm text-muted-foreground">Loading cases...</p>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className={cn('rounded-2xl p-16 text-center', GLASS)}>
              <div className="h-16 w-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                <Fingerprint className="h-8 w-8 text-violet-400/50" />
              </div>
              <p className="text-foreground font-bold mb-1">No cases found</p>
              <p className="text-muted-foreground text-sm">No search requests match the current filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredRequests.map((req) => {
                const meta = STATUS_META[req.status] || STATUS_META.pending;
                return (
                  <button
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={cn('group rounded-xl overflow-hidden text-left transition-all hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5', GLASS)}
                  >
                    <div className="aspect-video relative overflow-hidden bg-black">
                      <img src={req.targetImageBase64} alt={req.personName} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33` }}>
                        {meta.label}
                      </span>
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-white text-base font-bold mb-0.5">{req.personName || 'Unknown'}</p>
                        <p className="text-white/50 text-[11px]">Reported by {req.userName} &bull; {req.results?.length || 0} detection(s)</p>
                      </div>
                    </div>
                    <div className="p-3 flex justify-between items-center text-[11px] text-muted-foreground bg-black/20">
                      <span className="font-mono font-bold">#{req.id.slice(0, 8).toUpperCase()}</span>
                      <span>{req.createdAt?.toDate().toLocaleDateString() || 'Just now'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
