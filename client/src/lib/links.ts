/** Base URL of the Next.js landing site (the "Home" / "About" pages). */
export const LANDING_URL = (import.meta.env.VITE_LANDING_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:3000';
export const LANDING_HOME = `${LANDING_URL}/`;
export const LANDING_ABOUT = `${LANDING_URL}/#about`;
