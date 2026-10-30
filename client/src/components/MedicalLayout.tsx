import { NavLink, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import {
  Dashboard, VideoCall, LocalHospital, People,
  ArrowBack,
} from '@mui/icons-material';

const NAV_ITEMS = [
  { label: 'Overview', icon: <Dashboard sx={{ fontSize: 18 }} />, path: '' },
  { label: 'Video Call Queue', icon: <VideoCall sx={{ fontSize: 18 }} />, path: 'video-queue' },
  { label: 'Manage Doctors', icon: <People sx={{ fontSize: 18 }} />, path: 'doctors' },
  { label: 'Hospitals', icon: <LocalHospital sx={{ fontSize: 18 }} />, path: 'hospitals' },
];

export default function MedicalLayout() {
  const { profile } = useAuth();
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, 'videoCallQueue'),
      where('status', '==', 'waiting'),
    );
    const unsub = onSnapshot(q, (snap) => setQueueCount(snap.size), (err) => console.error('MedicalLayout queue:', err));
    return unsub;
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', paddingTop: '4.5rem', background: '#050508' }}>
      <aside style={{
        width: 220, flexShrink: 0, position: 'fixed', top: '4.5rem', left: 0, bottom: 0,
        background: 'rgba(10, 11, 18, 0.98)', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', zIndex: 40, overflowY: 'auto',
      }}>
        <NavLink
          to="/dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 16px', margin: '8px 8px 4px',
            color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem',
            textDecoration: 'none', borderRadius: 8, transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#c4b5fd'; e.currentTarget.style.background = 'rgba(196,181,253,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <ArrowBack sx={{ fontSize: 16 }} />
          Back to Dashboard
        </NavLink>

        <div style={{ padding: '8px 16px 4px', marginTop: 4 }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Medical Admin
          </span>
        </div>

        <nav style={{ flex: 1, padding: '4px 8px' }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === ''}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', margin: '2px 0', borderRadius: 10,
                textDecoration: 'none', fontSize: '0.82rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                background: isActive
                  ? 'linear-gradient(90deg, rgba(196,181,253,0.12) 0%, rgba(167,139,250,0.06) 100%)'
                  : 'transparent',
                borderLeft: isActive ? '3px solid #c4b5fd' : '3px solid transparent',
                transition: 'all 0.2s',
              })}
            >
              {item.icon}
              {item.label}
              {item.path === 'video-queue' && queueCount > 0 && (
                <span style={{
                  marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700,
                  background: '#ef4444', color: '#fff', borderRadius: '50%',
                  width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {queueCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Logged in as
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(196,181,253,0.06)', border: '1px solid rgba(196,181,253,0.15)', borderRadius: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>
              {profile?.name?.charAt(0)?.toUpperCase() || 'M'}
            </div>
            <div>
              <p style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600, margin: 0 }}>{profile?.name || 'Admin'}</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', margin: 0 }}>Medical Admin</p>
            </div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, marginLeft: 220, padding: '24px 32px 64px', minHeight: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
}
