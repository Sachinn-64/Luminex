import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

const SPECIALIZATIONS = [
  'General Physician',
  'Orthopedic',
  'Dermatology',
  'Pediatrics',
  'ENT',
  'Cardiology',
  'Neurology',
  'Ophthalmology',
  'Dentistry',
  'Ayurveda',
  'Homeopathy',
  'Emergency Medicine',
  'Other',
];

export default function DoctorRegistration() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [name, setName] = useState('');
  const [degree, setDegree] = useState('');
  const [specialization, setSpecialization] = useState(SPECIALIZATIONS[0]);
  const [phone, setPhone] = useState('');
  const [experience, setExperience] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await addDoc(collection(db, 'doctors'), {
        name: name.trim(),
        degree: degree.trim(),
        specialization,
        phone: phone.trim(),
        experience: parseInt(experience) || 0,
        registeredBy: profile?.uid || 'anonymous',
        registeredByName: profile?.name || 'Unknown',
        available: true,
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register doctor');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
    color: '#fff', fontSize: '0.9rem', outline: 'none',
    transition: 'border-color 0.2s', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem',
    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem',
  };

  if (success) {
    return (
      <div style={{ paddingTop: '5rem', minHeight: '100vh', background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          maxWidth: '460px', width: '100%', padding: '3rem',
          background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: '20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            Doctor Registered Successfully!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            {name} has been added to the system and is now available for appointments.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => { setSuccess(false); setName(''); setDegree(''); setPhone(''); setExperience(''); }}
              style={{
                padding: '10px 20px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Register Another
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '10px 20px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
                color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            width: '42px', height: '42px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
          }}>
            🩺
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>
              Medical Module
            </p>
            <h1 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
              Register as Doctor
            </h1>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: '2rem' }}>
          Fill in the details to register a doctor for the Luminex health assistance network.
        </p>

        <form onSubmit={handleSubmit} style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '2rem',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Doctor's Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(34,197,94,0.5)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                placeholder="Dr. John Doe" />
            </div>

            <div>
              <label style={labelStyle}>Degree / Qualification</label>
              <input type="text" value={degree} onChange={(e) => setDegree(e.target.value)} required style={inputStyle}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(34,197,94,0.5)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                placeholder="MBBS, MD, BDS…" />
            </div>

            <div>
              <label style={labelStyle}>Specialization</label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              >
                {SPECIALIZATIONS.map((s) => (
                  <option key={s} value={s} style={{ background: '#1a1a2e', color: '#fff' }}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(34,197,94,0.5)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                placeholder="+91 9876543210" />
            </div>

            <div>
              <label style={labelStyle}>Years of Experience</label>
              <input type="number" min="0" max="60" value={experience} onChange={(e) => setExperience(e.target.value)} style={inputStyle}
                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(34,197,94,0.5)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                placeholder="5" />
            </div>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: '10px', marginTop: '1.25rem',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
            }}>
              <p style={{ color: '#ef4444', margin: 0, fontSize: '0.8rem' }}>⚠️ {error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none', marginTop: '1.5rem',
              background: loading ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff', fontWeight: 700, fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.3s',
            }}
          >
            {loading ? 'Registering…' : '🩺  Register Doctor'}
          </button>
        </form>
      </div>
    </div>
  );
}
