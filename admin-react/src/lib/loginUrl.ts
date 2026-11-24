/**
 * There is ONE login page for every role: the Next.js app's /login.
 * This SPA never renders its own login form; it only sends people there.
 * Override with VITE_LOGIN_URL, otherwise it is derived from VITE_API_URL.
 */
const api = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const LOGIN_URL: string =
  (import.meta.env.VITE_LOGIN_URL as string | undefined)?.replace(/\/$/, '') || `${api || 'http://localhost:3000'}/login`;

/** Where a non-admin role belongs (the Next.js student / warden portals). */
export function portalUrl(role: string): string {
  const base = LOGIN_URL.replace(/\/login$/, '');
  return `${base}/${role === 'WARDEN' ? 'warden' : 'student'}/dashboard`;
}

export function goToLogin(expired = false): void {
  window.location.assign(expired ? `${LOGIN_URL}?expired=1` : LOGIN_URL);
}
