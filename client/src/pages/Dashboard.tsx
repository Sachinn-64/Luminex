import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, type Role } from '../context/AuthContext';
import { collection, onSnapshot, query, type DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '@/lib/utils';
import {
  Fingerprint, Users, Shield, Brain, BarChart3, MapPin,
  CloudLightning, Stethoscope, UserPlus, Map, ClipboardList,
  UserCheck, Calendar, Search, LayoutDashboard, Video,
  AlertTriangle, Eye, Info, Bell, Settings,
  Cpu, Menu, X, Activity, ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  roles: Role[];
}

interface SidebarSection {
  title: string;
  roles: Role[];
  items: SidebarItem[];
}

type Tone = 'good' | 'warn' | 'bad' | 'neutral';
type Hue = 'blue' | 'cyan' | 'violet' | 'emerald' | 'amber' | 'red' | 'pink' | 'indigo';

const HUE: Record<Hue, { text: string; tile: string; ring: string; bar: string; glow: string }> = {
  blue:    { text: 'text-blue-400',    tile: 'bg-blue-500/15 border-blue-400/20',    ring: 'hover:border-blue-400/50',    bar: 'from-blue-500 to-cyan-400',     glow: 'group-hover:shadow-[0_0_0_1px_rgba(96,165,250,0.35),0_18px_50px_-20px_rgba(59,130,246,0.6)]' },
  cyan:    { text: 'text-cyan-400',    tile: 'bg-cyan-500/15 border-cyan-400/20',    ring: 'hover:border-cyan-400/50',    bar: 'from-cyan-500 to-sky-300',      glow: 'group-hover:shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_18px_50px_-20px_rgba(6,182,212,0.6)]' },
  violet:  { text: 'text-violet-400',  tile: 'bg-violet-500/15 border-violet-400/20',ring: 'hover:border-violet-400/50',  bar: 'from-violet-500 to-fuchsia-400', glow: 'group-hover:shadow-[0_0_0_1px_rgba(167,139,250,0.35),0_18px_50px_-20px_rgba(139,92,246,0.6)]' },
  emerald: { text: 'text-emerald-400', tile: 'bg-emerald-500/15 border-emerald-400/20', ring: 'hover:border-emerald-400/50', bar: 'from-emerald-500 to-teal-300', glow: 'group-hover:shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_18px_50px_-20px_rgba(16,185,129,0.6)]' },
  amber:   { text: 'text-amber-400',   tile: 'bg-amber-500/15 border-amber-400/20',  ring: 'hover:border-amber-400/50',   bar: 'from-amber-500 to-yellow-300',  glow: 'group-hover:shadow-[0_0_0_1px_rgba(251,191,36,0.35),0_18px_50px_-20px_rgba(245,158,11,0.6)]' },
  red:     { text: 'text-red-400',     tile: 'bg-red-500/15 border-red-400/20',      ring: 'hover:border-red-400/50',     bar: 'from-red-500 to-orange-400',    glow: 'group-hover:shadow-[0_0_0_1px_rgba(248,113,113,0.35),0_18px_50px_-20px_rgba(239,68,68,0.6)]' },
  pink:    { text: 'text-pink-400',    tile: 'bg-pink-500/15 border-pink-400/20',    ring: 'hover:border-pink-400/50',    bar: 'from-pink-500 to-rose-300',     glow: 'group-hover:shadow-[0_0_0_1px_rgba(244,114,182,0.35),0_18px_50px_-20px_rgba(236,72,153,0.6)]' },
  indigo:  { text: 'text-indigo-400',  tile: 'bg-indigo-500/15 border-indigo-400/20',ring: 'hover:border-indigo-400/50',  bar: 'from-indigo-500 to-blue-400',   glow: 'group-hover:shadow-[0_0_0_1px_rgba(129,140,248,0.35),0_18px_50px_-20px_rgba(99,102,241,0.6)]' },
};

interface KpiConfig {
  label: string;
  value: string;
  badge: string;
  tone: Tone;
  hue: Hue;
  icon: LucideIcon;
  progress?: number;
  segments?: { active: number; total: number };
}

type LostAndFoundStatus = 'pending' | 'processing' | 'completed' | 'not_found';

interface LostAndFoundStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  not_found: number;
}

/* ------------------------------------------------------------------ */
/*  Sidebar navigation sections                                        */
/* ------------------------------------------------------------------ */

const sidebarSections: SidebarSection[] = [
  {
    title: 'Overview',
    roles: ['admin', 'user', 'medical_admin', 'doctor'],
    items: [
      { id: 'dashboard', label: 'System overview', icon: LayoutDashboard, route: '/dashboard', roles: ['admin', 'user', 'medical_admin', 'doctor'] },
    ],
  },
  {
    title: 'Surveillance',
    roles: ['admin'],
    items: [
      { id: 'lost-and-found', label: 'Lost & found', icon: Fingerprint, route: '/lost-and-found', roles: ['admin'] },
      { id: 'crowd-detection', label: 'Crowd detection', icon: Users, route: '/crowd-detection', roles: ['admin'] },
      { id: 'weapon-detection', label: 'Weapon detection', icon: Shield, route: '/weapon-detection', roles: ['admin'] },
      { id: 'image-recognition', label: 'Image recognition', icon: Brain, route: '/image-recognition', roles: ['admin'] },
    ],
  },
  {
    title: 'Analysis',
    roles: ['admin', 'user', 'medical_admin', 'doctor'],
    items: [
      { id: 'disaster-prediction', label: 'Disaster prediction', icon: CloudLightning, route: '/disaster-prediction', roles: ['admin', 'user', 'medical_admin', 'doctor'] },
      { id: 'analytics', label: 'Analytics', icon: BarChart3, route: '/analytics', roles: ['admin'] },
    ],
  },
  {
    title: 'Services',
    roles: ['user'],
    items: [
      { id: 'report-missing', label: 'Report missing person', icon: Search, route: '/report-missing', roles: ['user'] },
      { id: 'pilgrim-tracker', label: 'Pilgrim tracker', icon: MapPin, route: '/pilgrim-tracker', roles: ['user'] },
      { id: 'ai-map', label: 'AI-guided map', icon: Map, route: '/ai-map', roles: ['user'] },
    ],
  },
  {
    title: 'Emergency',
    roles: ['user', 'admin'],
    items: [
      { id: 'disaster-management', label: 'Disaster management', icon: AlertTriangle, route: '/disaster-management', roles: ['user', 'admin'] },
      { id: 'emergency-call', label: 'Emergency video call', icon: Video, route: '/emergency-call', roles: ['user'] },
    ],
  },
  {
    title: 'Health',
    roles: ['user'],
    items: [
      { id: 'doctor-reg', label: 'Register as doctor', icon: UserPlus, route: '/doctor-registration', roles: ['user'] },
    ],
  },
  {
    title: 'Administration',
    roles: ['medical_admin'],
    items: [
      { id: 'medical-admin', label: 'Medical panel', icon: LayoutDashboard, route: '/medical-admin', roles: ['medical_admin'] },
      { id: 'medical-video-queue', label: 'Video call queue', icon: Video, route: '/medical-admin/video-queue', roles: ['medical_admin'] },
      { id: 'medical-doctors', label: 'Manage doctors', icon: UserCheck, route: '/medical-admin/doctors', roles: ['medical_admin'] },
      { id: 'medical-hospitals', label: 'Hospitals', icon: ClipboardList, route: '/medical-admin/hospitals', roles: ['medical_admin'] },
    ],
  },
  {
    title: 'Practice',
    roles: ['doctor'],
    items: [
      { id: 'doctor-panel', label: 'Doctor panel', icon: LayoutDashboard, route: '/doctor-panel', roles: ['doctor'] },
      { id: 'doctor-video-queue', label: 'Video call queue', icon: Video, route: '/doctor-panel/video-queue', roles: ['doctor'] },
      { id: 'doctor-my-profile', label: 'My profile', icon: UserCheck, route: '/doctor-panel/profile', roles: ['doctor'] },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  KPI cards per role                                                 */
/* ------------------------------------------------------------------ */

const kpisByRole: Record<Role, KpiConfig[]> = {
  admin: [
    { label: 'Active cameras', hue: 'blue', value: '12', badge: '+12% today', tone: 'good', icon: Video, progress: 75 },
    { label: 'Crowd index', hue: 'cyan', value: '42%', badge: '+5% / hr', tone: 'good', icon: Users, progress: 42 },
    { label: 'Threat level', hue: 'violet', value: 'Low', badge: 'Stable', tone: 'neutral', icon: Shield, segments: { active: 1, total: 3 } },
    { label: 'System uptime', hue: 'emerald', value: '99.9%', badge: 'Live', tone: 'good', icon: Cpu, progress: 99 },
  ],
  user: [
    { label: 'Active services', hue: 'blue', value: '6', badge: 'Online', tone: 'good', icon: Activity, progress: 85 },
    { label: 'Pilgrim status', hue: 'cyan', value: 'On track', badge: 'Active', tone: 'good', icon: MapPin, progress: 60 },
    { label: 'Alert level', hue: 'amber', value: 'Normal', badge: 'Stable', tone: 'neutral', icon: AlertTriangle, segments: { active: 1, total: 3 } },
    { label: 'Health services', hue: 'pink', value: '3 active', badge: 'Available', tone: 'good', icon: Stethoscope, progress: 70 },
  ],
  medical_admin: [
    { label: 'Appointments today', hue: 'blue', value: '24', badge: '+8% today', tone: 'good', icon: Calendar, progress: 65 },
    { label: 'Registered doctors', hue: 'cyan', value: '18', badge: 'Active', tone: 'good', icon: UserCheck, progress: 72 },
    { label: 'Queue length', hue: 'violet', value: '7', badge: 'Normal', tone: 'neutral', icon: ClipboardList, segments: { active: 2, total: 3 } },
    { label: 'System status', hue: 'emerald', value: '99.9%', badge: 'Live', tone: 'good', icon: Cpu, progress: 99 },
  ],
  doctor: [
    { label: "Today's patients", hue: 'blue', value: '12', badge: '+3 today', tone: 'good', icon: Users, progress: 60 },
    { label: 'Completed', hue: 'emerald', value: '8', badge: '67% done', tone: 'good', icon: UserCheck, progress: 67 },
    { label: 'Queue position', hue: 'violet', value: '4th', badge: 'Active', tone: 'neutral', icon: ClipboardList, segments: { active: 1, total: 3 } },
    { label: 'Availability', hue: 'cyan', value: 'Online', badge: 'Live', tone: 'good', icon: Activity, progress: 100 },
  ],
};

/* ------------------------------------------------------------------ */
/*  Static data: feeds, logs, chart                                    */
/* ------------------------------------------------------------------ */

const feedData = [
  { cam: 'CAM-01', location: 'Main entrance', zone: 'Level 0 · Zone A', img: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&h=340&fit=crop' },
  { cam: 'CAM-04', location: 'North wing corridor', zone: 'Level 2 · Zone C', img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=340&fit=crop' },
  { cam: 'CAM-09', location: 'Parking zone B', zone: 'Outdoor · Sec-2', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=340&fit=crop' },
  { cam: 'CAM-12', location: 'Loading dock', zone: 'Ground · West', img: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=600&h=340&fit=crop' },
];

const logEntries: { icon: LucideIcon; tone: Tone; hue: Hue; title: string; where: string; when: string }[] = [
  { icon: AlertTriangle, tone: 'warn', hue: 'amber', title: 'Unauthorized access attempt', where: 'Zone B-4', when: '2 min ago' },
  { icon: Eye, tone: 'neutral', hue: 'violet', title: 'Known subject detected', where: 'Main lobby', when: '15 min ago' },
  { icon: Info, tone: 'neutral', hue: 'blue', title: 'System backup completed', where: 'Cloud storage', when: '1 hr ago' },
  { icon: AlertTriangle, tone: 'bad', hue: 'red', title: 'Suspicious object spotted', where: 'Service lift', when: '3 hr ago' },
];

const chartBars = [66, 50, 80, 75, 33, 50, 66, 83, 50, 66, 75, 50];
const chartLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];

/* ------------------------------------------------------------------ */
/*  Feature modules (clickable tiles in main content)                  */
/* ------------------------------------------------------------------ */

interface FeatureModule {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  hue: Hue;
  badge: string;
  route: string;
  roles: Role[];
}

const featureModules: FeatureModule[] = [
  { id: 'lost-and-found', title: 'Lost & found', description: 'Process missing person search requests via biometric matching.', icon: Fingerprint, hue: 'violet', badge: 'Biometric', route: '/lost-and-found', roles: ['admin'] },
  { id: 'crowd-detection', title: 'Crowd detection', description: 'Real-time crowd density monitoring and heatmaps.', icon: Users, hue: 'blue', badge: 'Live', route: '/crowd-detection', roles: ['admin'] },
  { id: 'weapon-detection', title: 'Weapon detection', description: 'Real-time weapon identification across camera nodes.', icon: Shield, hue: 'red', badge: 'Security', route: '/weapon-detection', roles: ['admin'] },
  { id: 'image-recognition', title: 'Image recognition', description: 'Advanced image processing and analysis.', icon: Brain, hue: 'emerald', badge: 'AI', route: '/image-recognition', roles: ['admin'] },
  { id: 'disaster-prediction', title: 'Disaster prediction', description: 'Disaster forecasting and early warning system.', icon: CloudLightning, hue: 'amber', badge: 'Prediction', route: '/disaster-prediction', roles: ['admin', 'user', 'medical_admin', 'doctor'] },
  { id: 'analytics', title: 'Analytics', description: 'Users, doctors and role-wise statistics.', icon: BarChart3, hue: 'indigo', badge: 'Insights', route: '/analytics', roles: ['admin'] },
  { id: 'report-missing', title: 'Report missing person', description: 'Submit a search request for a lost person.', icon: Search, hue: 'violet', badge: 'Search', route: '/report-missing', roles: ['user'] },
  { id: 'pilgrim-tracker', title: 'Pilgrim tracker', description: 'Real-time pilgrim location tracking.', icon: MapPin, hue: 'blue', badge: 'Tracking', route: '/pilgrim-tracker', roles: ['user'] },
  { id: 'ai-map', title: 'AI-guided map', description: 'AI-powered navigation and routing.', icon: Map, hue: 'emerald', badge: 'Navigation', route: '/ai-map', roles: ['user'] },
  { id: 'disaster-management', title: 'Disaster management', description: 'Emergency response and management portal.', icon: AlertTriangle, hue: 'amber', badge: 'Emergency', route: '/disaster-management', roles: ['user', 'admin'] },
  { id: 'emergency-call', title: 'Emergency video call', description: 'Request an emergency video consultation.', icon: Video, hue: 'red', badge: 'Emergency', route: '/emergency-call', roles: ['user'] },
  { id: 'doctor-registration', title: 'Register as doctor', description: 'Register yourself as a medical practitioner.', icon: UserPlus, hue: 'cyan', badge: 'Health', route: '/doctor-registration', roles: ['user'] },
  { id: 'medical-admin', title: 'Medical admin panel', description: 'Manage doctors, hospitals and the emergency queue.', icon: LayoutDashboard, hue: 'violet', badge: 'Admin', route: '/medical-admin', roles: ['medical_admin'] },
  { id: 'medical-video-queue', title: 'Video call queue', description: 'Monitor emergency video call requests.', icon: Video, hue: 'red', badge: 'Emergency', route: '/medical-admin/video-queue', roles: ['medical_admin'] },
  { id: 'medical-doctors', title: 'Manage doctors', description: 'View and manage all registered doctors.', icon: UserCheck, hue: 'blue', badge: 'Admin', route: '/medical-admin/doctors', roles: ['medical_admin'] },
  { id: 'medical-hospitals', title: 'Hospitals', description: 'Manage hospitals and bed availability.', icon: ClipboardList, hue: 'emerald', badge: 'Admin', route: '/medical-admin/hospitals', roles: ['medical_admin'] },
  { id: 'doctor-panel', title: 'Doctor panel', description: 'Overview and emergency video calls.', icon: LayoutDashboard, hue: 'violet', badge: 'Doctor', route: '/doctor-panel', roles: ['doctor'] },
  { id: 'doctor-video-queue', title: 'Video call queue', description: 'Accept emergency video calls from patients.', icon: Video, hue: 'red', badge: 'Emergency', route: '/doctor-panel/video-queue', roles: ['doctor'] },
  { id: 'doctor-my-profile', title: 'My profile', description: 'View your doctor profile and availability.', icon: UserCheck, hue: 'blue', badge: 'Doctor', route: '/doctor-panel/profile', roles: ['doctor'] },
];

/* ------------------------------------------------------------------ */
/*  Shared bits                                                        */
/* ------------------------------------------------------------------ */

const ROLE_TITLES: Record<Role, string> = {
  admin: 'Command center',
  user: 'Pilgrim portal',
  medical_admin: 'Medical administration',
  doctor: 'Doctor console',
};

const TONE_DOT: Record<Tone, string> = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
  neutral: 'bg-foreground/40',
};

/** Elevated surface used for every panel on the page. */
const CARD =
  'rounded-2xl border border-border/70 bg-card/70 backdrop-blur-sm shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_60px_-30px_rgba(0,0,0,0.6)] dark:border-white/[0.07] dark:bg-white/[0.03]';

/** Tiny uppercase monospace label used throughout the editorial system. */
function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground', className)}>
      {children}
    </span>
  );
}

function SectionHeader({
  index,
  title,
  meta,
  action,
}: {
  index: string;
  title: string;
  meta?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 border-b border-border/70 pb-3">
      <div className="flex items-baseline gap-4">
        <Mono className="text-brand-400">{index}</Mono>
        <h3 className="font-heading text-[22px] font-bold leading-none tracking-[-0.01em] text-foreground">{title}</h3>
        {meta && <Mono className="hidden sm:inline">{meta}</Mono>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar navigation (shared by desktop & mobile drawers)            */
/* ------------------------------------------------------------------ */

function SidebarNav({
  role,
  currentPath,
  onNavigate,
}: {
  role: Role;
  currentPath: string;
  onNavigate: (route: string) => void;
}) {
  const sections = sidebarSections.filter((s) => s.roles.includes(role));

  return (
    <nav className="flex-1 overflow-y-auto px-5 py-6">
      {sections.map((section, sIdx) => {
        const items = section.items.filter((i) => i.roles.includes(role));
        if (items.length === 0) return null;

        return (
          <div key={section.title} className={cn(sIdx > 0 && 'mt-7')}>
            <Mono className="mb-2.5 block">{section.title}</Mono>
            <ul className="-mx-2">
              {items.map((item) => {
                const isActive = currentPath === item.route;
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onNavigate(item.route)}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-all',
                        isActive
                          ? 'bg-brand-500/15 text-foreground shadow-[inset_2px_0_0_0_#4A7DFF]'
                          : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
                      )}
                    >
                      <Icon className={cn('size-4 shrink-0', isActive ? 'text-brand-400' : '')} strokeWidth={1.75} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const role = profile?.role ?? 'user';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lostAndFoundStats, setLostAndFoundStats] = useState<LostAndFoundStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    not_found: 0,
  });
  const kpis = kpisByRole[role] ?? kpisByRole.user;
  const visibleModules = featureModules.filter((m) => m.roles.includes(role));

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  useEffect(() => {
    if (role !== 'admin') return;

    const requestsRef = query(collection(db, 'search_requests'));
    const unsub = onSnapshot(requestsRef, (snap) => {
      const initialStats: LostAndFoundStats = {
        total: snap.size,
        pending: 0,
        processing: 0,
        completed: 0,
        not_found: 0,
      };

      const computedStats = snap.docs.reduce((acc, doc) => {
        const status = (doc.data() as DocumentData).status as LostAndFoundStatus | undefined;
        if (status && status in acc) {
          acc[status] += 1;
        }
        return acc;
      }, initialStats);

      setLostAndFoundStats(computedStats);
    });

    return unsub;
  }, [role]);

  const handleNav = (route: string) => {
    setSidebarOpen(false);
    navigate(route);
  };

  /* Sidebar inner content (reused for desktop + mobile) */
  const sidebarBody = (
    <>
      <SidebarNav role={role} currentPath={location.pathname} onNavigate={handleNav} />
      <div className="border-t border-border p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-cyan font-heading text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(0,80,255,0.9)]">
            {profile?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-foreground">{profile?.name ?? 'User'}</p>
            <Mono className="block truncate">{ROLE_TITLES[role]}</Mono>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen bg-background pt-16 text-foreground">
      {/* ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-10 h-[520px] w-[720px] rounded-full opacity-70 blur-3xl dark:opacity-40"
        style={{ background: 'radial-gradient(closest-side, rgba(0,80,255,0.28), transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-72 h-[520px] w-[620px] rounded-full opacity-60 blur-3xl dark:opacity-35"
        style={{ background: 'radial-gradient(closest-side, rgba(124,58,237,0.22), rgba(0,214,255,0.08) 60%, transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.22]"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--muted-foreground) / 0.35) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, black 10%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, black 10%, transparent 80%)',
        }}
      />
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle navigation"
        className="fixed left-4 top-20 z-50 flex size-9 items-center justify-center rounded-lg border border-border bg-background lg:hidden"
      >
        {sidebarOpen ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="relative flex">
        {/* ---- Desktop sidebar ---- */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col border-r border-border/70 bg-background/60 backdrop-blur-md lg:flex">
          {sidebarBody}
        </aside>

        {/* ---- Mobile sidebar drawer ---- */}
        <aside
          className={cn(
            'fixed bottom-0 left-0 top-16 z-40 flex w-72 flex-col border-r border-border bg-background/95 backdrop-blur-md transition-transform duration-300 lg:hidden',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {sidebarBody}
        </aside>

        {/* ---- Main content ---- */}
        <main className="flex min-h-[calc(100vh-4rem)] min-w-0 flex-1 flex-col">
          {/* Page header */}
          <header className="relative border-b border-border/70 px-5 pb-6 pt-8 sm:px-8 lg:px-10">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="ml-10 lg:ml-0">
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-px w-6 bg-gradient-to-r from-brand-500 to-brand-cyan" />
                  <Mono className="text-foreground/70">
                    {ROLE_TITLES[role]} · {today}
                  </Mono>
                </div>
                <h1 className="font-heading text-[2rem] font-bold leading-[1.05] tracking-[-0.015em] sm:text-[2.5rem]">
                  <span className="text-muted-foreground">Good to see you,</span>{' '}
                  <span className="bg-gradient-to-r from-brand-400 via-brand-cyan to-brand-400 bg-clip-text text-transparent">
                    {profile?.name?.split(' ')[0] ?? 'there'}
                  </span>
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative hidden md:block">
                  <Search className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search system nodes"
                    className="h-9 w-56 border-0 border-b border-border bg-transparent pl-6 pr-2 text-[13.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-brand-400 lg:w-64"
                  />
                </label>
                <button
                  aria-label="Notifications"
                  className="relative flex size-9 items-center justify-center rounded-lg border border-border bg-card/60 text-muted-foreground transition-colors hover:border-brand-400/60 hover:text-foreground"
                >
                  <Bell className="size-4" strokeWidth={1.75} />
                  <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand-cyan shadow-[0_0_8px_rgba(0,214,255,0.9)]" />
                </button>
                <button
                  aria-label="Settings"
                  className="flex size-9 items-center justify-center rounded-lg border border-border bg-card/60 text-muted-foreground transition-colors hover:border-brand-400/60 hover:text-foreground"
                >
                  <Settings className="size-4" strokeWidth={1.75} />
                </button>
                <span className="hidden items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 sm:inline-flex">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <Mono className="text-emerald-300">All systems nominal</Mono>
                </span>
              </div>
            </div>
          </header>

          {/* Scrollable body */}
          <div className="flex-1 space-y-14 px-5 py-8 sm:px-8 lg:px-10">
            {/* ---------- KPI cards ---------- */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                const h = HUE[kpi.hue];
                return (
                  <div key={kpi.label} className={cn('group relative overflow-hidden p-5 transition-colors', CARD, h.ring)}>
                    <div
                      aria-hidden
                      className={cn('pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-40 blur-2xl bg-gradient-to-br', h.bar)}
                    />
                    <div className="relative mb-6 flex items-start justify-between">
                      <span className={cn('flex size-10 items-center justify-center rounded-xl border', h.tile)}>
                        <Icon className={cn('size-[18px]', h.text)} strokeWidth={2} />
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border/70 bg-background/60 px-2 py-1">
                        <span className={cn('size-1.5 rounded-full', TONE_DOT[kpi.tone])} />
                        <Mono className="text-foreground/80">{kpi.badge}</Mono>
                      </span>
                    </div>
                    <Mono>{kpi.label}</Mono>
                    <p className="mt-1.5 font-heading text-[2.1rem] font-bold leading-none tracking-[-0.02em] text-foreground">
                      {kpi.value}
                    </p>

                    {kpi.progress !== undefined && (
                      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]">
                        <div className={cn('h-full rounded-full bg-gradient-to-r transition-all', h.bar)} style={{ width: `${kpi.progress}%` }} />
                      </div>
                    )}
                    {kpi.segments && (
                      <div className="mt-5 flex gap-1.5">
                        {Array.from({ length: kpi.segments.total }).map((_, i) => (
                          <div
                            key={i}
                            className={cn('h-1.5 flex-1 rounded-full', i < kpi.segments!.active ? cn('bg-gradient-to-r', h.bar) : 'bg-foreground/[0.08]')}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            {/* ---------- Feature modules ---------- */}
            <section>
              <SectionHeader index="01" title="Modules" meta={`${visibleModules.length} available`} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleModules.map((mod, i) => {
                  const ModIcon = mod.icon;
                  const h = HUE[mod.hue];
                  return (
                    <button
                      key={mod.id}
                      onClick={() => navigate(mod.route)}
                      className={cn('group relative flex min-h-[150px] flex-col justify-between overflow-hidden p-5 text-left transition-all duration-200 hover:-translate-y-0.5', CARD, h.ring, h.glow)}
                    >
                      <div
                        aria-hidden
                        className={cn('pointer-events-none absolute -bottom-12 -right-12 size-40 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30', h.bar)}
                      />
                      <div className="relative flex items-start justify-between">
                        <span className={cn('flex size-10 items-center justify-center rounded-xl border', h.tile)}>
                          <ModIcon className={cn('size-[18px]', h.text)} strokeWidth={2} />
                        </span>
                        <span className="flex items-center gap-3">
                          <span className={cn('rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em]', h.tile, h.text)}>
                            {mod.badge}
                          </span>
                          <ArrowUpRight className="size-4 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                        </span>
                      </div>
                      <div className="relative mt-6">
                        <div className="flex items-baseline gap-3">
                          <Mono>{String(i + 1).padStart(2, '0')}</Mono>
                          <p className="font-heading text-[17px] font-bold leading-tight text-foreground">{mod.title}</p>
                        </div>
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{mod.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ---------- Lost & found (admin) + Active feeds ---------- */}
            <section>
              <SectionHeader
                index="02"
                title="Active feeds"
                meta="4 live nodes"
                action={
                  <button className="group hidden items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex">
                    View all
                    <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </button>
                }
              />

              {role === 'admin' && (
                <div className={cn('mb-6 grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-3 lg:grid-cols-5', CARD)}>
                  {[
                    { label: 'Total cases', value: lostAndFoundStats.total, hue: 'blue' as Hue },
                    { label: 'Pending', value: lostAndFoundStats.pending, hue: 'amber' as Hue },
                    { label: 'Processing', value: lostAndFoundStats.processing, hue: 'cyan' as Hue },
                    { label: 'Found', value: lostAndFoundStats.completed, hue: 'emerald' as Hue },
                    { label: 'Not found', value: lostAndFoundStats.not_found, hue: 'red' as Hue },
                  ].map((stat) => (
                    <div key={stat.label} className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={cn('size-1.5 rounded-full bg-gradient-to-r', HUE[stat.hue].bar)} />
                        <Mono>{stat.label}</Mono>
                      </div>
                      <p className={cn('mt-2 font-heading text-[26px] font-bold leading-none', HUE[stat.hue].text)}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {feedData.map((feed) => (
                  <div key={feed.cam} className={cn('group relative aspect-video overflow-hidden', CARD, 'hover:border-brand-400/50')}>
                    <img
                      src={feed.img}
                      alt={`Feed: ${feed.location}`}
                      className="h-full w-full object-cover saturate-[0.85] transition-transform duration-700 group-hover:scale-[1.04] group-hover:saturate-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/20" />
                    <div className="absolute left-3 top-3 flex items-center gap-2">
                      <span className="size-1.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/85">{feed.cam}</span>
                    </div>
                    <span className="absolute right-3 top-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
                      Rec
                    </span>
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <div>
                        <p className="text-[13.5px] font-semibold text-white">{feed.location}</p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">{feed.zone}</p>
                      </div>
                      <button
                        aria-label={`Open ${feed.cam}`}
                        className="flex size-8 items-center justify-center rounded-lg bg-white text-black opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                      >
                        <Eye className="size-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ---------- Activity chart + Critical logs ---------- */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Activity analysis */}
              <div className={cn('p-6 lg:col-span-2', CARD)}>
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-baseline gap-4">
                    <Mono>03</Mono>
                    <h3 className="font-heading text-[20px] font-bold leading-none text-foreground">Activity analysis</h3>
                  </div>
                  <div className="relative">
                    <select className="cursor-pointer appearance-none border-0 border-b border-border bg-transparent pr-5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground outline-none focus:border-foreground">
                      <option className="bg-background text-foreground">Last 24 hours</option>
                      <option className="bg-background text-foreground">Last 7 days</option>
                    </select>
                    <svg aria-hidden viewBox="0 0 12 12" className="pointer-events-none absolute right-0 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path d="M2.5 4.5 6 8l3.5-3.5" />
                    </svg>
                  </div>
                </div>

                <div className="relative h-52 lg:h-64">
                  {/* gridlines */}
                  {[0, 25, 50, 75].map((p) => (
                    <div key={p} className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${p}%` }} />
                  ))}
                  <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-2.5">
                    {chartBars.map((h, i) => {
                      const peak = i === 3 || i === 7;
                      return (
                        <div
                          key={i}
                          className={cn(
                            'group relative w-full rounded-t-md transition-all',
                            peak
                              ? 'bg-gradient-to-t from-brand-500 to-brand-cyan shadow-[0_0_24px_-6px_rgba(0,214,255,0.8)]'
                              : 'bg-gradient-to-t from-brand-500/25 to-brand-400/40 hover:from-brand-500/50 hover:to-brand-cyan/60',
                          )}
                          style={{ height: `${h}%` }}
                        >
                          <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[10px] text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            {h}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 flex justify-between border-t border-border pt-3">
                  {chartLabels.map((l) => (
                    <Mono key={l}>{l}</Mono>
                  ))}
                </div>
              </div>

              {/* Critical logs */}
              <div className={cn('flex flex-col p-6', CARD)}>
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-baseline gap-4">
                    <Mono>04</Mono>
                    <h3 className="font-heading text-[20px] font-bold leading-none text-foreground">Critical logs</h3>
                  </div>
                  <span className="inline-flex items-center gap-2">
                    <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
                    <Mono>Live</Mono>
                  </span>
                </div>

                <ul className="flex-1 divide-y divide-border">
                  {logEntries.map((log, i) => {
                    const LogIcon = log.icon;
                    return (
                      <li key={i} className="flex gap-3 py-3.5 first:pt-0">
                        <span className={cn('relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border', HUE[log.hue].tile)}>
                          <LogIcon className={cn('size-3.5', HUE[log.hue].text)} strokeWidth={2} />
                          <span className={cn('absolute -right-1 -top-1 size-2 rounded-full border-2 border-background', TONE_DOT[log.tone])} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-medium text-foreground">{log.title}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Mono>{log.where}</Mono>
                            <span className="size-0.5 rounded-full bg-muted-foreground/60" />
                            <Mono>{log.when}</Mono>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <button className="mt-6 flex h-10 w-full items-center justify-between rounded-xl bg-gradient-to-r from-brand-500 to-[#00A6FF] px-4 text-[13px] font-semibold text-white shadow-[0_12px_30px_-12px_rgba(0,80,255,0.8)] transition-all hover:brightness-110">
                  View full logs
                  <span className="font-mono text-[12px]">→</span>
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
