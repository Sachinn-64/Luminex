import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useDisasterData } from '../context/DisasterDataContext';
import {
  Dashboard, WbSunny, Waves, Groups, DirectionsCar,
  NotificationsActive, Emergency, Satellite, Hiking, ArrowBack, Code, Place,
} from '@mui/icons-material';

const RISK_COLORS: Record<string, string> = { critical: '#FF4757', high: '#FFA502', moderate: '#FFD700', low: '#2ED573' };

const NAV_ITEMS = [
  { label: 'Overview', icon: <Dashboard sx={{ fontSize: 18 }} />, path: '' },
  { label: 'Weather', icon: <WbSunny sx={{ fontSize: 18 }} />, path: 'weather' },
  { label: 'Earthquakes', icon: <Waves sx={{ fontSize: 18 }} />, path: 'earthquakes' },
  { label: 'Crowd', icon: <Groups sx={{ fontSize: 18 }} />, path: 'crowd' },
  { label: 'Traffic', icon: <DirectionsCar sx={{ fontSize: 18 }} />, path: 'traffic' },
  { label: 'Alerts', icon: <NotificationsActive sx={{ fontSize: 18 }} />, path: 'alerts' },
  { label: 'Emergency', icon: <Emergency sx={{ fontSize: 18 }} />, path: 'emergency' },
  { label: 'Satellites', icon: <Satellite sx={{ fontSize: 18 }} />, path: 'satellite' },
  { label: 'Pilgrim Aids', icon: <Hiking sx={{ fontSize: 18 }} />, path: 'pilgrim' },
  { label: 'API Testing', icon: <Code sx={{ fontSize: 18 }} />, path: 'api-test', adminOnly: true },
] as const;

export default function DisasterLayout() {
  const { selectedCity, availableCities, changeCity, dashboardData, isAdmin } = useDisasterData();
  const location = useLocation();
  const riskLevel = (dashboardData?.risk_score as any)?.risk_level || 'low';
  const riskColor = RISK_COLORS[riskLevel?.toLowerCase()] || RISK_COLORS.low;
  const visibleNavItems = NAV_ITEMS.filter(item => !('adminOnly' in item && item.adminOnly) || isAdmin);
  const baseRoute = location.pathname.startsWith('/disaster-prediction')
    ? '/disaster-prediction'
    : '/disaster-management';
  const activeItem = visibleNavItems.find((item) => {
    const fullPath = item.path ? `${baseRoute}/${item.path}` : baseRoute;
    return location.pathname === fullPath || location.pathname === `${fullPath}/`;
  });
  const currentCity = availableCities.find((c) => c.id === selectedCity);

  return (
    <div className="disaster-theme-shell" style={{ display: 'flex', minHeight: '100vh', paddingTop: '4.5rem' }}>
      <style>{`
        .disaster-theme-shell {
          background:
            radial-gradient(circle at 10% 10%, rgba(124, 58, 237, 0.12), transparent 45%),
            radial-gradient(circle at 85% 15%, rgba(14, 116, 144, 0.1), transparent 40%),
            hsl(var(--background));
          color: hsl(var(--foreground));
        }

        .disaster-theme-shell .MuiCard-root {
          background: hsl(var(--card) / 0.75) !important;
          border: 1px solid hsl(var(--border) / 0.7) !important;
          box-shadow: 0 16px 32px rgba(2, 6, 23, 0.18) !important;
          border-radius: 14px !important;
        }

        .disaster-theme-shell .MuiTypography-h3,
        .disaster-theme-shell .MuiTypography-h4,
        .disaster-theme-shell .MuiTypography-h5,
        .disaster-theme-shell .MuiTypography-h6,
        .disaster-theme-shell .MuiTypography-subtitle1,
        .disaster-theme-shell .MuiTypography-subtitle2,
        .disaster-theme-shell .MuiTypography-body1,
        .disaster-theme-shell .MuiTypography-body2 {
          color: hsl(var(--foreground));
        }

        .disaster-theme-shell .MuiTypography-caption {
          color: hsl(var(--muted-foreground));
        }

        .disaster-theme-shell .MuiTabs-indicator {
          background: hsl(var(--primary)) !important;
        }

        .disaster-theme-shell .MuiTableCell-root {
          border-bottom: 1px solid hsl(var(--border) / 0.7) !important;
        }

        .disaster-theme-shell .leaflet-container {
          border-radius: 12px;
        }

        .disaster-top-nav {
          display: none;
        }

        @media (max-width: 1023px) {
          .disaster-sidebar {
            display: none !important;
          }

          .disaster-main {
            margin-left: 0 !important;
            padding: 16px 14px 56px !important;
          }

          .disaster-top-nav {
            display: block;
            position: sticky;
            top: 4.5rem;
            z-index: 30;
            margin: 0 0 14px;
            padding: 8px;
            border: 1px solid hsl(var(--border) / 0.7);
            border-radius: 12px;
            background: hsl(var(--card) / 0.78);
            backdrop-filter: blur(10px);
            overflow-x: auto;
            white-space: nowrap;
          }
        }
      `}</style>

      {/* Sidebar */}
      <aside className="disaster-sidebar" style={{
        width: 220,
        flexShrink: 0,
        position: 'fixed',
        top: '4.5rem',
        left: 0,
        bottom: 0,
        background: 'hsl(var(--card) / 0.86)',
        borderRight: '1px solid hsl(var(--border) / 0.8)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        overflowY: 'auto',
        backdropFilter: 'blur(10px)',
      }}>
        {/* Back to dashboard */}
        <NavLink
          to="/dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 16px', margin: '8px 8px 4px',
            color: 'hsl(var(--muted-foreground))', fontSize: '0.78rem',
            textDecoration: 'none', borderRadius: 8,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--primary))'; e.currentTarget.style.background = 'hsl(var(--primary) / 0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--muted-foreground))'; e.currentTarget.style.background = 'transparent'; }}
        >
          <ArrowBack sx={{ fontSize: 16 }} />
          Back to Dashboard
        </NavLink>

        <div style={{ padding: '8px 16px 4px', marginTop: 4 }}>
          <span style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.75, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Monitoring
          </span>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '4px 8px' }}>
          {visibleNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === ''}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                margin: '2px 0',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: '0.82rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                background: isActive
                  ? 'linear-gradient(90deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.04) 100%)'
                  : 'transparent',
                borderLeft: isActive ? '3px solid hsl(var(--primary))' : '3px solid transparent',
                transition: 'all 0.2s',
              })}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Risk level indicator */}
        <div style={{ padding: '8px 16px 4px', borderTop: '1px solid hsl(var(--border) / 0.8)' }}>
          <span style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.75, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Risk Level</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: `${riskColor}10`, border: `1px solid ${riskColor}30`, borderRadius: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: riskColor, boxShadow: `0 0 6px ${riskColor}` }} />
            <span style={{ color: riskColor, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{riskLevel}</span>
          </div>
        </div>

        {/* City selector */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(var(--border) / 0.8)' }}>
          <span style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.75, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            City
          </span>
          <select
            value={selectedCity}
            onChange={e => changeCity(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              background: 'hsl(var(--background) / 0.75)',
              border: '1px solid hsl(var(--border) / 0.8)',
              borderRadius: 8,
              color: 'hsl(var(--foreground))',
              fontSize: '0.78rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {availableCities.map(c => (
              <option key={c.id} value={c.id} style={{ background: 'hsl(var(--card))' }}>
                {c.display_name}
              </option>
            ))}
          </select>
        </div>
      </aside>

      {/* Main content */}
      <main className="disaster-main" style={{
        flex: 1,
        marginLeft: 220,
        padding: '24px 32px 64px',
        minHeight: '100%',
      }}>
        <div style={{
          marginBottom: 14,
          padding: '12px 14px',
          borderRadius: 12,
          border: '1px solid hsl(var(--border) / 0.7)',
          background: 'hsl(var(--card) / 0.72)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
              Disaster Management
            </span>
            <span style={{ fontSize: '0.96rem', color: 'hsl(var(--foreground))', fontWeight: 700 }}>
              {activeItem?.label || 'Overview'} • {currentCity?.display_name || selectedCity}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, color: riskColor, background: `${riskColor}14`, border: `1px solid ${riskColor}40` }}>
              <Place sx={{ fontSize: 14 }} />
              Live Risk: {riskLevel.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="disaster-top-nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={`mobile-${item.path}`}
              to={item.path}
              end={item.path === ''}
              style={({ isActive }) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 10px',
                marginRight: 6,
                borderRadius: 999,
                textDecoration: 'none',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                background: isActive ? 'hsl(var(--primary) / 0.15)' : 'transparent',
                border: `1px solid ${isActive ? 'hsl(var(--primary) / 0.35)' : 'hsl(var(--border) / 0.6)'}`,
              })}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>

        <Outlet />
      </main>
    </div>
  );
}
