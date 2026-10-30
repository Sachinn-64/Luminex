import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface VideoCall {
  id: string;
  patientName: string;
  patientPhone: string;
  patientUid: string;
  reason: string;
  roomId: string;
  status: 'waiting' | 'accepted' | 'completed';
  acceptedBy: string | null;
  acceptedByName: string | null;
  createdAt: Timestamp | null;
}

export default function MedicalVideoQueue() {
  const [waiting, setWaiting] = useState<VideoCall[]>([]);
  const [accepted, setAccepted] = useState<VideoCall[]>([]);
  const [completed, setCompleted] = useState<VideoCall[]>([]);
  const [tab, setTab] = useState<'waiting' | 'accepted' | 'completed'>('waiting');

  useEffect(() => {
    const errHandler = (label: string) => (err: Error) => console.error(`MedicalVideoQueue ${label}:`, err);
    const unsubs = [
      onSnapshot(query(collection(db, 'videoCallQueue'), where('status', '==', 'waiting')), (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as VideoCall));
        docs.sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
        setWaiting(docs);
      }, errHandler('waiting')),
      onSnapshot(query(collection(db, 'videoCallQueue'), where('status', '==', 'accepted')), (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as VideoCall));
        docs.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        setAccepted(docs);
      }, errHandler('accepted')),
      onSnapshot(query(collection(db, 'videoCallQueue'), where('status', '==', 'completed')), (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as VideoCall));
        docs.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
        setCompleted(docs);
      }, errHandler('completed')),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const formatTime = (ts: Timestamp | null) => {
    if (!ts) return '—';
    const d = ts.toDate();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString();
  };

  const tabs = [
    { key: 'waiting' as const, label: 'Waiting', count: waiting.length, color: '#ef4444' },
    { key: 'accepted' as const, label: 'Active', count: accepted.length, color: '#22c55e' },
    { key: 'completed' as const, label: 'Completed', count: completed.length, color: '#6b7280' },
  ];

  const currentList = tab === 'waiting' ? waiting : tab === 'accepted' ? accepted : completed;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
          Medical Admin
        </p>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0 0' }}>
          Video Call Queue Monitor
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>
          Monitor all emergency video call requests and their status
        </p>
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(239,68,68,0.3), transparent)', marginBottom: '1.5rem' }} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: 'none',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              background: tab === t.key ? `${t.color}18` : 'rgba(255,255,255,0.04)',
              color: tab === t.key ? t.color : 'rgba(255,255,255,0.4)',
              ...(tab === t.key ? { border: `1px solid ${t.color}35` } : { border: '1px solid rgba(255,255,255,0.06)' }),
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {currentList.length === 0 ? (
        <div style={{
          padding: '3rem 2rem', borderRadius: '14px', textAlign: 'center',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>📹</div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
            No {tab} calls
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {currentList.map((call, idx) => {
            const statusConfig = {
              waiting: { bg: 'rgba(239,68,68,0.04)', border: 'rgba(239,68,68,0.12)', badge: '#ef4444' },
              accepted: { bg: 'rgba(34,197,94,0.04)', border: 'rgba(34,197,94,0.12)', badge: '#22c55e' },
              completed: { bg: 'rgba(107,114,128,0.04)', border: 'rgba(107,114,128,0.12)', badge: '#6b7280' },
            }[call.status];

            return (
              <div key={call.id} style={{
                padding: '1.25rem', borderRadius: '14px',
                background: statusConfig.bg, border: `1px solid ${statusConfig.border}`,
                display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
              }}>
                {tab === 'waiting' && (
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    #{idx + 1}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{call.patientName}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', margin: '0.2rem 0' }}>
                    📞 {call.patientPhone} · {call.reason || 'Emergency'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.68rem', margin: 0 }}>
                    {formatTime(call.createdAt)}
                    {call.acceptedByName && ` · Accepted by Dr. ${call.acceptedByName}`}
                  </p>
                </div>

                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: statusConfig.badge, background: `${statusConfig.badge}12`,
                  border: `1px solid ${statusConfig.badge}30`, borderRadius: 6, padding: '4px 10px',
                }}>
                  {call.status}
                </span>

                {call.status === 'waiting' && (
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', background: '#ef4444',
                    boxShadow: '0 0 10px #ef4444', animation: 'pulse 1.5s infinite',
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
