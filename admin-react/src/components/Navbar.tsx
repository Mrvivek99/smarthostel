import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Settings, ChevronDown } from 'lucide-react';
import NotificationPanel from './NotificationPanel';
import { useAuth } from '../context/AuthContext';
import { titleCase } from '../lib/format';
import { goToLogin } from '../lib/loginUrl';

export default function Navbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const initials = (user?.name || user?.email || '?').split(/[\s@]/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');
  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur border-b border-slate-100 flex items-center justify-between px-4 lg:px-8">
      <button className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100" onClick={onMenu} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      <div className="hidden lg:block text-sm text-slate-500">Welcome back, <span className="font-semibold text-navy-900">{user?.name ?? user?.email}</span></div>
      <div className="flex items-center gap-2">
        <NotificationPanel />
        <div className="relative" ref={ref}>
          <button className="flex items-center gap-2 rounded-xl pl-1 pr-2 py-1 hover:bg-slate-100" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <span className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-500 to-navy-700 text-white text-xs font-semibold flex items-center justify-center">{initials}</span>
            <span className="hidden sm:block text-left leading-tight"><span className="block text-sm font-medium text-slate-800 max-w-[140px] truncate">{user?.name ?? user?.email}</span><span className="block text-[11px] text-slate-400">{titleCase(user?.role ?? '')}</span></span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-48 card shadow-xl p-1.5 z-50">
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50" onClick={() => { setOpen(false); nav('/admin/settings'); }}><Settings className="h-4 w-4" />Settings</button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50" onClick={async () => { await logout(); goToLogin(); }}><LogOut className="h-4 w-4" />Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
