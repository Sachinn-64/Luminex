import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, updateDoc, deleteDoc, doc,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';

interface Doctor {
  id: string;
  name: string;
  degree: string;
  specialization: string;
  phone: string;
  experience: number;
  available: boolean;
  createdAt: Timestamp | null;
}

export default function MedicalDoctors() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'doctors'), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Doctor));
      docs.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      setDoctors(docs);
    }, (err) => console.error('MedicalDoctors:', err));
    return unsub;
  }, []);

  const toggleAvailability = async (docId: string, available: boolean) => {
    await updateDoc(doc(db, 'doctors', docId), { available });
  };

  const deleteDoctor = async (docId: string) => {
    if (!confirm('Remove this doctor permanently?')) return;
    await deleteDoc(doc(db, 'doctors', docId));
  };

  const filtered = doctors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.specialization.toLowerCase().includes(search.toLowerCase()),
  );

  const availableCount = doctors.filter(d => d.available).length;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
          Medical Admin
        </p>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0 0' }}>
          Manage Doctors
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>
          {doctors.length} registered · {availableCount} available
        </p>
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(196,181,253,0.3), transparent)', marginBottom: '1.5rem' }} />

      {/* Search + Add */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search doctors…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
            color: '#fff', fontSize: '0.85rem', outline: 'none',
          }}
        />
        <button
          onClick={() => navigate('/doctor-registration')}
          style={{
            padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          + Register Doctor
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{
          padding: '3rem 2rem', borderRadius: '14px', textAlign: 'center',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🩺</div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
            {search ? 'No doctors match your search' : 'No doctors registered yet'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {filtered.map(d => (
            <div key={d.id} style={{
              padding: '1.25rem', borderRadius: '14px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              opacity: d.available ? 1 : 0.6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{d.name}</h3>
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: d.available ? '#22c55e' : '#ef4444',
                  background: d.available ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                  border: `1px solid ${d.available ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: '6px', padding: '3px 8px',
                }}>
                  {d.available ? 'Available' : 'Unavailable'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#a78bfa', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '4px', padding: '2px 8px' }}>
                  {d.degree}
                </span>
                <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#60a5fa', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: '4px', padding: '2px 8px' }}>
                  {d.specialization}
                </span>
                {d.experience > 0 && (
                  <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '4px', padding: '2px 8px' }}>
                    {d.experience}yr exp
                  </span>
                )}
              </div>

              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', margin: '0 0 0.75rem' }}>📞 {d.phone}</p>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => toggleAvailability(d.id, !d.available)}
                  style={{
                    flex: 1, padding: '8px 14px', borderRadius: '8px', border: 'none',
                    background: d.available ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                    color: d.available ? '#f87171' : '#4ade80',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {d.available ? 'Set Unavailable' : 'Set Available'}
                </button>
                <button
                  onClick={() => deleteDoctor(d.id)}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: 'none',
                    background: 'rgba(239,68,68,0.12)', color: '#f87171',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
