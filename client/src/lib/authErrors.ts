import { FirebaseError } from 'firebase/app';

const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled for this project.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/unauthorized-domain': 'This domain is not authorized in the Firebase console.',
  'auth/invalid-api-key': 'Firebase API key is invalid. Check client/.env.',
};

/** Turn a Firebase auth error into a message a user can act on. */
export function authErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof FirebaseError) {
    return MESSAGES[err.code] ?? `${fallback} (${err.code})`;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
