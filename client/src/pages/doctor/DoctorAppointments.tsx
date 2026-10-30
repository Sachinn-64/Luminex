import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, updateDoc, deleteDoc, doc,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  patientUid: string;
  doctorId: string;
  doctorName: string;
  reason: string;
  status: 'waiting' | 'in_progress' | 'completed';
  createdAt: Timestamp | null;
}

const statusColors: Record<string, { bg: string; border: string; color: string }> = {
  waiting: { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b' },
  in_progress: { bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.3)', color: '#3b82f6' },
  completed: { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' },
};

export default function DoctorAppointments() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'appointments'),
      where('doctorId', '==', profile.uid),
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
      docs.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      setAppointments(docs);
    }, (err) => console.error('DoctorAppointments:', err));
    return unsub;
  }, [profile?.uid]);

  const updateStatus = async (id: string, status: Appointment['status']) => {
    await updateDoc(doc(db, 'appointments', id), { status });
  };

  const removeAppointment = async (id: string) => {
    await deleteDoc(doc(db, 'appointments', id));
  };

  const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);

  const filters = [
    { key: 'all', label: 'All', count: appointments.length },
    { key: 'waiting', label: 'Waiting', count: appointments.filter(a => a.status === 'waiting').length },
    { key: 'in_progress', label: 'In Progress', count: appointments.filter(a => a.status === 'in_progress').length },
    { key: 'completed', label: 'Completed', count: appointments.filter(a => a.status === 'completed').length },
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
          Doctor Panel
        </p>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0 0' }}>
          My Appointments
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>
          Manage your patient appointments
        </p>
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(196,181,253,0.3), transparent)', marginBottom: '1.5rem' }} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '8px 16px', borderRadius: '10px', border: 'none',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              background: filter === f.key ? 'rgba(196,181,253,0.15)' : 'rgba(255,255,255,0.04)',
              color: filter === f.key ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
              ...(filter === f.key ? { border: '1px solid rgba(196,181,253,0.3)' } : { border: '1px solid rgba(255,255,255,0.06)' }),
            }}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{
          padding: '3rem 2rem', borderRadius: '14px', textAlign: 'center',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>📋</div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>No appointments found</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(appt => {
            const sc = statusColors[appt.status] || statusColors.waiting;
            return (
              <div key={appt.id} style={{
                padding: '1.25rem', borderRadius: '14px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{appt.patientName}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', margin: '0.2rem 0' }}>
                    📞 {appt.patientPhone} · Reason: {appt.reason || 'Not specified'}
                  </p>
                </div>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`,
                  borderRadius: '6px', padding: '4px 12px',
                }}>
                  {appt.status.replace('_', ' ')}
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {appt.status === 'waiting' && (
                    <button onClick={() => updateStatus(appt.id, 'in_progress')} style={{
                      padding: '6px 14px', borderRadius: '8px', border: 'none',
                      background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                      fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                    }}>
                      Start
                    </button>
                  )}
                  {appt.status === 'in_progress' && (
                    <button onClick={() => updateStatus(appt.id, 'completed')} style={{
                      padding: '6px 14px', borderRadius: '8px', border: 'none',
                      background: 'rgba(34,197,94,0.15)', color: '#4ade80',
                      fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                    }}>
                      Complete
                    </button>
                  )}
                  <button onClick={() => removeAppointment(appt.id)} style={{
                    padding: '6px 14px', borderRadius: '8px', border: 'none',
                    background: 'rgba(239,68,68,0.12)', color: '#f87171',
                    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                  }}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
