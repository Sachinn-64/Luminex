import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import GradientBlinds from '@/components/GradientBlinds';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

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

export default function DoctorSignup() {
  const navigate = useNavigate();

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Doctor profile fields
  const [name, setName] = useState('');
  const [degree, setDegree] = useState('');
  const [specialization, setSpecialization] = useState(SPECIALIZATIONS[0]);
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
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg mb-1">
                    🩺
                  </div>
                  <h1 className="text-2xl font-bold">Sign Up as Doctor</h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    Create your account &amp; medical profile in one step
                  </p>
                </div>

                {/* Account Details */}
                <FieldSeparator>Account Details</FieldSeparator>

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="doctor@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-background"
                  />
                  <FieldDescription>Must be at least 6 characters long.</FieldDescription>
                </Field>

                {/* Medical Profile */}
                <FieldSeparator>Medical Profile</FieldSeparator>

                <Field>
                  <FieldLabel htmlFor="name">Full Name</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Dr. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-background"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="degree">Degree / Qualification</FieldLabel>
                    <Input
                      id="degree"
                      type="text"
                      placeholder="MBBS, MD, BDS…"
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="specialization">Specialization</FieldLabel>
                    <select
                      id="specialization"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {SPECIALIZATIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="experience">Years of Experience</FieldLabel>
                    <Input
                      id="experience"
                      type="number"
                      min={0}
                      max={60}
                      placeholder="5"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="bg-background"
                    />
                  </Field>
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                    <p className="m-0 text-sm text-destructive">⚠️ {error}</p>
                  </div>
                )}

                <Field>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating account…' : '🩺 Sign Up as Doctor'}
                  </Button>
                </Field>
                <FieldSeparator>Or</FieldSeparator>
                <Field>
                  <FieldDescription className="text-center">
                    Not a doctor?{' '}
                    <Link to="/register" className="underline underline-offset-4">
                      Register as User / Admin
                    </Link>
                  </FieldDescription>
                  <FieldDescription className="text-center">
                    Already have an account?{' '}
                    <Link to="/login" className="underline underline-offset-4">
                      Sign In
                    </Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-black lg:flex overflow-hidden">
        <div className="absolute inset-0">
          <GradientBlinds />
        </div>
      </div>
    </div>
  );
}
