import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  GoogleButton,
} from '@/components/auth/AuthShell';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('Login failed:', err);
      setError(authErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell topLink={{ prompt: 'New to Luminex?', to: '/register', label: 'Create account' }}>
      <AuthHeader
        eyebrow="Sign in"
        title={
          <>
            Welcome <Bright>back</Bright>
          </>
        }
        subtitle="Enter your credentials to continue to your dashboard."
      />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
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
          hint={
            <a
              href="#"
              className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white"
            >
              Forgot?
            </a>
          }
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <AuthError message={error} />

        <div className="flex flex-col gap-3 pt-1">
          <AuthSubmit loading={loading} loadingText="Signing in">
            Sign in
          </AuthSubmit>
          <AuthDivider>or</AuthDivider>
          <GoogleButton>Continue with Google</GoogleButton>
        </div>

        <AuthLinks
          prompt="No account?"
          links={[
            { to: '/register', label: 'Create account' },
            { to: '/doctor-signup', label: 'Join as a doctor' },
          ]}
        />
      </form>
    </AuthShell>
  );
}
