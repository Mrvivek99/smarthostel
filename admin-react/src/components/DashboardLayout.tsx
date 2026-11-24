import { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from './States';
import { getSidebarCollapsed, setSidebarCollapsed } from '../lib/prefs';

export default function DashboardLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(getSidebarCollapsed());
  const [mobile, setMobile] = useState(false);
  const loc = useLocation();
  return (
    <div className="min-h-full">
      <Sidebar role={user?.role} collapsed={collapsed} onToggle={() => { setCollapsed((c) => { setSidebarCollapsed(!c); return !c; }); }} mobileOpen={mobile} onClose={() => setMobile(false)} />
      <div className={`transition-[padding] duration-200 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
        <Navbar onMenu={() => setMobile(true)} />
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1500px] mx-auto">
          <Suspense key={loc.pathname} fallback={<LoadingState />}><Outlet /></Suspense>
        </main>
      </div>
    </div>
  );
}
