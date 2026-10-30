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
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups for this site and try again.',
  'auth/cancelled-popup-request': 'Another sign-in popup is already open.',
  'auth/account-exists-with-different-credential': 'An account with this email already exists. Sign in with your password instead.',
};

/** True when the user simply closed the Google popup; not worth showing an error for. */
export function isPopupDismissed(err: unknown): boolean {
  return err instanceof FirebaseError && (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/user-cancelled');
}

/** Turn a Firebase auth error into a message a user can act on. */
export function authErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof FirebaseError) {
    if (err.code === 'auth/operation-not-allowed') {
      return 'This sign-in method is not enabled in the Firebase console (Authentication → Sign-in method).';
    }
    return MESSAGES[err.code] ?? `${fallback} (${err.code})`;
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
