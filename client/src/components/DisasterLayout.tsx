import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity, ArrowLeft, BellRing, Car, Code2, HeartHandshake, LayoutDashboard, MapPin, Route,
  Satellite, Siren, Sun, Users, Waves, type LucideIcon,
} from 'lucide-react';
import { useDisasterData } from '../context/DisasterDataContext';
import { Mono, Pill } from './disaster/ui';
import { riskColor } from './disaster/tokens';
import { cn } from '@/lib/utils';

type NavItem = { label: string; icon: LucideIcon; path: string; adminOnly?: boolean };

const PREDICTION_NAV: NavItem[] = [
  { label: 'Forecast', icon: Activity, path: '' },
  { label: 'Live overview', icon: LayoutDashboard, path: 'overview' },
  { label: 'Weather', icon: Sun, path: 'weather' },
  { label: 'Earthquakes', icon: Waves, path: 'earthquakes' },
  { label: 'Crowd', icon: Users, path: 'crowd' },
  { label: 'Traffic', icon: Car, path: 'traffic' },
  { label: 'Satellites', icon: Satellite, path: 'satellite' },
  { label: 'API testing', icon: Code2, path: 'api-test', adminOnly: true },
];

const MANAGEMENT_NAV: NavItem[] = [
  { label: 'Command centre', icon: Siren, path: '' },
  { label: 'Live overview', icon: LayoutDashboard, path: 'overview' },
  { label: 'Alerts', icon: BellRing, path: 'alerts' },
  { label: 'Evacuation', icon: Route, path: 'emergency' },
  { label: 'Pilgrim aids', icon: HeartHandshake, path: 'pilgrim' },
];

export default function DisasterLayout() {
  const { selectedCity, availableCities, changeCity, dashboardData, isAdmin } = useDisasterData();
  const location = useLocation();

  const riskLevel: string = ((dashboardData?.risk_score as { risk_level?: string } | undefined)?.risk_level || 'low').toLowerCase();
  const color = riskColor(riskLevel);
  const isPrediction = location.pathname.includes('disaster-prediction');
  const navItems = (isPrediction ? PREDICTION_NAV : MANAGEMENT_NAV).filter((i) => !i.adminOnly || isAdmin);

  // Last path segment decides the active item (works for /disaster-x and /__preview/disaster-x alike).
  const tail = location.pathname.replace(/\/+$/, '').split('/').pop() || '';
  const activeItem = navItems.find((i) => (i.path ? tail === i.path : tail.startsWith('disaster-'))) || navItems[0];
  const currentCity = availableCities.find((c) => c.id === selectedCity);

  const navLinkCls = (isActive: boolean) =>
    cn(
      'group flex items-center gap-2.5 rounded-xl border px-3 py-2 text-[13px] font-medium transition-all',
      isActive
        ? 'border-brand-400/30 bg-gradient-to-r from-brand-500/20 to-brand-500/5 text-foreground shadow-[inset_2px_0_0_0_hsl(var(--primary))]'
        : 'border-transparent text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground',
    );

  return (
    <div className="disaster-theme-shell relative min-h-screen pt-[4.5rem] text-foreground">
      {/* ambient backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-10 size-[520px] rounded-full bg-brand-500/15 blur-[140px] dark:bg-brand-500/10" />
        <div className="absolute -right-40 top-1/3 size-[460px] rounded-full bg-brand-violet/15 blur-[140px] dark:bg-brand-violet/10" />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.22]"
          style={{
            backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'linear-gradient(180deg, black, transparent 70%)',
          }}
        />
      </div>

      {/* Styling hooks for the remaining MUI-based prediction pages + Leaflet popups */}
      <style>{`
        .disaster-theme-shell .MuiCard-root { background: hsl(var(--card) / 0.7) !important; border: 1px solid hsl(var(--border) / 0.7) !important; box-shadow: 0 20px 60px -30px rgba(0,0,0,.6) !important; border-radius: 16px !important; }
        .disaster-theme-shell .MuiTypography-root { color: hsl(var(--foreground)); }
        .disaster-theme-shell .MuiTypography-caption { color: hsl(var(--muted-foreground)); }
        .disaster-theme-shell .MuiTabs-indicator { background: hsl(var(--primary)) !important; }
        .disaster-theme-shell .MuiTableCell-root { border-bottom: 1px solid hsl(var(--border) / 0.7) !important; }
        .disaster-theme-shell .leaflet-container { background: #0b1020; font-family: inherit; }
        .disaster-theme-shell .leaflet-tile-pane { filter: invert(1) hue-rotate(195deg) brightness(0.78) contrast(0.92) saturate(0.55); }
        .disaster-theme-shell .leaflet-popup-content-wrapper, .disaster-theme-shell .leaflet-popup-tip { background: #0b1020; color: #e6ecff; border: 1px solid rgba(255,255,255,.1); box-shadow: 0 16px 40px -12px rgba(0,0,0,.8); }
        .disaster-theme-shell .leaflet-popup-content { margin: 12px 14px; font-size: 12.5px; line-height: 1.45; }
        .disaster-theme-shell .leaflet-popup-close-button { color: #94a3b8 !important; }
        .disaster-theme-shell .leaflet-tooltip { background: #0b1020; color: #e6ecff; border: 1px solid rgba(255,255,255,.1); font-size: 12px; }
        .disaster-theme-shell .leaflet-tooltip-top:before { border-top-color: rgba(255,255,255,.1); }
        .disaster-theme-shell .leaflet-control-attribution { background: rgba(7,11,22,.7) !important; color: #64748b !important; font-size: 10px; }
        .disaster-theme-shell .leaflet-control-attribution a { color: #94a3b8 !important; }
      `}</style>

      <div className="mx-auto flex max-w-[1500px] gap-6 px-4 pb-20 pt-5 sm:px-6">
        {/* Sidebar */}
        <aside className="sticky top-[5.5rem] hidden h-[calc(100vh-7rem)] w-[236px] shrink-0 flex-col lg:flex">
          <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card/60 p-3 backdrop-blur-sm dark:border-white/[0.07] dark:bg-white/[0.03]">
            <NavLink
              to="/dashboard"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
            >
              <ArrowLeft size={14} /> Back to dashboard
            </NavLink>

            <Mono className="mb-2 mt-4 block px-2.5">{isPrediction ? 'Prediction' : 'Management'}</Mono>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink key={item.path} to={item.path} end={item.path === ''} className={({ isActive }) => navLinkCls(isActive)}>
                  {({ isActive }) => (
                    <>
                      <item.icon size={15} className={cn('shrink-0', isActive ? 'text-brand-400' : 'text-muted-foreground group-hover:text-foreground')} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto space-y-3 border-t border-border/60 pt-4 dark:border-white/[0.06]">
              <div>
                <Mono className="mb-2 block px-0.5">Live risk</Mono>
                <div
                  className="flex items-center justify-between rounded-xl border px-3 py-2"
                  style={{ borderColor: `${color}40`, background: `${color}14` }}
                >
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>
                    {riskLevel}
                  </span>
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: color }} />
                    <span className="relative inline-flex size-2 rounded-full" style={{ background: color }} />
                  </span>
                </div>
              </div>
              <div>
                <Mono className="mb-2 block px-0.5">City</Mono>
                <div className="relative">
                  <MapPin size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={selectedCity}
                    onChange={(e) => changeCity(e.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-border/80 bg-background/60 py-2 pl-8 pr-3 text-[12.5px] text-foreground outline-none focus:border-brand-400/60"
                  >
                    {availableCities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          {/* context strip */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/60 px-4 py-3 backdrop-blur-sm dark:border-white/[0.07] dark:bg-white/[0.03]">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-brand-400/25 bg-brand-500/15 text-brand-400">
                <activeItem.icon size={16} />
              </span>
              <div className="min-w-0">
                <Mono className="block">{isPrediction ? 'Disaster prediction' : 'Disaster management'}</Mono>
                <div className="truncate text-[14px] font-semibold text-foreground">
                  {activeItem.label} <span className="text-muted-foreground">·</span> {currentCity?.display_name || selectedCity}
                </div>
              </div>
            </div>
            <Pill color={color}>Live risk · {riskLevel}</Pill>
          </div>

          {/* mobile nav */}
          <div className="-mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden">
            {navItems.map((item) => (
              <NavLink
                key={`m-${item.path}`}
                to={item.path}
                end={item.path === ''}
                className={({ isActive }) =>
                  cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
                    isActive
                      ? 'border-brand-400/40 bg-brand-500/15 text-foreground'
                      : 'border-border/70 text-muted-foreground hover:text-foreground',
                  )
                }
              >
                <item.icon size={13} /> {item.label}
              </NavLink>
            ))}
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
