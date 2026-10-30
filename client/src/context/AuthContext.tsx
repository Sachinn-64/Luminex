import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  type User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type Role = 'admin' | 'user' | 'medical_admin' | 'doctor';

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: Role) => Promise<void>;
  /** Google OAuth popup. New accounts get `roleForNewUsers` (default: pilgrim). */
  loginWithGoogle: (roleForNewUsers?: Role) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
export { AuthContext };
export type { AuthContextType, UserProfile };

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

const PENDING_ROLE_KEY = 'luminex.pendingGoogleRole';

/**
 * Firestore keeps retrying silently when the project has no database or the
 * backend is unreachable, which looks like "nothing happens" in the UI.
 * Give every profile read/write a deadline and raise a clear error instead.
 */
const FIRESTORE_TIMEOUT_MS = 8000;
export class ProfileStoreError extends Error {
  constructor() {
    super(
      'Could not reach the user database. Make sure a Firestore database is created for this Firebase project (Firebase console → Build → Firestore Database → Create database).',
    );
    this.name = 'ProfileStoreError';
  }
}
function withDeadline<T>(p: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new ProfileStoreError()), FIRESTORE_TIMEOUT_MS);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/** Load the Firestore profile for a signed-in user, creating one if this is their first login. */
async function ensureProfile(u: User, roleForNewUsers: Role): Promise<UserProfile> {
  const ref = doc(db, 'users', u.uid);
  const snap = await withDeadline(getDoc(ref));
  if (snap.exists()) return snap.data() as UserProfile;
  const p: UserProfile = {
    uid: u.uid,
    email: u.email ?? '',
    name: u.displayName ?? u.email?.split('@')[0] ?? 'User',
    role: roleForNewUsers,
  };
  await withDeadline(setDoc(ref, p));
  return p;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Completes a Google sign-in that fell back to the redirect flow (popup blocked).
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (res) => {
        if (!res?.user) return;
        const stored = sessionStorage.getItem(PENDING_ROLE_KEY) as Role | null;
        sessionStorage.removeItem(PENDING_ROLE_KEY);
        setProfile(await ensureProfile(res.user, stored ?? 'user'));
      })
      .catch((err) => console.error('Google redirect sign-in failed:', err));
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await withDeadline(getDoc(doc(db, 'users', u.uid)));
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
        } catch (err) {
          console.error('Could not load user profile:', err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await withDeadline(getDoc(doc(db, 'users', cred.user.uid)));
    if (snap.exists()) setProfile(snap.data() as UserProfile);
  };

  const register = async (email: string, password: string, name: string, role: Role) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const p: UserProfile = { uid: cred.user.uid, email, name, role };
    await withDeadline(setDoc(doc(db, 'users', cred.user.uid), p));
    setProfile(p);
  };

  const loginWithGoogle = async (roleForNewUsers: Role = 'user') => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const cred = await signInWithPopup(auth, provider);
      setProfile(await ensureProfile(cred.user, roleForNewUsers));
    } catch (err) {
      // Popup blockers: fall back to a full-page redirect and finish in getRedirectResult above.
      if (err instanceof FirebaseError && err.code === 'auth/popup-blocked') {
        sessionStorage.setItem(PENDING_ROLE_KEY, roleForNewUsers);
        await signInWithRedirect(auth, provider);
        return;
      }
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
