import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, where, type Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

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

// ─── Main Component ─────────────────────────────────────────────────────────
export default function DoctorAssistance() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isMedicalAdmin = profile?.role === 'medical_admin';

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showBooking, setShowBooking] = useState(false);

  // Booking form
  const [patientName, setPatientName] = useState(profile?.name || '');
  const [patientPhone, setPatientPhone] = useState('');
  const [reason, setReason] = useState('');
  const [bookLoading, setBookLoading] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);

  // ── Fetch doctors ─────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'doctors'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setDoctors(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Doctor)));
    });
    return unsub;
  }, []);

  // ── Fetch appointments ────────────────────────────────────────────────
  useEffect(() => {
    let q;
    if (isMedicalAdmin) {
      q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
    } else {
      q = query(
        collection(db, 'appointments'),
        where('patientUid', '==', profile?.uid || ''),
        orderBy('createdAt', 'desc'),
      );
    }
    const unsub = onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)));
    });
    return unsub;
  }, [profile, isMedicalAdmin]);

  // ── Book appointment ──────────────────────────────────────────────────
  const bookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !profile) return;
    setBookLoading(true);
    try {
      await addDoc(collection(db, 'appointments'), {
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientUid: profile.uid,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        reason: reason.trim(),
        status: 'waiting',
        createdAt: serverTimestamp(),
      });
      setBookSuccess(true);
      setShowBooking(false);
      setReason('');
      setPatientPhone('');
      setTimeout(() => setBookSuccess(false), 3000);
    } catch {
      // silent
    } finally {
      setBookLoading(false);
    }
  };

  // ── Medical admin actions ─────────────────────────────────────────────
  const updateAppointmentStatus = async (apptId: string, status: Appointment['status']) => {
    await updateDoc(doc(db, 'appointments', apptId), { status });
  };

  const deleteAppointment = async (apptId: string) => {
    await deleteDoc(doc(db, 'appointments', apptId));
  };

  const toggleDoctorAvailability = async (docId: string, available: boolean) => {
    await updateDoc(doc(db, 'doctors', docId), { available });
  };

  const deleteDoctor = async (docId: string) => {
    if (!confirm('Remove this doctor?')) return;
    await deleteDoc(doc(db, 'doctors', docId));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
    color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem',
    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem',
  };

  const statusColors: Record<string, { bg: string; border: string; color: string }> = {
    waiting: { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.3)', color: '#f59e0b' },
    in_progress: { bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.3)', color: '#3b82f6' },
    completed: { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.3)', color: '#22c55e' },
  };

  return (
    <div style={{ paddingTop: '5rem', minHeight: '100vh', background: '#050508' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
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
            width: '42px', height: '42px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
          }}>
            🏥
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
              {isMedicalAdmin ? 'Medical Admin' : 'Health Module'}
            </p>
            <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
              Doctor Assistance
            </h1>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          {isMedicalAdmin
            ? 'Manage registered doctors and patient appointment queues.'
            : 'Find a doctor and book an appointment for medical assistance.'}
        </p>
        <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(245,158,11,0.3), transparent)', marginBottom: '2rem' }} />

        {/* Success toast */}
        {bookSuccess && (
          <div style={{
            padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '1.5rem',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
          }}>
            <p style={{ color: '#22c55e', margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>✅ Appointment booked successfully!</p>
          </div>
        )}

        {/* ═══ Medical Admin: Appointments Queue ═══ */}
        {isMedicalAdmin && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>
              📋 Appointment Queue ({appointments.length})
            </h2>
            {appointments.length === 0 ? (
              <div style={{
                padding: '2rem', borderRadius: '14px', textAlign: 'center',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>No appointments yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {appointments.map((appt) => {
                  const sc = statusColors[appt.status] || statusColors.waiting;
                  return (
                    <div key={appt.id} style={{
                      padding: '1.25rem', borderRadius: '14px',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                    }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <p style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
                          {appt.patientName}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', margin: '0.2rem 0' }}>
                          📞 {appt.patientPhone} · 🩺 Dr. {appt.doctorName}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', margin: 0 }}>
                          Reason: {appt.reason || 'Not specified'}
                        </p>
                      </div>

                      {/* Status badge */}
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`,
                        borderRadius: '6px', padding: '4px 12px',
                      }}>
                        {appt.status.replace('_', ' ')}
                      </span>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {appt.status === 'waiting' && (
                          <button onClick={() => updateAppointmentStatus(appt.id, 'in_progress')} style={{
                            padding: '6px 12px', borderRadius: '8px', border: 'none',
                            background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: '0.7rem',
                            fontWeight: 600, cursor: 'pointer',
                          }}>
                            Start
                          </button>
                        )}
                        {appt.status === 'in_progress' && (
                          <button onClick={() => updateAppointmentStatus(appt.id, 'completed')} style={{
                            padding: '6px 12px', borderRadius: '8px', border: 'none',
                            background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontSize: '0.7rem',
                            fontWeight: 600, cursor: 'pointer',
                          }}>
                            Complete
                          </button>
                        )}
                        <button onClick={() => deleteAppointment(appt.id)} style={{
                          padding: '6px 12px', borderRadius: '8px', border: 'none',
                          background: 'rgba(239,68,68,0.12)', color: '#f87171', fontSize: '0.7rem',
                          fontWeight: 600, cursor: 'pointer',
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
        )}

        {/* ═══ Doctors List ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
            🩺 Available Doctors ({doctors.filter((d) => d.available).length})
          </h2>
          {(isMedicalAdmin || profile?.role === 'user') && (
            <button
              onClick={() => navigate('/doctor-registration')}
              style={{
                padding: '8px 16px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              + Register Doctor
            </button>
          )}
        </div>

        {doctors.length === 0 ? (
          <div style={{
            padding: '3rem 2rem', borderRadius: '14px', textAlign: 'center',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🩺</div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>No doctors registered yet</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {doctors.map((doc) => (
              <div key={doc.id} style={{
                padding: '1.25rem', borderRadius: '14px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                opacity: doc.available ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                    {doc.name}
                  </h3>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: doc.available ? '#22c55e' : '#ef4444',
                    background: doc.available ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                    border: `1px solid ${doc.available ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    borderRadius: '6px', padding: '3px 8px',
                  }}>
                    {doc.available ? 'Available' : 'Unavailable'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 600, color: '#a78bfa',
                    background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)',
                    borderRadius: '4px', padding: '2px 8px',
                  }}>
                    {doc.degree}
                  </span>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 600, color: '#60a5fa',
                    background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)',
                    borderRadius: '4px', padding: '2px 8px',
                  }}>
                    {doc.specialization}
                  </span>
                  {doc.experience > 0 && (
                    <span style={{
                      fontSize: '0.62rem', fontWeight: 600, color: '#fbbf24',
                      background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',
                      borderRadius: '4px', padding: '2px 8px',
                    }}>
                      {doc.experience}yr exp
                    </span>
                  )}
                </div>

                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', margin: '0 0 0.75rem' }}>
                  📞 {doc.phone}
                </p>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {/* User: book appointment */}
                  {!isMedicalAdmin && doc.available && (
                    <button
                      onClick={() => { setSelectedDoctor(doc); setShowBooking(true); }}
                      style={{
                        flex: 1, padding: '8px 14px', borderRadius: '8px', border: 'none',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      📅 Book Appointment
                    </button>
                  )}

                  {/* Medical admin: toggle + delete */}
                  {isMedicalAdmin && (
                    <>
                      <button
                        onClick={() => toggleDoctorAvailability(doc.id, !doc.available)}
                        style={{
                          flex: 1, padding: '8px 14px', borderRadius: '8px', border: 'none',
                          background: doc.available ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                          color: doc.available ? '#f87171' : '#4ade80',
                          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {doc.available ? 'Set Unavailable' : 'Set Available'}
                      </button>
                      <button
                        onClick={() => deleteDoctor(doc.id)}
                        style={{
                          padding: '8px 14px', borderRadius: '8px', border: 'none',
                          background: 'rgba(239,68,68,0.12)', color: '#f87171',
                          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ User: My Appointments ═══ */}
        {!isMedicalAdmin && appointments.length > 0 && (
          <div style={{ marginTop: '3rem' }}>
            <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>
              📋 My Appointments ({appointments.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {appointments.map((appt) => {
                const sc = statusColors[appt.status] || statusColors.waiting;
                return (
                  <div key={appt.id} style={{
                    padding: '1rem 1.25rem', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <p style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
                        🩺 Dr. {appt.doctorName}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>
                        {appt.reason || 'General checkup'}
                      </p>
                    </div>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`,
                      borderRadius: '6px', padding: '4px 12px',
                    }}>
                      {appt.status.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Booking Modal ═══ */}
      {showBooking && selectedDoctor && (
        <div
          onClick={() => setShowBooking(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '440px', padding: '2rem',
              background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
            }}
          >
            <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.3rem' }}>
              Book Appointment
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', margin: '0 0 1.5rem' }}>
              with Dr. {selectedDoctor.name} — {selectedDoctor.specialization}
            </p>

            <form onSubmit={bookAppointment}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Your Name</label>
                <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Phone Number</label>
                <input type="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} required style={inputStyle} placeholder="+91 9876543210" />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Reason for Visit</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="Describe your symptoms or reason…"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="submit"
                  disabled={bookLoading}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                    background: bookLoading ? 'rgba(245,158,11,0.3)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: bookLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {bookLoading ? 'Booking…' : 'Confirm Booking'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBooking(false)}
                  style={{
                    padding: '12px 20px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
                    color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
