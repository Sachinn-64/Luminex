import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, type Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Role } from '../context/AuthContext';

interface UserRecord {
  uid: string;
  name: string;
  email: string;
  role: Role;
}

interface DoctorRecord {
  id: string;
  name: string;
  specialization: string;
  degree: string;
  available: boolean;
}

interface SearchRequest {
  id: string;
  userId: string;
  userName: string;
  personName: string;
  personDescription: string;
  targetImageBase64: string;
  status: 'pending' | 'processing' | 'completed' | 'not_found';
  createdAt: Timestamp | null;
  processedAt: Timestamp | null;
}

const ROLE_META: Record<Role, { label: string; color: string; bg: string; icon: string }> = {
  admin: { label: 'Admins', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', icon: '🛡️' },
  user: { label: 'Users / Pilgrims', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', icon: '🙏' },
  medical_admin: { label: 'Medical Admins', color: '#f472b6', bg: 'rgba(244,114,182,0.1)', icon: '🏥' },
  doctor: { label: 'Doctors', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', icon: '🩺' },
};

export default function Analytics() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [searchRequests, setSearchRequests] = useState<SearchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<Role | null>(null);
  const [showMissingPersons, setShowMissingPersons] = useState(false);

  // ── Fetch all users ───────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => d.data() as UserRecord));
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Fetch all doctors ─────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'doctors'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setDoctors(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DoctorRecord)));
    });
    return unsub;
  }, []);

  // ── Fetch all search requests (missing persons) ───────────────────────
  useEffect(() => {
    const q = query(collection(db, 'search_requests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setSearchRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SearchRequest)));
    });
    return unsub;
  }, []);

  // ── Group users by role ───────────────────────────────────────────────
  const grouped: Record<Role, UserRecord[]> = { admin: [], user: [], medical_admin: [], doctor: [] };
  users.forEach((u) => {
    if (grouped[u.role]) grouped[u.role].push(u);
  });

  const totalUsers = users.length;
  const totalDoctors = doctors.length;
  const onlineDoctors = doctors.filter((d) => d.available).length;

  // Missing persons stats
  const totalMissing = searchRequests.length;
  const foundPersons = searchRequests.filter((r) => r.status === 'completed').length;
  const pendingSearches = searchRequests.filter((r) => r.status === 'pending').length;
  const processingSearches = searchRequests.filter((r) => r.status === 'processing').length;
  const notFoundPersons = searchRequests.filter((r) => r.status === 'not_found').length;

  return (
    <div style={{ paddingTop: '5rem', minHeight: '100vh', background: '#050508' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
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
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
          }}>
            📊
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
              Platform Overview
            </p>
            <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
              Analytics
            </h1>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Real-time count and listing of all registered users across every role.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>Loading…</div>
        ) : (
          <>
            {/* ── Summary cards ────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
              {/* Total */}
              <div style={{
                padding: '1.25rem', borderRadius: '14px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>Total Registered</p>
                <p style={{ color: '#fff', fontSize: '2rem', fontWeight: 800, margin: 0 }}>{totalUsers}</p>
              </div>

              {/* Per role */}
              {(Object.keys(ROLE_META) as Role[]).map((r) => (
                <div key={r} style={{
                  padding: '1.25rem', borderRadius: '14px',
                  background: ROLE_META[r].bg, border: `1px solid ${ROLE_META[r].color}22`,
                }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>
                    {ROLE_META[r].icon} {ROLE_META[r].label}
                  </p>
                  <p style={{ color: ROLE_META[r].color, fontSize: '2rem', fontWeight: 800, margin: 0 }}>{grouped[r].length}</p>
                </div>
              ))}

              {/* Doctors from collection */}
              <div style={{
                padding: '1.25rem', borderRadius: '14px',
                background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>
                  🩺 Doctor Profiles
                </p>
                <p style={{ color: '#4ade80', fontSize: '2rem', fontWeight: 800, margin: 0 }}>
                  {totalDoctors}
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255,255,255,0.35)', marginLeft: '0.5rem' }}>
                    ({onlineDoctors} available)
                  </span>
                </p>
              </div>

              {/* Missing Persons Stats */}
              <div style={{
                padding: '1.25rem', borderRadius: '14px',
                background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>
                  🔍 Missing Persons Reports
                </p>
                <p style={{ color: '#fbbf24', fontSize: '2rem', fontWeight: 800, margin: 0 }}>
                  {totalMissing}
                </p>
              </div>

              <div style={{
                padding: '1.25rem', borderRadius: '14px',
                background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>
                  ✅ Persons Found
                </p>
                <p style={{ color: '#4ade80', fontSize: '2rem', fontWeight: 800, margin: 0 }}>
                  {foundPersons}
                </p>
              </div>

              <div style={{
                padding: '1.25rem', borderRadius: '14px',
                background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>
                  ❌ Not Found
                </p>
                <p style={{ color: '#f87171', fontSize: '2rem', fontWeight: 800, margin: 0 }}>
                  {notFoundPersons}
                </p>
              </div>

              <div style={{
                padding: '1.25rem', borderRadius: '14px',
                background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 0.4rem' }}>
                  ⏳ Pending / Processing
                </p>
                <p style={{ color: '#60a5fa', fontSize: '2rem', fontWeight: 800, margin: 0 }}>
                  {pendingSearches + processingSearches}
                </p>
              </div>
            </div>

            {/* ── Role-wise user lists ─────────────────────────────── */}
            <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Users by Role</h2>

            {(Object.keys(ROLE_META) as Role[]).map((r) => {
              const list = grouped[r];
              const isExpanded = expandedRole === r;
              return (
                <div key={r} style={{
                  marginBottom: '0.75rem', borderRadius: '12px', overflow: 'hidden',
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {/* Header row */}
                  <button
                    onClick={() => setExpandedRole(isExpanded ? null : r)}
                    style={{
                      width: '100%', padding: '1rem 1.25rem', border: 'none', cursor: 'pointer',
                      background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.75rem',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{ROLE_META[r].icon}</span>
                    <span style={{ color: ROLE_META[r].color, fontWeight: 700, fontSize: '0.85rem', flex: 1, textAlign: 'left' }}>
                      {ROLE_META[r].label}
                    </span>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                      background: ROLE_META[r].bg, color: ROLE_META[r].color,
                    }}>
                      {list.length}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                  </button>

                  {/* Expanded list */}
                  {isExpanded && (
                    <div style={{ padding: '0 1.25rem 1rem' }}>
                      {list.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>No users with this role.</p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={thStyle}>#</th>
                              <th style={thStyle}>Name</th>
                              <th style={thStyle}>Email</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((u, i) => (
                              <tr key={u.uid}>
                                <td style={tdStyle}>{i + 1}</td>
                                <td style={tdStyle}>{u.name || '—'}</td>
                                <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.35)' }}>{u.email}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Doctor profiles table ─────────────────────────────── */}
            <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: '2rem 0 1rem' }}>Registered Doctor Profiles</h2>
            <div style={{
              borderRadius: '12px', overflow: 'hidden',
              background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {doctors.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', padding: '1.5rem', textAlign: 'center' }}>No doctors registered yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>#</th>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Specialization</th>
                        <th style={thStyle}>Degree</th>
                        <th style={thStyle}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctors.map((d, i) => (
                        <tr key={d.id}>
                          <td style={tdStyle}>{i + 1}</td>
                          <td style={tdStyle}>{d.name}</td>
                          <td style={tdStyle}>{d.specialization}</td>
                          <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.35)' }}>{d.degree}</td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '2px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700,
                              background: d.available ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)',
                              color: d.available ? '#4ade80' : '#f87171',
                              border: `1px solid ${d.available ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            }}>
                              {d.available ? 'Available' : 'Unavailable'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Missing Persons Reports table ─────────────────────────────── */}
            <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: '2rem 0 1rem' }}>
              🔍 Missing Persons Reports
            </h2>
            <div style={{
              borderRadius: '12px', overflow: 'hidden',
              background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {/* Toggle button */}
              <button
                onClick={() => setShowMissingPersons(!showMissingPersons)}
                style={{
                  width: '100%', padding: '1rem 1.25rem', border: 'none', cursor: 'pointer',
                  background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>👤</span>
                <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem', flex: 1, textAlign: 'left' }}>
                  All Missing Person Reports
                </span>
                <span style={{
                  padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                  background: 'rgba(251,191,36,0.1)', color: '#fbbf24',
                }}>
                  {searchRequests.length}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', transition: 'transform 0.2s', transform: showMissingPersons ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
              </button>

              {showMissingPersons && (
                searchRequests.length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', padding: '1.5rem', textAlign: 'center' }}>
                    No missing person reports yet.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>#</th>
                          <th style={thStyle}>Person Name</th>
                          <th style={thStyle}>Reported By</th>
                          <th style={thStyle}>Description</th>
                          <th style={thStyle}>Reported On</th>
                          <th style={thStyle}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchRequests.map((req, i) => {
                          const statusColors: Record<string, { bg: string; text: string }> = {
                            pending: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' },
                            processing: { bg: 'rgba(96,165,250,0.12)', text: '#60a5fa' },
                            completed: { bg: 'rgba(74,222,128,0.12)', text: '#4ade80' },
                            not_found: { bg: 'rgba(248,113,113,0.12)', text: '#f87171' },
                          };
                          const statusLabels: Record<string, string> = {
                            pending: 'Pending',
                            processing: 'Processing',
                            completed: 'Found ✓',
                            not_found: 'Not Found',
                          };
                          return (
                            <tr key={req.id}>
                              <td style={tdStyle}>{i + 1}</td>
                              <td style={tdStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {req.targetImageBase64 && (
                                    <img
                                      src={req.targetImageBase64}
                                      alt={req.personName}
                                      style={{
                                        width: '32px', height: '32px', borderRadius: '6px',
                                        objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)',
                                      }}
                                    />
                                  )}
                                  <span style={{ fontWeight: 600 }}>{req.personName}</span>
                                </div>
                              </td>
                              <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.5)' }}>{req.userName}</td>
                              <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.35)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {req.personDescription || '—'}
                              </td>
                              <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.35)' }}>
                                {req.createdAt?.toDate().toLocaleDateString() || '—'}
                              </td>
                              <td style={tdStyle}>
                                <span style={{
                                  padding: '2px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700,
                                  background: statusColors[req.status]?.bg || 'rgba(255,255,255,0.1)',
                                  color: statusColors[req.status]?.text || '#fff',
                                  border: `1px solid ${statusColors[req.status]?.text || '#fff'}33`,
                                }}>
                                  {statusLabels[req.status] || req.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Table styles ──────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '0.6rem 0.75rem',
  color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem',
  fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.55rem 0.75rem', color: 'rgba(255,255,255,0.7)',
  fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.04)',
};
