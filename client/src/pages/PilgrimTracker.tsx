import { useNavigate } from 'react-router-dom';

export default function PilgrimTracker() {
  const navigate = useNavigate();

  return (
    <div style={{ paddingTop: '6rem', minHeight: '100vh', background: '#050508' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1.5rem' }}
        >
          ← Back to Dashboard
        </button>

        <h1 style={{ color: '#fff', fontSize: '2rem', fontWeight: 700, margin: 0 }}>Pilgrim Tracker</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Real-time pilgrim location tracking system
        </p>

        <div style={{
          marginTop: '3rem',
          padding: '4rem 2rem',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📍</div>
          <h2 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
            Coming Soon
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            This module is under development. GPS-based pilgrim tracking will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
}
