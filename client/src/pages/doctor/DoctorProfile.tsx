import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, type Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

interface DoctorDoc {
  name: string;
  degree: string;
  specialization: string;
  phone: string;
  experience: number;
  available: boolean;
  createdAt: Timestamp | null;
}

export default function DoctorProfile() {
  const { profile } = useAuth();
  const [doctorData, setDoctorData] = useState<DoctorDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;
    const fetch = async () => {
      const snap = await getDoc(doc(db, 'doctors', profile.uid));
      if (snap.exists()) setDoctorData(snap.data() as DoctorDoc);
      setLoading(false);
    };
    fetch();
  }, [profile?.uid]);

  const toggleAvailability = async () => {
    if (!profile?.uid || !doctorData) return;
    setToggling(true);
    const newVal = !doctorData.available;
    await updateDoc(doc(db, 'doctors', profile.uid), { available: newVal });
    setDoctorData(prev => prev ? { ...prev, available: newVal } : null);
    setToggling(false);
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>Loading profile…</p>
      </div>
    );
  }

  if (!doctorData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem', marginBottom: '0.5rem' }}>No doctor profile found</p>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>Your account may not have a linked doctor profile yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
          Doctor Panel
        </p>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0 0' }}>
          My Profile
        </h1>
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(196,181,253,0.3), transparent)', marginBottom: '2rem' }} />

      <div style={{ maxWidth: 600 }}>
        {/* Availability toggle */}
        <div style={{
          padding: '1.25rem', borderRadius: '14px', marginBottom: '1.5rem',
          background: doctorData.available ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          border: `1px solid ${doctorData.available ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
              Availability Status
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>
              {doctorData.available ? 'You are currently accepting patients' : 'You are marked as unavailable'}
            </p>
          </div>
          <button
            onClick={toggleAvailability}
            disabled={toggling}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: 'none',
              background: doctorData.available
                ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: doctorData.available ? '#f87171' : '#fff',
              fontSize: '0.78rem', fontWeight: 700, cursor: toggling ? 'not-allowed' : 'pointer',
            }}
          >
            {toggling ? 'Updating…' : doctorData.available ? 'Go Unavailable' : 'Go Available'}
          </button>
        </div>

        {/* Profile fields */}
        <div style={{
          padding: '1.5rem', borderRadius: '16px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input type="text" value={doctorData.name} readOnly style={{ ...inputStyle, opacity: 0.6 }} />
            </div>
            <div>
              <label style={labelStyle}>Degree</label>
              <input type="text" value={doctorData.degree} readOnly style={{ ...inputStyle, opacity: 0.6 }} />
            </div>
            <div>
              <label style={labelStyle}>Specialization</label>
              <input type="text" value={doctorData.specialization} readOnly style={{ ...inputStyle, opacity: 0.6 }} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input type="text" value={doctorData.phone} readOnly style={{ ...inputStyle, opacity: 0.6 }} />
            </div>
            <div>
              <label style={labelStyle}>Experience</label>
              <input type="text" value={`${doctorData.experience} years`} readOnly style={{ ...inputStyle, opacity: 0.6 }} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="text" value={profile?.email || ''} readOnly style={{ ...inputStyle, opacity: 0.6 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
