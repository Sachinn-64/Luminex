import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, updateDoc, doc, setDoc, serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

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

const VIDEO_CALL_URL = 'https://video-call-final.vercel.app/';

export default function DoctorVideoQueue() {
  const { profile } = useAuth();
  const [queue, setQueue] = useState<VideoCall[]>([]);
  const [acceptedCalls, setAcceptedCalls] = useState<VideoCall[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);

  // Waiting calls
  useEffect(() => {
    const q = query(
      collection(db, 'videoCallQueue'),
      where('status', '==', 'waiting'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as VideoCall));
      docs.sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
      setQueue(docs);
    }, (err) => console.error('DoctorVideoQueue waiting:', err));
    return unsub;
  }, []);

  // Calls accepted by this doctor
  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'videoCallQueue'),
      where('status', '==', 'accepted'),
      where('acceptedBy', '==', profile.uid),
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as VideoCall));
      docs.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      setAcceptedCalls(docs);
    }, (err) => console.error('DoctorVideoQueue accepted:', err));
    return unsub;
  }, [profile?.uid]);

  const acceptCall = async (call: VideoCall) => {
    if (!profile) return;
    setAccepting(call.id);
    try {
      await Promise.all([
        updateDoc(doc(db, 'videoCallQueue', call.id), {
          status: 'accepted',
          acceptedBy: profile.uid,
          acceptedByName: profile.name,
        }),
        setDoc(doc(db, 'appointments', call.id), {
          patientName: call.patientName,
          patientPhone: call.patientPhone,
          patientUid: call.patientUid,
          doctorId: profile.uid,
          doctorName: profile.name,
          reason: call.reason,
          status: 'in_progress',
          roomId: call.roomId,
          videoCallId: call.id,
          createdAt: call.createdAt ?? serverTimestamp(),
          acceptedAt: serverTimestamp(),
        }),
      ]);
      // Open video call in new tab
      window.open(`${VIDEO_CALL_URL}?roomID=${encodeURIComponent(call.roomId)}`, '_blank');
    } finally {
      setAccepting(null);
    }
  };

  const completeCall = async (callId: string) => {
    await Promise.all([
      updateDoc(doc(db, 'videoCallQueue', callId), { status: 'completed' }),
      setDoc(doc(db, 'appointments', callId), {
        status: 'completed',
        completedAt: serverTimestamp(),
      }, { merge: true }),
    ]);
  };

  const rejoinCall = (roomId: string) => {
    window.open(`${VIDEO_CALL_URL}?roomID=${encodeURIComponent(roomId)}`, '_blank');
  };

  const formatTime = (ts: Timestamp | null) => {
    if (!ts) return '—';
    const d = ts.toDate();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString();
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
          Doctor Panel
        </p>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0 0' }}>
          Emergency Video Call Queue
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>
          Accept incoming emergency video calls from patients
        </p>
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(239,68,68,0.3), transparent)', marginBottom: '2rem' }} />

      {/* Active calls (accepted by me) */}
      {acceptedCalls.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
            🟢 My Active Calls ({acceptedCalls.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {acceptedCalls.map(call => (
              <div key={call.id} style={{
                padding: '1.25rem', borderRadius: '14px',
                background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.2)',
                display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{call.patientName}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', margin: '0.2rem 0' }}>
                    📞 {call.patientPhone} · {call.reason || 'Emergency'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', margin: 0 }}>
                    Room: {call.roomId}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => rejoinCall(call.roomId)}
                    style={{
                      padding: '8px 16px', borderRadius: '10px', border: 'none',
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    📹 Rejoin Call
                  </button>
                  <button
                    onClick={() => completeCall(call.id)}
                    style={{
                      padding: '8px 16px', borderRadius: '10px', border: 'none',
                      background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                      fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    End Call
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiting queue */}
      <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
        🔴 Waiting Queue ({queue.length})
      </h2>

      {queue.length === 0 ? (
        <div style={{
          padding: '3rem 2rem', borderRadius: '14px', textAlign: 'center',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>📹</div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>No patients waiting</p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
            New emergency calls will appear here in real-time
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {queue.map((call, idx) => (
            <div key={call.id} style={{
              padding: '1.25rem', borderRadius: '14px',
              background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.12)',
              display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
            }}>
              {/* Position */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
              }}>
                #{idx + 1}
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
                  {call.patientName}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', margin: '0.2rem 0' }}>
                  📞 {call.patientPhone} · {call.reason || 'Emergency'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.68rem', margin: 0 }}>
                  {formatTime(call.createdAt)}
                </p>
              </div>

              {/* Pulse indicator */}
              <div style={{
                width: 10, height: 10, borderRadius: '50%', background: '#ef4444',
                boxShadow: '0 0 10px #ef4444', animation: 'pulse 1.5s infinite',
              }} />

              <button
                onClick={() => acceptCall(call)}
                disabled={accepting === call.id}
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: 'none',
                  background: accepting === call.id
                    ? 'rgba(34,197,94,0.2)'
                    : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#fff', fontSize: '0.82rem', fontWeight: 700,
                  cursor: accepting === call.id ? 'not-allowed' : 'pointer',
                }}
              >
                {accepting === call.id ? 'Connecting…' : '📹 Accept Call'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
