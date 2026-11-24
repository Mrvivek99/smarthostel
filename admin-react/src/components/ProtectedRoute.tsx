import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from './States';
import RedirectToLogin from './RedirectToLogin';
import { portalUrl } from '../lib/loginUrl';
import type { Role } from '../types';

export default function ProtectedRoute({ roles = ['SUPER_ADMIN', 'ADMIN'] }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingState text="Checking session…" /></div>;
  if (!user) return <RedirectToLogin />;
  if (!roles.includes(user.role)) {
    // Students / wardens belong in their own portal; sending them to /admin/dashboard would loop.
    if (user.role === 'STUDENT' || user.role === 'WARDEN') { window.location.assign(portalUrl(user.role)); return null; }
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Outlet />;
}
