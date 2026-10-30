import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, addDoc, serverTimestamp, doc, onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

const VIDEO_CALL_URL = 'https://video-call-final.vercel.app/';

function generateRoomId(): string {
  return `room-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export default function EmergencyCall() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [patientName, setPatientName] = useState(profile?.name || '');
  const [patientPhone, setPatientPhone] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // After submission
  const [callDocId, setCallDocId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<'waiting' | 'accepted' | 'completed'>('waiting');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [acceptedByName, setAcceptedByName] = useState<string | null>(null);

  // Listen for call status changes
  useEffect(() => {
    if (!callDocId) return;
    const unsub = onSnapshot(doc(db, 'videoCallQueue', callDocId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setCallStatus(data.status);
      if (data.acceptedByName) setAcceptedByName(data.acceptedByName);
    });
    return unsub;
  }, [callDocId]);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    const newRoomId = generateRoomId();
    try {
      const docRef = await addDoc(collection(db, 'videoCallQueue'), {
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientUid: profile.uid,
        reason: reason.trim(),
        roomId: newRoomId,
        status: 'waiting',
        acceptedBy: null,
        acceptedByName: null,
        createdAt: serverTimestamp(),
      });
      setCallDocId(docRef.id);
      setRoomId(newRoomId);
    } finally {
      setSubmitting(false);
    }
  };

  const joinCall = () => {
    if (!roomId) return;
    window.open(`${VIDEO_CALL_URL}?roomID=${encodeURIComponent(roomId)}`, '_blank');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
    color: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem',
    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem',
  };

  // ── Waiting / Accepted screen ──
  if (callDocId) {
    return (
      <div style={{ paddingTop: '5rem', minHeight: '100vh', background: '#050508' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
              color: 'rgba(255,255,255,0.5)', padding: '6px 14px', fontSize: '0.75rem',
              cursor: 'pointer', marginBottom: '2rem',
            }}
          >
            ← Back to Dashboard
          </button>

          {callStatus === 'waiting' && (
            <div style={{
              padding: '3rem 2rem', borderRadius: '20px',
              background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
            }}>
              {/* Pulsing indicator */}
              <div style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 1.5rem',
                background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: '#ef4444',
                  boxShadow: '0 0 20px rgba(239,68,68,0.5)', animation: 'pulse 1.5s infinite',
                }} />
              </div>

              <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                Waiting for a Doctor…
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
                Your emergency request has been placed in the queue. A doctor will accept your call shortly.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>
                Please keep this page open. You will be notified when a doctor is ready.
              </p>
            </div>
          )}

          {callStatus === 'accepted' && (
            <div style={{
              padding: '3rem 2rem', borderRadius: '20px',
              background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.2)',
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', margin: '0 auto 1.5rem',
                background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem',
              }}>
                ✅
              </div>

              <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                Doctor is Ready!
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>
                {acceptedByName ? `Dr. ${acceptedByName} has accepted your call.` : 'A doctor has accepted your call.'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', margin: '0 0 1.5rem' }}>
                Click the button below to join the video call.
              </p>
              <button
                onClick={joinCall}
                style={{
                  padding: '16px 40px', borderRadius: '14px', border: 'none',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#fff', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
                }}
              >
                📹 Join Video Call
              </button>
            </div>
          )}

          {callStatus === 'completed' && (
            <div style={{
              padding: '3rem 2rem', borderRadius: '20px',
              background: 'rgba(107,114,128,0.04)', border: '1px solid rgba(107,114,128,0.15)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✔️</div>
              <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                Call Completed
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                Your emergency video consultation has been completed.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  marginTop: '1.5rem', padding: '12px 28px', borderRadius: '10px', border: 'none',
                  background: 'rgba(196,181,253,0.15)', color: '#c4b5fd',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Request form ──
  return (
    <div style={{ paddingTop: '5rem', minHeight: '100vh', background: '#050508' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '2rem' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
            color: 'rgba(255,255,255,0.5)', padding: '6px 14px', fontSize: '0.75rem',
            cursor: 'pointer', marginBottom: '1.5rem',
          }}
        >
          ← Back to Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
          }}>
            🚨
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
              Emergency Service
            </p>
            <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
              Emergency Video Call
            </h1>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Request an immediate video consultation with an available doctor. Your call will be placed in a priority queue.
        </p>
        <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(239,68,68,0.3), transparent)', marginBottom: '2rem' }} />

        <form onSubmit={submitRequest} style={{
          padding: '2rem', borderRadius: '18px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Your Name</label>
            <input
              type="text" value={patientName}
              onChange={e => setPatientName(e.target.value)}
              required style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Phone Number</label>
            <input
              type="tel" value={patientPhone}
              onChange={e => setPatientPhone(e.target.value)}
              required style={inputStyle} placeholder="+91 9876543210"
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Describe the Emergency</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              required rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Describe your symptoms or emergency situation…"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              background: submitting
                ? 'rgba(239,68,68,0.3)'
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff', fontSize: '1rem', fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: submitting ? 'none' : '0 4px 20px rgba(239,68,68,0.25)',
            }}
          >
            {submitting ? 'Submitting…' : '🚨 Request Emergency Video Call'}
          </button>

          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', textAlign: 'center', marginTop: '1rem' }}>
            A doctor will accept your call as soon as possible. Please stay on this page.
          </p>
        </form>
      </div>
    </div>
  );
}
