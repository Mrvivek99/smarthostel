'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Menu } from 'lucide-react';
import { api } from '@/lib/client';
import { useToast } from '@/components/ui/Toast';
import { NotificationPanel } from '@/components/layout/NotificationPanel';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

export function Navbar({ user, role, onMenu }: { user: { name: string; email: string }; role: string; onMenu: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  async function logout() {
    setBusy(true);
    try {
      await api.post('/api/auth/logout');
      router.replace('/login');
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-navy-100 bg-white/85 px-4 backdrop-blur sm:px-6">
      <button className="btn-ghost -ml-2 px-2 lg:hidden" aria-label="Open menu" onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1" />
      <NotificationPanel />
      <div className="flex items-center gap-3 pl-1">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold leading-tight">{user.name}</p>
          <p className="text-xs capitalize text-navy-400">{role.toLowerCase()}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-navy-700 text-xs font-bold text-white" aria-hidden>{initials}</div>
        <button className="btn-ghost px-2" aria-label="Log out" title="Log out" onClick={() => setConfirm(true)}>
          <LogOut className="h-5 w-5" />
        </button>
      </div>
      <ConfirmationDialog open={confirm} title="Log out?" message="You will need to sign in again to access your portal." confirmLabel="Log out" loading={busy} onConfirm={logout} onCancel={() => setConfirm(false)} />
    </header>
  );
}
