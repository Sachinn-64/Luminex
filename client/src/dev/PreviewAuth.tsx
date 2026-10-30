import { useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext, type AuthContextType, type Role } from '@/context/AuthContext';

const ROLES: Role[] = ['admin', 'user', 'medical_admin', 'doctor'];

/**
 * DEV ONLY. Wraps children in a fake AuthContext so protected pages can be
 * previewed without signing in: /__preview/dashboard?role=admin
 * Vite tree-shakes the route out of production builds (guarded by import.meta.env.DEV).
 */
export default function PreviewAuth({ children }: { children: ReactNode }) {
  const [params] = useSearchParams();
  const roleParam = params.get('role');
  const role: Role = ROLES.includes(roleParam as Role) ? (roleParam as Role) : 'user';

  const value = useMemo<AuthContextType>(
    () => ({
      user: null,
      profile: { uid: 'preview', email: 'preview@example.com', name: 'Preview User', role },
      loading: false,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
    }),
    [role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
