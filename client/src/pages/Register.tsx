import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type Role } from '../context/AuthContext';
import { authErrorMessage } from '@/lib/authErrors';
import {
  AuthDivider,
  AuthError,
  AuthHeader,
  AuthInput,
  AuthLinks,
  AuthPasswordInput,
  AuthShell,
  AuthSubmit,
  Bright,
  ChoiceTiles,
  GoogleButton,
  type ChoiceOption,
} from '@/components/auth/AuthShell';

const ROLES: ChoiceOption<Role>[] = [
  { value: 'user', code: '01', label: 'Pilgrim', desc: 'Live maps, doctor help, emergency calls and lost & found reporting.' },
  { value: 'admin', code: '02', label: 'Admin', desc: 'Surveillance, weapon & crowd detection, analytics and security ops.' },
  { value: 'medical_admin', code: '03', label: 'Medical', desc: 'Manage doctors, hospitals and the consultation queue.' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError('');
    setLoading(true);
    try {
      await register(email, password, name, role);
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('Registration failed:', err);
      setError(authErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell topLink={{ prompt: 'Already registered?', to: '/login', label: 'Sign in' }}>
      <AuthHeader
        eyebrow="Register"
        title={
          <>
            Create your <Bright>account</Bright>
          </>
        }
        subtitle="Choose a role and you'll be set up in under a minute."
      />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
        <ChoiceTiles label="Joining as" options={ROLES} value={role} onChange={setRole} />

        <AuthInput
          id="name"
          label="Full name"
          type="text"
          autoComplete="name"
          placeholder="Aarav Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <AuthInput
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
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

        <AuthError message={error} />

        <div className="flex flex-col gap-3 pt-1">
          <AuthSubmit loading={loading} loadingText="Creating account">
            Create account
          </AuthSubmit>
          <AuthDivider>or</AuthDivider>
          <GoogleButton>Continue with Google</GoogleButton>
        </div>

        <AuthLinks prompt="Medical staff?" links={[{ to: '/doctor-signup', label: 'Join as a doctor' }]} />
      </form>
    </AuthShell>
  );
}
