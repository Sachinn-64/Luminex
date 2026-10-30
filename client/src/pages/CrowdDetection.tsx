import { useState, useRef, useCallback, type DragEvent, type ReactNode, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, Image as ImageIcon, Video, Loader2,
  AlertTriangle, Users, Activity, Maximize, BarChart3, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GLASS = "bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl";

interface RegionStat {
  crowd_level: string;
  mean_density: number;
  max_density?: number;
}

interface ImageAnalysis {
  estimated_count: number;
  crowd_level: string;
  confidence: number;
  highest_density_region: string;
  mean_density: number;
  max_density: number;
  regions: Record<string, RegionStat>;
}

interface VideoAnalysis {
  total_frames: number;
  total_people_detected: number;
  average_people_per_frame: number;
  max_people_in_frame: number;
  final_crowd_level: string;
  final_regions: Record<string, RegionStat>;
}

interface ImageResult {
  success: true;
  type: 'image';
  analysis: ImageAnalysis;
  images: { heatmap: string; blended: string; analysis: string };
}

interface VideoResult {
  success: true;
  type: 'video';
  analysis: VideoAnalysis;
  videos: { blended_video: string; heatmap_video: string };
  images: { final_heatmap: string; final_analysis: string };
}

type AnalysisResult = ImageResult | VideoResult;

const LEVEL_COLORS: Record<string, string> = {
  'Very Low': '#22c55e',
  'Low': '#4ade80',
  'Medium': '#facc15',
  'High': '#f97316',
  'Very High': '#ef4444',
  'Extremely High': '#dc2626',
};

function levelColor(level: string) {
  return LEVEL_COLORS[level] ?? '#a78bfa';
}

export default function CrowdDetection() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'video'>('image');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const processFile = useCallback(async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setError('Please upload an image or video file.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('File too large. Max 100 MB.');
      return;
    }

    setError(null);
    setResult(null);
    setPreviewType(isVideo ? 'video' : 'image');
    setPreview(URL.createObjectURL(file));
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setResult(data as AnalysisResult);
      } else {
        setError(data.error || 'Analysis failed.');
      }
    } catch {
      setError('Network error — is the backend running on port 5000?');
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
  }, [processFile]);

  return (
    <div className="pt-20 min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* ═══════════════════ HEADER BAR ═══════════════════ */}
        <header className={cn('rounded-xl h-16 lg:h-20 flex flex-wrap gap-4 items-center justify-between px-5 lg:px-8 mb-6 relative overflow-hidden', GLASS)}>
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-transparent pointer-events-none" />
          <div className="flex items-center gap-4 lg:gap-6 relative z-10">
            <button
              onClick={() => navigate('/dashboard')}
              className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-violet-500/20 hover:border-violet-500/30 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-8 w-px bg-white/10 hidden sm:block" />
            <div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-violet-500/20 flex items-center justify-center">
                  <Users className="h-4 w-4 text-violet-400" />
                </div>
                <h1 className="text-xl lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                  Crowd Density Analysis
                </h1>
              </div>
              <p className="text-[11px] lg:text-xs text-muted-foreground mt-1 hidden sm:block">
                Upload drone footage or images to analyze crowd distribution and density.
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* ─── LEFT COLUMN: Upload & Preview ─── */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                'rounded-xl p-8 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group',
                GLASS,
                dragOver ? 'border-violet-500 ring-4 ring-violet-500/20 bg-violet-500/5' : 'hover:border-violet-500/40 hover:bg-white/5'
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <div className="h-16 w-16 mx-auto rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8 text-violet-400" />
              </div>
              
              <h3 className="text-base font-bold text-foreground mb-2">
                Upload Footage
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Drag & drop or click to browse
              </p>
              
              <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> JPG/PNG</span>
                <span>&bull;</span>
                <span className="flex items-center gap-1"><Video className="h-3 w-3" /> MP4/AVI</span>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.bmp,.tiff,.mp4,.avi,.mov,.mkv,.wmv"
                hidden
                onChange={(e: ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3 text-destructive animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-sm font-medium">{error}</div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className={cn('rounded-xl p-8 text-center', GLASS)}>
                <Loader2 className="h-10 w-10 text-violet-400 animate-spin mx-auto mb-4" />
                <h3 className="text-sm font-bold text-white mb-1">Analyzing Media...</h3>
                <p className="text-xs text-muted-foreground">Deep learning models are processing the input.</p>
              </div>
            )}

            {/* Preview Area */}
            {preview && !loading && !result && (
              <div className={cn('rounded-xl overflow-hidden', GLASS)}>
                <div className="p-3 border-b border-white/10 bg-white/5 flex items-center gap-2">
                  <Maximize className="h-4 w-4 text-violet-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Input Preview</span>
                </div>
                <div className="bg-black/50 aspect-video relative flex items-center justify-center">
                  {previewType === 'image' ? (
                    <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <video src={preview} controls className="max-w-full max-h-full" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── RIGHT COLUMN: Results ─── */}
          <div className="lg:col-span-8 space-y-6">
            {!result && !loading && (
              <div className={cn('rounded-xl h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-dashed', GLASS)}>
                <Activity className="h-12 w-12 text-white/10 mb-4" />
                <h3 className="text-lg font-bold text-white/40 mb-2">Awaiting Input</h3>
                <p className="text-sm text-white/20 max-w-sm">
                  Upload an image or video to see the AI crowd density analysis and heatmap generation here.
                </p>
              </div>
            )}
            {result && !loading && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                {result.type === 'image' ? <ImageResults data={result} /> : <VideoResults data={result} />}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ───── Sub-components ───── */

function Card({ title, children, icon: Icon }: { title: string; children: ReactNode; icon?: any }) {
  return (
    <div className={cn('rounded-xl overflow-hidden', GLASS)}>
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-violet-400" />}
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex-1 min-w-[140px] hover:bg-white/10 transition-colors">
      <div className="text-2xl font-bold tracking-tight mb-1" style={{ color: color ?? '#fff' }}>
        {value}
      </div>
      <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function ImageResults({ data }: { data: ImageResult }) {
  const a = data.analysis;
  return (
    <>
      <Card title="Analysis Summary" icon={Activity}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatBox label="Estimated People" value={a.estimated_count.toLocaleString()} />
          <StatBox label="Crowd Level" value={a.crowd_level} color={levelColor(a.crowd_level)} />
          <StatBox label="Confidence" value={`${(a.confidence * 100).toFixed(1)}%`} />
          <StatBox label="Highest Density" value={a.highest_density_region.replace(/_/g, ' ')} />
        </div>
      </Card>

      <Card title="Regional Distribution" icon={BarChart3}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['left_side', 'center', 'right_side'] as const).map((k) => {
            const r = a.regions[k];
            if (!r) return null;
            return (
              <div key={k} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  {k.replace(/_/g, ' ')}
                </div>
                <div className="text-lg font-bold mb-1" style={{ color: levelColor(r.crowd_level) }}>
                  {r.crowd_level}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Density: {r.mean_density.toFixed(4)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Heatmap Visualizations" icon={ImageIcon}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.images.heatmap && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-violet-400" /> Heatmap
              </p>
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                <img src={`data:image/png;base64,${data.images.heatmap}`} alt="Heatmap" className="w-full h-auto object-contain" />
              </div>
            </div>
          )}
          {data.images.blended && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-violet-400" /> Blended View
              </p>
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                <img src={`data:image/jpeg;base64,${data.images.blended}`} alt="Blended" className="w-full h-auto object-contain" />
              </div>
            </div>
          )}
          {data.images.analysis && (
            <div className="space-y-2 md:col-span-2">
              <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-violet-400" /> Detailed Analysis
              </p>
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                <img src={`data:image/png;base64,${data.images.analysis}`} alt="Analysis" className="w-full h-auto object-contain" />
              </div>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

function VideoResults({ data }: { data: VideoResult }) {
  const a = data.analysis;
  return (
    <>
      <Card title="Video Analysis Summary" icon={Activity}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatBox label="Total Frames" value={a.total_frames.toLocaleString()} />
          <StatBox label="Avg / Frame" value={a.average_people_per_frame.toFixed(1)} />
          <StatBox label="Peak Count" value={a.max_people_in_frame.toLocaleString()} />
          <StatBox label="Crowd Level" value={a.final_crowd_level} color={levelColor(a.final_crowd_level)} />
        </div>
      </Card>

      <Card title="Regional Distribution" icon={BarChart3}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['left_side', 'center', 'right_side'] as const).map((k) => {
            const r = a.final_regions[k];
            if (!r) return null;
            return (
              <div key={k} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  {k.replace(/_/g, ' ')}
                </div>
                <div className="text-lg font-bold mb-1" style={{ color: levelColor(r.crowd_level) }}>
                  {r.crowd_level}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Density: {r.mean_density.toFixed(4)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Generated Videos" icon={Video}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
              <ChevronRight className="h-3 w-3 text-violet-400" /> Blended Video
            </p>
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
              <video key={data.videos.blended_video} controls className="w-full h-auto">
                <source src={data.videos.blended_video} type="video/mp4" />
              </video>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
              <ChevronRight className="h-3 w-3 text-violet-400" /> Heatmap Video
            </p>
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
              <video key={data.videos.heatmap_video} controls className="w-full h-auto">
                <source src={data.videos.heatmap_video} type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Final Cumulative Heatmaps" icon={ImageIcon}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.images.final_heatmap && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-violet-400" /> Final Heatmap
              </p>
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                <img src={`data:image/png;base64,${data.images.final_heatmap}`} alt="Final Heatmap" className="w-full h-auto object-contain" />
              </div>
            </div>
          )}
          {data.images.final_analysis && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-violet-400" /> Final Analysis
              </p>
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                <img src={`data:image/png;base64,${data.images.final_analysis}`} alt="Final Analysis" className="w-full h-auto object-contain" />
              </div>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}