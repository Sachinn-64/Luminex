import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  AuthError,
  AuthHeader,
  AuthInput,
  AuthLinks,
  AuthPasswordInput,
  AuthSection,
  AuthSelect,
  AuthShell,
  AuthSubmit,
  Bright,
  Mono,
} from '@/components/auth/AuthShell';

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
] as const;

export default function DoctorSignup() {
  const navigate = useNavigate();

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Doctor profile fields
  const [name, setName] = useState('');
  const [degree, setDegree] = useState('');
  const [specialization, setSpecialization] = useState<string>(SPECIALIZATIONS[0]);
  const [phone, setPhone] = useState('');
  const [experience, setExperience] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!name.trim()) { setError('Full name is required'); return; }
    if (!degree.trim()) { setError('Degree / qualification is required'); return; }

    setError('');
    setLoading(true);
    try {
      // 1. Create Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // 2. Save user profile with role = 'doctor'
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email,
        name: name.trim(),
        role: 'doctor',
      });

      // 3. Save doctor details to doctors collection (use uid as doc ID)
      await setDoc(doc(db, 'doctors', cred.user.uid), {
        name: name.trim(),
        degree: degree.trim(),
        specialization,
        phone: phone.trim(),
        experience: parseInt(experience) || 0,
        registeredBy: cred.user.uid,
        registeredByName: name.trim(),
        available: true,
        uid: cred.user.uid,
        createdAt: serverTimestamp(),
      });

      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell topLink={{ prompt: 'Already registered?', to: '/login', label: 'Sign in' }}>
      <AuthHeader
        eyebrow="Doctor registration"
        title={
          <>
            Join as a <Bright>doctor</Bright>
          </>
        }
        subtitle="Create your account and medical profile in one step."
      />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
        <AuthSection step="01" title="Account" />

        <AuthInput
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="doctor@hospital.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <AuthPasswordInput
          id="password"
          label="Password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          showStrength
        />

        <AuthSection step="02" title="Medical profile" />

        <AuthInput
          id="name"
          label="Full name"
          type="text"
          autoComplete="name"
          placeholder="Dr. Priya Mehta"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid gap-7 sm:grid-cols-2 sm:gap-6">
          <AuthInput
            id="degree"
            label="Qualification"
            type="text"
            placeholder="MBBS, MD…"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
            required
          />
          <AuthSelect
            id="specialization"
            label="Specialization"
            options={SPECIALIZATIONS}
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
          />
        </div>

        <div className="grid gap-7 sm:grid-cols-2 sm:gap-6">
          <AuthInput
            id="phone"
            label="Phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <AuthInput
            id="experience"
            label="Experience"
            hint={<Mono>years</Mono>}
            type="number"
            min={0}
            max={60}
            placeholder="5"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          />
        </div>

        <AuthError message={error} />

        <div className="pt-1">
          <AuthSubmit loading={loading} loadingText="Creating profile">
            Create doctor account
          </AuthSubmit>
        </div>

        <AuthLinks prompt="Not a doctor?" links={[{ to: '/register', label: 'Register as pilgrim or admin' }]} />
      </form>
    </AuthShell>
  );
}
