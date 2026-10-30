import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, doc, getDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

interface VideoCall {
  id: string;
  patientName: string;
  reason: string;
  status: 'waiting' | 'accepted' | 'completed';
  createdAt: Timestamp | null;
}

interface DoctorProfile {
  name: string;
  specialization: string;
  available: boolean;
  experience: number;
}

const cardStyle: React.CSSProperties = {
  padding: '1.5rem', borderRadius: '16px',
  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
};

export default function DoctorDashboard() {
  const { profile } = useAuth();
  const [videoQueue, setVideoQueue] = useState<VideoCall[]>([]);
  const [doctorInfo, setDoctorInfo] = useState<DoctorProfile | null>(null);

  // Fetch doctor profile from doctors collection
  useEffect(() => {
    if (!profile?.uid) return;
    const fetchDoctor = async () => {
      const snap = await getDoc(doc(db, 'doctors', profile.uid));
      if (snap.exists()) setDoctorInfo(snap.data() as DoctorProfile);
    };
    fetchDoctor();
  }, [profile?.uid]);

  // Fetch video call queue
  useEffect(() => {
    const q = query(
      collection(db, 'videoCallQueue'),
      where('status', '==', 'waiting'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as VideoCall));
      docs.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      setVideoQueue(docs);
    }, (err) => console.error('DoctorDashboard videoQueue:', err));
    return unsub;
  }, []);

  const stats = [
    { label: 'Waiting Queue', value: videoQueue.length, color: '#ef4444', icon: '🔴' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
          Doctor Panel
        </p>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0 0' }}>
          Welcome back, Dr. {profile?.name || 'Doctor'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>
          {doctorInfo?.specialization || 'General Medicine'} · {doctorInfo?.experience || 0} years experience
        </p>
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(196,181,253,0.3), transparent)', marginBottom: '2rem' }} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '1rem', marginBottom: '2rem', maxWidth: 280 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            ...cardStyle,
            borderColor: `${s.color}20`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '1.8rem' }}>{s.icon}</span>
              <span style={{ color: s.color, fontSize: '2rem', fontWeight: 800 }}>{s.value}</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 600, margin: '0.5rem 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Emergency Video Calls */}
      <div style={cardStyle}>
          <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem' }}>
            🚨 Emergency Video Calls
          </h2>
          {videoQueue.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
              No pending calls
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {videoQueue.slice(0, 5).map(call => (
                <div key={call.id} style={{
                  padding: '0.75rem', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{call.patientName}</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', margin: '0.15rem 0 0' }}>
                      {call.reason || 'Emergency'}
                    </p>
                  </div>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
                    boxShadow: '0 0 8px #ef4444', animation: 'pulse 1.5s infinite',
                  }} />
                </div>
              ))}
              {videoQueue.length > 5 && (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', textAlign: 'center' }}>
                  +{videoQueue.length - 5} more in queue
                </p>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
