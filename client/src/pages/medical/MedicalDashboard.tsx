import { useState, useEffect } from 'react';
import {
  collection, query, onSnapshot, where,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  available: boolean;
}

interface VideoCall {
  id: string;
  status: 'waiting' | 'accepted' | 'completed';
}

interface Hospital {
  id: string;
  name: string;
  beds: number;
}

const cardStyle: React.CSSProperties = {
  padding: '1.5rem', borderRadius: '16px',
  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
};

export default function MedicalDashboard() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [videoQueue, setVideoQueue] = useState<VideoCall[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);

  useEffect(() => {
    const errHandler = (label: string) => (err: Error) => console.error(`MedicalDashboard ${label}:`, err);
    const unsubs = [
      onSnapshot(collection(db, 'doctors'), (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Doctor));
        setDoctors(docs);
      }, errHandler('doctors')),
      onSnapshot(query(collection(db, 'videoCallQueue'), where('status', '==', 'waiting')), (snap) => {
        setVideoQueue(snap.docs.map(d => ({ id: d.id, ...d.data() } as VideoCall)));
      }, errHandler('videoQueue')),
      onSnapshot(collection(db, 'hospitals'), (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Hospital));
        docs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setHospitals(docs);
      }, errHandler('hospitals')),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const availableDoctors = doctors.filter(d => d.available).length;
  const totalBeds = hospitals.reduce((sum, h) => sum + (h.beds || 0), 0);

  const stats = [
    { label: 'Emergency Queue', value: videoQueue.length, color: '#ef4444', icon: '🚨' },
    { label: 'Total Doctors', value: doctors.length, color: '#a78bfa', icon: '🩺' },
    { label: 'Available Now', value: availableDoctors, color: '#22c55e', icon: '🟢' },
    { label: 'Hospitals', value: hospitals.length, color: '#3b82f6', icon: '🏥' },
    { label: 'Total Beds', value: totalBeds, color: '#f59e0b', icon: '🛏️' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
          Medical Admin
        </p>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0 0' }}>
          Medical Administration Dashboard
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>
          Monitor doctors, hospitals, and emergency operations
        </p>
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(196,181,253,0.3), transparent)', marginBottom: '2rem' }} />

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...cardStyle, borderColor: `${s.color}20` }}>
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

      {/* Two column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Doctor availability */}
        <div style={cardStyle}>
          <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem' }}>
            🩺 Doctor Availability
          </h2>
          {doctors.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No doctors registered</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {doctors.slice(0, 6).map(doc => (
                <div key={doc.id} style={{
                  padding: '0.6rem 0.75rem', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 600, margin: 0 }}>{doc.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', margin: 0 }}>{doc.specialization}</p>
                  </div>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: doc.available ? '#22c55e' : '#ef4444',
                  }} />
                </div>
              ))}
              {doctors.length > 6 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', textAlign: 'center' }}>+{doctors.length - 6} more</p>}
            </div>
          )}
        </div>

        {/* Emergency queue preview */}
        <div style={cardStyle}>
          <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem' }}>
            🚨 Emergency Queue
          </h2>
          {videoQueue.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No pending calls</p>
          ) : (
            <div style={{
              padding: '1.5rem', borderRadius: '12px', textAlign: 'center',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
            }}>
              <p style={{ color: '#ef4444', fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>{videoQueue.length}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', margin: '0.3rem 0 0' }}>
                patients waiting for a doctor
              </p>
              <div style={{
                marginTop: '1rem', width: 12, height: 12, borderRadius: '50%', background: '#ef4444',
                boxShadow: '0 0 12px #ef4444', animation: 'pulse 1.5s infinite', margin: '1rem auto 0',
              }} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
