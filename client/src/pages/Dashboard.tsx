import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, type Role } from '../context/AuthContext';
import { collection, onSnapshot, query, type DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Squares from '../components/Squares';
import { useTheme } from '../components/use-theme';
import { cn } from '@/lib/utils';
import {
  Fingerprint, Users, Shield, Brain, BarChart3, MapPin,
  CloudLightning, Stethoscope, UserPlus, Map, ClipboardList,
  UserCheck, Calendar, Search, LayoutDashboard, Video,
  AlertTriangle, Eye, Info, Bell, Settings, History,
  Cpu, Menu, X, Activity, ChevronRight, ArrowUpRight,
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

interface KpiConfig {
  label: string;
  value: string;
  badge: string;
  badgeClass: string;
  icon: LucideIcon;
  iconClass: string;
  iconBg: string;
  progress?: number;
  progressClass?: string;
  segments?: { active: number; total: number };
  accentBorder?: boolean;
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
      { id: 'dashboard', label: 'System Overview', icon: LayoutDashboard, route: '/dashboard', roles: ['admin', 'user', 'medical_admin', 'doctor'] },
    ],
  },
  {
    title: 'Surveillance',
    roles: ['admin'],
    items: [
      { id: 'lost-and-found', label: 'Lost & Found', icon: Fingerprint, route: '/lost-and-found', roles: ['admin'] },
      { id: 'crowd-detection', label: 'Crowd Detection', icon: Users, route: '/crowd-detection', roles: ['admin'] },
      { id: 'weapon-detection', label: 'Weapon Detection', icon: Shield, route: '/weapon-detection', roles: ['admin'] },
      { id: 'image-recognition', label: 'Image Recognition', icon: Brain, route: '/image-recognition', roles: ['admin'] },
    ],
  },
  {
    title: 'Analysis',
    roles: ['admin', 'user', 'medical_admin', 'doctor'],
    items: [
      { id: 'disaster-prediction', label: 'Disaster Prediction', icon: CloudLightning, route: '/disaster-prediction', roles: ['admin', 'user', 'medical_admin', 'doctor'] },
      { id: 'analytics', label: 'Analytics', icon: BarChart3, route: '/analytics', roles: ['admin'] },
    ],
  },
  {
    title: 'Services',
    roles: ['user'],
    items: [
      { id: 'report-missing', label: 'Report Missing Person', icon: Search, route: '/report-missing', roles: ['user'] },
      { id: 'pilgrim-tracker', label: 'Pilgrim Tracker', icon: MapPin, route: '/pilgrim-tracker', roles: ['user'] },
      { id: 'ai-map', label: 'AI-Guided Map', icon: Map, route: '/ai-map', roles: ['user'] },
    ],
  },
  {
    title: 'Emergency',
    roles: ['user'],
    items: [
      { id: 'disaster-management', label: 'Disaster Management', icon: AlertTriangle, route: '/disaster-management', roles: ['user'] },
      { id: 'emergency-call', label: 'Emergency Video Call', icon: Video, route: '/emergency-call', roles: ['user'] },
    ],
  },
  {
    title: 'Health',
    roles: ['user'],
    items: [
      { id: 'doctor-reg', label: 'Register as Doctor', icon: UserPlus, route: '/doctor-registration', roles: ['user'] },
    ],
  },
  {
    title: 'Administration',
    roles: ['medical_admin'],
    items: [
      { id: 'medical-admin', label: 'Medical Panel', icon: LayoutDashboard, route: '/medical-admin', roles: ['medical_admin'] },
      { id: 'medical-video-queue', label: 'Video Call Queue', icon: Video, route: '/medical-admin/video-queue', roles: ['medical_admin'] },
      { id: 'medical-doctors', label: 'Manage Doctors', icon: UserCheck, route: '/medical-admin/doctors', roles: ['medical_admin'] },
      { id: 'medical-hospitals', label: 'Hospitals', icon: ClipboardList, route: '/medical-admin/hospitals', roles: ['medical_admin'] },
    ],
  },
  {
    title: 'Practice',
    roles: ['doctor'],
    items: [
      { id: 'doctor-panel', label: 'Doctor Panel', icon: LayoutDashboard, route: '/doctor-panel', roles: ['doctor'] },
      { id: 'doctor-video-queue', label: 'Video Call Queue', icon: Video, route: '/doctor-panel/video-queue', roles: ['doctor'] },
      { id: 'doctor-my-profile', label: 'My Profile', icon: UserCheck, route: '/doctor-panel/profile', roles: ['doctor'] },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  KPI cards per role                                                 */
/* ------------------------------------------------------------------ */

const kpisByRole: Record<Role, KpiConfig[]> = {
  admin: [
    { label: 'Active Cameras', value: '12', badge: '+12%', badgeClass: 'text-emerald-400 bg-emerald-400/10', icon: Video, iconClass: 'text-violet-400', iconBg: 'bg-violet-500/10', progress: 75, progressClass: 'bg-violet-500' },
    { label: 'Crowd Index', value: '42%', badge: '+5%', badgeClass: 'text-emerald-400 bg-emerald-400/10', icon: Users, iconClass: 'text-blue-400', iconBg: 'bg-blue-500/10', progress: 42, progressClass: 'bg-blue-500' },
    { label: 'Threat Level', value: 'Low', badge: 'Stable', badgeClass: 'text-slate-400 bg-slate-400/10', icon: Shield, iconClass: 'text-indigo-400', iconBg: 'bg-indigo-500/10', segments: { active: 1, total: 3 }, accentBorder: true },
    { label: 'System Uptime', value: '99.9%', badge: 'Live', badgeClass: 'text-violet-400 bg-violet-400/10', icon: Cpu, iconClass: 'text-purple-400', iconBg: 'bg-purple-500/10', progress: 99, progressClass: 'bg-purple-500' },
  ],
  user: [
    { label: 'Active Services', value: '6', badge: 'Online', badgeClass: 'text-emerald-400 bg-emerald-400/10', icon: Activity, iconClass: 'text-violet-400', iconBg: 'bg-violet-500/10', progress: 85, progressClass: 'bg-violet-500' },
    { label: 'Pilgrim Status', value: 'On Track', badge: 'Active', badgeClass: 'text-emerald-400 bg-emerald-400/10', icon: MapPin, iconClass: 'text-blue-400', iconBg: 'bg-blue-500/10', progress: 60, progressClass: 'bg-blue-500' },
    { label: 'Alert Level', value: 'Normal', badge: 'Stable', badgeClass: 'text-slate-400 bg-slate-400/10', icon: AlertTriangle, iconClass: 'text-indigo-400', iconBg: 'bg-indigo-500/10', segments: { active: 1, total: 3 }, accentBorder: true },
    { label: 'Health Services', value: '3 Active', badge: 'Available', badgeClass: 'text-violet-400 bg-violet-400/10', icon: Stethoscope, iconClass: 'text-purple-400', iconBg: 'bg-purple-500/10', progress: 70, progressClass: 'bg-purple-500' },
  ],
  medical_admin: [
    { label: 'Appointments Today', value: '24', badge: '+8%', badgeClass: 'text-emerald-400 bg-emerald-400/10', icon: Calendar, iconClass: 'text-violet-400', iconBg: 'bg-violet-500/10', progress: 65, progressClass: 'bg-violet-500' },
    { label: 'Registered Doctors', value: '18', badge: 'Active', badgeClass: 'text-emerald-400 bg-emerald-400/10', icon: UserCheck, iconClass: 'text-blue-400', iconBg: 'bg-blue-500/10', progress: 72, progressClass: 'bg-blue-500' },
    { label: 'Queue Length', value: '7', badge: 'Normal', badgeClass: 'text-slate-400 bg-slate-400/10', icon: ClipboardList, iconClass: 'text-indigo-400', iconBg: 'bg-indigo-500/10', segments: { active: 2, total: 3 }, accentBorder: true },
    { label: 'System Status', value: '99.9%', badge: 'Live', badgeClass: 'text-violet-400 bg-violet-400/10', icon: Cpu, iconClass: 'text-purple-400', iconBg: 'bg-purple-500/10', progress: 99, progressClass: 'bg-purple-500' },
  ],
  doctor: [
    { label: "Today's Patients", value: '12', badge: '+3', badgeClass: 'text-emerald-400 bg-emerald-400/10', icon: Users, iconClass: 'text-violet-400', iconBg: 'bg-violet-500/10', progress: 60, progressClass: 'bg-violet-500' },
    { label: 'Completed', value: '8', badge: '67%', badgeClass: 'text-emerald-400 bg-emerald-400/10', icon: UserCheck, iconClass: 'text-blue-400', iconBg: 'bg-blue-500/10', progress: 67, progressClass: 'bg-blue-500' },
    { label: 'Queue Position', value: '4th', badge: 'Active', badgeClass: 'text-slate-400 bg-slate-400/10', icon: ClipboardList, iconClass: 'text-indigo-400', iconBg: 'bg-indigo-500/10', segments: { active: 1, total: 3 }, accentBorder: true },
    { label: 'Availability', value: 'Online', badge: 'Live', badgeClass: 'text-violet-400 bg-violet-400/10', icon: Activity, iconClass: 'text-purple-400', iconBg: 'bg-purple-500/10', progress: 100, progressClass: 'bg-purple-500' },
  ],
};

/* ------------------------------------------------------------------ */
/*  Static data: feeds, logs, chart                                    */
/* ------------------------------------------------------------------ */

const feedData = [
  { cam: 'CAM-01', location: 'Main Entrance', zone: 'Level 0 \u2022 Zone A', img: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&h=340&fit=crop' },
  { cam: 'CAM-04', location: 'North Wing Corridor', zone: 'Level 2 \u2022 Zone C', img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=340&fit=crop' },
  { cam: 'CAM-09', location: 'Parking Zone B', zone: 'Outdoor \u2022 Sec-2', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=340&fit=crop' },
  { cam: 'CAM-12', location: 'Loading Dock', zone: 'Ground \u2022 West', img: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=600&h=340&fit=crop' },
];

const logEntries = [
  { icon: AlertTriangle, iconColor: 'text-amber-500', iconBg: 'bg-amber-500/10', title: 'Unauthorized Access Attempt', meta: 'Zone B-4 \u2022 2 mins ago' },
  { icon: Eye, iconColor: 'text-violet-400', iconBg: 'bg-violet-500/10', title: 'Known Subject Detected', meta: 'Main Lobby \u2022 15 mins ago' },
  { icon: Info, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10', title: 'System Backup Completed', meta: 'Cloud Storage \u2022 1 hour ago' },
  { icon: AlertTriangle, iconColor: 'text-red-500', iconBg: 'bg-red-500/10', title: 'Suspicious Object Spotted', meta: 'Service Lift \u2022 3 hours ago' },
];

const chartBars = [66, 50, 80, 75, 33, 50, 66, 83, 50, 66, 75, 50];
const chartLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];

/* ------------------------------------------------------------------ */
/*  Feature modules (clickable cards in main content)                  */
/* ------------------------------------------------------------------ */

interface FeatureModule {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  iconBg: string;
  badge: string;
  badgeClass: string;
  route: string;
  roles: Role[];
}

const featureModules: FeatureModule[] = [
  { id: 'lost-and-found', title: 'Lost & Found', description: 'Process missing person search requests via biometric matching', icon: Fingerprint, iconClass: 'text-violet-400', iconBg: 'bg-violet-500/10', badge: 'Biometric', badgeClass: 'text-violet-400 bg-violet-400/10', route: '/lost-and-found', roles: ['admin'] },
  { id: 'crowd-detection', title: 'Crowd Detection', description: 'Real-time crowd density monitoring & heatmaps', icon: Users, iconClass: 'text-blue-400', iconBg: 'bg-blue-500/10', badge: 'Live', badgeClass: 'text-blue-400 bg-blue-400/10', route: '/crowd-detection', roles: ['admin'] },
  { id: 'weapon-detection', title: 'Weapon Detection', description: 'Real-time weapon identification system', icon: Shield, iconClass: 'text-red-400', iconBg: 'bg-red-500/10', badge: 'Security', badgeClass: 'text-red-400 bg-red-400/10', route: '/weapon-detection', roles: ['admin'] },
  { id: 'image-recognition', title: 'Image Recognition', description: 'Advanced image processing & analysis', icon: Brain, iconClass: 'text-emerald-400', iconBg: 'bg-emerald-500/10', badge: 'AI', badgeClass: 'text-emerald-400 bg-emerald-400/10', route: '/image-recognition', roles: ['admin'] },
  { id: 'disaster-prediction', title: 'Disaster Prediction', description: 'Disaster forecasting & early warning system', icon: CloudLightning, iconClass: 'text-amber-400', iconBg: 'bg-amber-500/10', badge: 'Prediction', badgeClass: 'text-amber-400 bg-amber-400/10', route: '/disaster-prediction', roles: ['admin', 'user', 'medical_admin', 'doctor'] },
  { id: 'analytics', title: 'Analytics', description: 'Users, doctors & role-wise statistics', icon: BarChart3, iconClass: 'text-indigo-400', iconBg: 'bg-indigo-500/10', badge: 'Insights', badgeClass: 'text-indigo-400 bg-indigo-400/10', route: '/analytics', roles: ['admin'] },
  { id: 'report-missing', title: 'Report Missing Person', description: 'Submit a search request for a lost person', icon: Search, iconClass: 'text-violet-400', iconBg: 'bg-violet-500/10', badge: 'Search', badgeClass: 'text-violet-400 bg-violet-400/10', route: '/report-missing', roles: ['user'] },
  { id: 'pilgrim-tracker', title: 'Pilgrim Tracker', description: 'Real-time pilgrim location tracking', icon: MapPin, iconClass: 'text-blue-400', iconBg: 'bg-blue-500/10', badge: 'Tracking', badgeClass: 'text-blue-400 bg-blue-400/10', route: '/pilgrim-tracker', roles: ['user'] },
  { id: 'ai-map', title: 'AI-Guided Map', description: 'AI-powered navigation & routing system', icon: Map, iconClass: 'text-emerald-400', iconBg: 'bg-emerald-500/10', badge: 'Navigation', badgeClass: 'text-emerald-400 bg-emerald-400/10', route: '/ai-map', roles: ['user'] },
  { id: 'disaster-management', title: 'Disaster Management', description: 'Emergency response & management portal', icon: AlertTriangle, iconClass: 'text-amber-400', iconBg: 'bg-amber-500/10', badge: 'Emergency', badgeClass: 'text-amber-400 bg-amber-400/10', route: '/disaster-management', roles: ['user'] },
  { id: 'emergency-call', title: 'Emergency Video Call', description: 'Request an emergency video consultation', icon: Video, iconClass: 'text-red-400', iconBg: 'bg-red-500/10', badge: 'Emergency', badgeClass: 'text-red-400 bg-red-400/10', route: '/emergency-call', roles: ['user'] },
  { id: 'doctor-registration', title: 'Register as Doctor', description: 'Register yourself as a medical practitioner', icon: UserPlus, iconClass: 'text-cyan-400', iconBg: 'bg-cyan-500/10', badge: 'Health', badgeClass: 'text-cyan-400 bg-cyan-400/10', route: '/doctor-registration', roles: ['user'] },
  { id: 'medical-admin', title: 'Medical Admin Panel', description: 'Manage doctors, hospitals & emergency queue', icon: LayoutDashboard, iconClass: 'text-violet-400', iconBg: 'bg-violet-500/10', badge: 'Admin', badgeClass: 'text-violet-400 bg-violet-400/10', route: '/medical-admin', roles: ['medical_admin'] },
  { id: 'medical-video-queue', title: 'Video Call Queue', description: 'Monitor emergency video call requests', icon: Video, iconClass: 'text-red-400', iconBg: 'bg-red-500/10', badge: 'Emergency', badgeClass: 'text-red-400 bg-red-400/10', route: '/medical-admin/video-queue', roles: ['medical_admin'] },
  { id: 'medical-doctors', title: 'Manage Doctors', description: 'View & manage all registered doctors', icon: UserCheck, iconClass: 'text-blue-400', iconBg: 'bg-blue-500/10', badge: 'Admin', badgeClass: 'text-blue-400 bg-blue-400/10', route: '/medical-admin/doctors', roles: ['medical_admin'] },
  { id: 'medical-hospitals', title: 'Hospitals', description: 'Manage hospitals & bed availability', icon: ClipboardList, iconClass: 'text-emerald-400', iconBg: 'bg-emerald-500/10', badge: 'Admin', badgeClass: 'text-emerald-400 bg-emerald-400/10', route: '/medical-admin/hospitals', roles: ['medical_admin'] },
  { id: 'doctor-panel', title: 'Doctor Panel', description: 'Overview & emergency video calls', icon: LayoutDashboard, iconClass: 'text-violet-400', iconBg: 'bg-violet-500/10', badge: 'Doctor', badgeClass: 'text-violet-400 bg-violet-400/10', route: '/doctor-panel', roles: ['doctor'] },
  { id: 'doctor-video-queue', title: 'Video Call Queue', description: 'Accept emergency video calls from patients', icon: Video, iconClass: 'text-red-400', iconBg: 'bg-red-500/10', badge: 'Emergency', badgeClass: 'text-red-400 bg-red-400/10', route: '/doctor-panel/video-queue', roles: ['doctor'] },
  { id: 'doctor-my-profile', title: 'My Profile', description: 'View your doctor profile & availability', icon: UserCheck, iconClass: 'text-blue-400', iconBg: 'bg-blue-500/10', badge: 'Doctor', badgeClass: 'text-blue-400 bg-blue-400/10', route: '/doctor-panel/profile', roles: ['doctor'] },
];

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const GLASS = 'bg-white/60 dark:bg-[#16161e]/70 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.05]';

const ROLE_TITLES: Record<Role, string> = {
  admin: 'Command Center',
  user: 'Citizen Portal',
  medical_admin: 'Medical Administration',
  doctor: 'Doctor Console',
};

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
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {sections.map((section, sIdx) => {
        const items = section.items.filter((i) => i.roles.includes(role));
        if (items.length === 0) return null;

        return (
          <div key={section.title}>
            <p
              className={cn(
                'text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2',
                sIdx > 0 && 'mt-5',
              )}
            >
              {section.title}
            </p>

            {items.map((item) => {
              const isActive = currentPath === item.route;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.route)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-violet-500/20 to-transparent border-l-[3px] border-l-violet-500 text-foreground rounded-l-none'
                      : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
                  )}
                >
                  <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-violet-400')} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
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
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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
      <div className="p-4 border-t border-border/50">
        <div className={cn('rounded-xl p-3 flex items-center gap-3', GLASS)}>
          <div className="h-9 w-9 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm font-bold shrink-0">
            {profile?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {profile?.name ?? 'User'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{ROLE_TITLES[role]}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen pt-20 bg-background">
      {/* Animated grid background */}
      <div className="absolute inset-0 z-0">
        <Squares
          direction="diagonal"
          speed={0.5}
          borderColor={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}
          squareSize={40}
          hoverFillColor={isDark ? 'rgba(139,92,246,0.03)' : 'rgba(0,0,0,0.03)'}
          vignetteColor={isDark ? '#060010' : '#ffffff'}
        />
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          'fixed top-24 left-4 z-50 p-2 rounded-lg lg:hidden',
          GLASS,
        )}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar + Main wrapper */}
      <div className="relative z-10 flex">
        {/* ---- Desktop sidebar ---- */}
        <aside
          className={cn(
            'hidden lg:flex flex-col w-72 shrink-0 border-r sticky top-20 h-[calc(100vh-5rem)]',
            GLASS,
          )}
        >
          {sidebarBody}
        </aside>

        {/* ---- Mobile sidebar drawer ---- */}
        <aside
          className={cn(
            'flex flex-col w-72 fixed top-20 bottom-0 left-0 z-40 border-r transition-transform duration-300 lg:hidden',
            GLASS,
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {sidebarBody}
        </aside>

        {/* ---- Main content ---- */}
        <main className="flex-1 flex flex-col min-h-[calc(100vh-5rem)]">
          {/* Sub-header */}
          <header className="h-14 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b bg-background/50 backdrop-blur-md border-border/50">
            <div className="flex items-center gap-2 ml-10 lg:ml-0">
              <LayoutDashboard className="h-5 w-5 text-violet-400" />
              <h2 className="text-base lg:text-lg font-semibold text-foreground">
                System Overview
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search system nodes..."
                  className="bg-muted/50 border border-border rounded-lg pl-9 pr-4 py-1.5 text-sm text-foreground focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all w-48 lg:w-64 placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative',
                    GLASS,
                  )}
                >
                  <Bell className="h-[18px] w-[18px]" />
                  <span className="absolute top-2 right-2 h-2 w-2 bg-violet-500 rounded-full ring-2 ring-background" />
                </button>
                <button
                  className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors',
                    GLASS,
                  )}
                >
                  <Settings className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>
          </header>

          {/* Scrollable body */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 overflow-y-auto">
            {/* ---------- KPI cards ---------- */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div
                    key={kpi.label}
                    className={cn(
                      'rounded-xl p-5 transition-all hover:border-violet-500/30',
                      GLASS,
                      kpi.accentBorder && 'border-l-2 !border-l-violet-500/50',
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', kpi.iconBg)}>
                        <Icon className={cn('h-5 w-5', kpi.iconClass)} />
                      </div>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', kpi.badgeClass)}>
                        {kpi.badge}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                      {kpi.label}
                    </p>
                    <h3 className="text-2xl font-bold text-foreground mt-1">{kpi.value}</h3>

                    {kpi.progress !== undefined && (
                      <div className="mt-4 h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', kpi.progressClass)}
                          style={{ width: `${kpi.progress}%` }}
                        />
                      </div>
                    )}
                    {kpi.segments && (
                      <div className="mt-4 flex gap-1">
                        {Array.from({ length: kpi.segments.total }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-1 flex-1 rounded-full',
                              i < kpi.segments!.active ? 'bg-emerald-500' : 'bg-muted',
                            )}
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg lg:text-xl font-bold text-foreground">
                    Feature Modules
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 text-[10px] font-bold uppercase">
                    {visibleModules.length} Available
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleModules.map((mod) => {
                  const ModIcon = mod.icon;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => navigate(mod.route)}
                      className={cn(
                        'group rounded-xl p-4 flex items-start gap-4 text-left transition-all hover:border-violet-500/30 hover:scale-[1.01]',
                        GLASS,
                      )}
                    >
                      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5', mod.iconBg)}>
                        <ModIcon className={cn('h-5 w-5', mod.iconClass)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-foreground truncate">{mod.title}</p>
                          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider', mod.badgeClass)}>
                            {mod.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {mod.description}
                        </p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ---------- Active feeds ---------- */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg lg:text-xl font-bold text-foreground">
                    Active Feeds Preview
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 text-[10px] font-bold uppercase">
                    4 Live Nodes
                  </span>
                </div>
                <button className="text-sm font-medium text-violet-400 hover:underline hidden sm:flex items-center gap-1">
                  View All Matrix
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {role === 'admin' && (
                <div className={cn('mb-4 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3', GLASS)}>
                  {[
                    { label: 'Total Cases', value: lostAndFoundStats.total, color: 'text-violet-400' },
                    { label: 'Pending', value: lostAndFoundStats.pending, color: 'text-amber-400' },
                    { label: 'Processing', value: lostAndFoundStats.processing, color: 'text-blue-400' },
                    { label: 'Found', value: lostAndFoundStats.completed, color: 'text-emerald-400' },
                    { label: 'Not Found', value: lostAndFoundStats.not_found, color: 'text-red-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-border/50 bg-background/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className={cn('text-xl font-bold mt-1', stat.color)}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {feedData.map((feed) => (
                  <div
                    key={feed.cam}
                    className={cn('group relative aspect-video rounded-xl overflow-hidden', GLASS)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                    <img
                      src={feed.img}
                      alt={`Feed: ${feed.location}`}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                      <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest drop-shadow-md">
                        {feed.cam}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 z-20">
                      <p className="text-sm font-bold text-white">{feed.location}</p>
                      <p className="text-[10px] text-slate-300">{feed.zone}</p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-violet-500/10 backdrop-blur-[2px]">
                      <button className="bg-violet-500 text-white p-2 rounded-full shadow-lg shadow-violet-500/25">
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ---------- Activity chart + Critical logs ---------- */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Activity Analysis */}
              <div className={cn('lg:col-span-2 rounded-2xl p-6', GLASS)}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Activity className="h-5 w-5 text-violet-400" />
                    Activity Analysis
                  </h3>
                  <select className="bg-muted border border-border text-xs rounded-lg text-muted-foreground focus:ring-0 px-2 py-1 outline-none">
                    <option>Last 24 Hours</option>
                    <option>Last 7 Days</option>
                  </select>
                </div>

                <div className="h-52 lg:h-64 flex items-end gap-1.5 sm:gap-2 px-2">
                  {chartBars.map((h, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-full rounded-t-lg transition-all cursor-pointer',
                        i === 3 || i === 9
                          ? 'bg-violet-500/40 hover:bg-violet-500/60'
                          : 'bg-violet-500/20 hover:bg-violet-500/40',
                      )}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>

                <div className="flex justify-between mt-4 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  {chartLabels.map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                </div>
              </div>

              {/* Critical Logs */}
              <div className={cn('rounded-2xl p-6 flex flex-col', GLASS)}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <History className="h-5 w-5 text-violet-400" />
                    Critical Logs
                  </h3>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded">
                    Live
                  </span>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto max-h-[250px] pr-2">
                  {logEntries.map((log, i) => {
                    const LogIcon = log.icon;
                    return (
                      <div
                        key={i}
                        className={cn(
                          'flex gap-3 pb-4',
                          i < logEntries.length - 1 && 'border-b border-border/50',
                        )}
                      >
                        <div
                          className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                            log.iconBg,
                          )}
                        >
                          <LogIcon className={cn('h-4 w-4', log.iconColor)} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground/90">{log.title}</p>
                          <p className="text-[11px] text-muted-foreground">{log.meta}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  className={cn(
                    'mt-6 w-full py-2 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground transition-colors',
                    GLASS,
                  )}
                >
                  View Full Logs
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
