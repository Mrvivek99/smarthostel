'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Bed, Bell, CalendarCheck, DoorOpen, FileText, LayoutDashboard, Plane, Receipt, Settings, User, Users, Wallet, X, Building2, type LucideIcon } from 'lucide-react';
import type { IconName, NavItem } from '@/lib/nav';

const ICONS: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard, user: User, file: FileText, bed: Bed, wallet: Wallet, receipt: Receipt, calendar: CalendarCheck,
  alert: AlertTriangle, plane: Plane, bell: Bell, settings: Settings, users: Users, door: DoorOpen,
};

export function Sidebar({ items, portal, open, onClose }: { items: NavItem[]; portal: string; open: boolean; onClose: () => void }) {
  const path = usePathname();
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-navy-950/50 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-navy-900 text-navy-100 transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white"><Building2 className="h-5 w-5" /></span>
            <span className="leading-tight">
              <span className="block text-base font-bold text-white">SmartHostel</span>
              <span className="block text-[11px] uppercase tracking-wider text-brand-300">{portal}</span>
            </span>
          </Link>
          <button className="rounded-lg p-1.5 text-navy-300 hover:bg-navy-800 lg:hidden" aria-label="Close menu" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-6">
          {items.map((it) => {
            const Icon = ICONS[it.icon];
            const active = path === it.href || path.startsWith(it.href + '/');
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  active ? 'bg-brand-600 text-white shadow-sm' : 'text-navy-200 hover:bg-navy-800 hover:text-white'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
