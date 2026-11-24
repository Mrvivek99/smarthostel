import { useEffect } from 'react';
import { goToLogin } from '../lib/loginUrl';
import { LoadingState } from './States';

export default function RedirectToLogin() {
  useEffect(() => { goToLogin(); }, []);
  return <div className="min-h-screen flex items-center justify-center"><LoadingState text="Redirecting to sign in…" /></div>;
}
