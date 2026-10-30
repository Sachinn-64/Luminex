import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, type Role } from '../context/AuthContext';
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
import { authErrorMessage } from '@/lib/authErrors';

const ROLES: { value: Role; label: string; icon: string; desc: string }[] = [
  { value: 'user', label: 'Pilgrim / User', icon: '🙏', desc: 'Access maps, doctor help & lost persons' },
  { value: 'admin', label: 'Admin', icon: '🛡️', desc: 'Surveillance, weapons, crowd & security' },
  { value: 'medical_admin', label: 'Medical Admin', icon: '🏥', desc: 'Manage doctors & appointment queues' },
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
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                  <h1 className="text-2xl font-bold">Create your account</h1>
                  <p className="text-sm text-balance text-muted-foreground">
                    Fill in the form below to create your account
                  </p>
                </div>

                {/* Role selector */}
                <Field>
                  <FieldLabel>Select Role</FieldLabel>
                  <div className="flex gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 text-center transition-all ${
                          role === r.value
                            ? 'border-primary/50 bg-primary text-primary-foreground'
                            : 'border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/60'
                        }`}
                      >
                        <span className="text-lg">{r.icon}</span>
                        <span className="text-[0.68rem] font-bold leading-tight">{r.label}</span>
                      </button>
                    ))}
                  </div>
                  <FieldDescription className="text-center">
                    {ROLES.find((r) => r.value === role)?.desc}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="name">Full Name</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-background"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background"
                  />
                  <FieldDescription>
                    We&apos;ll use this to contact you. We will not share your email with anyone else.
                  </FieldDescription>
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

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                    <p className="m-0 text-sm text-destructive">⚠️ {error}</p>
                  </div>
                )}

                <Field>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating account…' : 'Create Account'}
                  </Button>
                </Field>
                <FieldSeparator>Or continue with</FieldSeparator>
                <Field>
                  <Button variant="outline" type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-5">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Sign up with Google
                  </Button>
                  <FieldDescription className="text-center">
                    Already have an account?{' '}
                    <Link to="/login" className="underline underline-offset-4">
                      Sign in
                    </Link>
                  </FieldDescription>
                  <FieldDescription className="text-center">
                    <Link to="/doctor-signup" className="underline underline-offset-4">
                      Sign up as Doctor 🩺
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
