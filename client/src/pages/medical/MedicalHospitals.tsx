import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  specialties: string;
  totalBeds: number;
  availableBeds: number;
  emergency: boolean;
  createdAt: Timestamp | null;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
  color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem',
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem',
};

export default function MedicalHospitals() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [totalBeds, setTotalBeds] = useState('');
  const [availableBeds, setAvailableBeds] = useState('');
  const [emergency, setEmergency] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'hospitals'), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Hospital));
      docs.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      setHospitals(docs);
    }, (err) => console.error('MedicalHospitals:', err));
    return unsub;
  }, []);

  const addHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'hospitals'), {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        specialties: specialties.trim(),
        totalBeds: parseInt(totalBeds) || 0,
        availableBeds: parseInt(availableBeds) || 0,
        emergency,
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
      setName(''); setAddress(''); setPhone(''); setSpecialties('');
      setTotalBeds(''); setAvailableBeds(''); setEmergency(true);
    } finally {
      setSaving(false);
    }
  };

  const toggleEmergency = async (id: string, val: boolean) => {
    await updateDoc(doc(db, 'hospitals', id), { emergency: val });
  };

  const deleteHospital = async (id: string) => {
    if (!confirm('Remove this hospital?')) return;
    await deleteDoc(doc(db, 'hospitals', id));
  };

  const filtered = hospitals.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    (h.specialties || '').toLowerCase().includes(search.toLowerCase()),
  );

  const totalBedsCount = hospitals.reduce((s, h) => s + (h.totalBeds || 0), 0);
  const availableBedsCount = hospitals.reduce((s, h) => s + (h.availableBeds || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
          Medical Admin
        </p>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0 0' }}>
          Hospital Management
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>
          {hospitals.length} hospitals · {totalBedsCount} total beds · {availableBedsCount} available
        </p>
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(196,181,253,0.3), transparent)', marginBottom: '1.5rem' }} />

      {/* Search + Add */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <input
          type="text" placeholder="Search hospitals…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: showForm ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg, #a78bfa, #7c3aed)',
            color: showForm ? '#f87171' : '#fff',
            fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          {showForm ? '✕ Cancel' : '+ Add Hospital'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addHospital} style={{
          padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem',
          background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.15)',
        }}>
          <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem' }}>Register New Hospital</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Hospital Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Specialties (comma-separated)</label>
              <input type="text" value={specialties} onChange={e => setSpecialties(e.target.value)} style={inputStyle} placeholder="Cardiology, Orthopedics, Neurology…" />
            </div>
            <div>
              <label style={labelStyle}>Total Beds</label>
              <input type="number" value={totalBeds} onChange={e => setTotalBeds(e.target.value)} required min="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Available Beds</label>
              <input type="number" value={availableBeds} onChange={e => setAvailableBeds(e.target.value)} required min="0" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={emergency} onChange={e => setEmergency(e.target.checked)} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>Emergency services available</span>
            </label>
            <div style={{ flex: 1 }} />
            <button type="submit" disabled={saving} style={{
              padding: '10px 24px', borderRadius: '10px', border: 'none',
              background: saving ? 'rgba(167,139,250,0.3)' : 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              color: '#fff', fontSize: '0.85rem', fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Saving…' : 'Add Hospital'}
            </button>
          </div>
        </form>
      )}

      {/* Hospital list */}
      {filtered.length === 0 ? (
        <div style={{
          padding: '3rem 2rem', borderRadius: '14px', textAlign: 'center',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🏥</div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
            {search ? 'No hospitals match your search' : 'No hospitals registered yet'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
          {filtered.map(h => (
            <div key={h.id} style={{
              padding: '1.25rem', borderRadius: '14px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{h.name}</h3>
                {h.emergency && (
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700, color: '#ef4444',
                    background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '4px', padding: '2px 8px',
                  }}>
                    EMERGENCY
                  </span>
                )}
              </div>

              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', margin: '0 0 0.4rem' }}>📍 {h.address}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', margin: '0 0 0.4rem' }}>📞 {h.phone}</p>

              {h.specialties && (
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                  {h.specialties.split(',').map((s, i) => (
                    <span key={i} style={{
                      fontSize: '0.58rem', fontWeight: 600, color: '#60a5fa',
                      background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)',
                      borderRadius: '4px', padding: '2px 6px',
                    }}>
                      {s.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Beds */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{
                  flex: 1, padding: '0.5rem', borderRadius: '8px', textAlign: 'center',
                  background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
                }}>
                  <p style={{ color: '#3b82f6', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{h.totalBeds || 0}</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', margin: 0 }}>Total Beds</p>
                </div>
                <div style={{
                  flex: 1, padding: '0.5rem', borderRadius: '8px', textAlign: 'center',
                  background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                }}>
                  <p style={{ color: '#22c55e', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{h.availableBeds || 0}</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', margin: 0 }}>Available</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => toggleEmergency(h.id, !h.emergency)}
                  style={{
                    flex: 1, padding: '7px', borderRadius: '8px', border: 'none',
                    background: h.emergency ? 'rgba(107,114,128,0.12)' : 'rgba(239,68,68,0.12)',
                    color: h.emergency ? '#9ca3af' : '#f87171',
                    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {h.emergency ? 'Disable Emergency' : 'Enable Emergency'}
                </button>
                <button
                  onClick={() => deleteHospital(h.id)}
                  style={{
                    padding: '7px 14px', borderRadius: '8px', border: 'none',
                    background: 'rgba(239,68,68,0.12)', color: '#f87171',
                    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
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
