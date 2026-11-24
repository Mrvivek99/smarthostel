import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building, Users, UserCog, Hotel, Building2, Layers, DoorOpen, BedDouble, KeyRound, ClipboardCheck, Wallet, CreditCard, CalendarCheck, MessageSquareWarning, Plane, UserCheck, Package, Receipt, BarChart3, Crown, Settings, Megaphone, ChevronsLeft, ChevronsRight, X, Home } from 'lucide-react';
import type { Role } from '../types';

interface Item { to: string; label: string; icon: any; roles?: Role[] }
const groups: { title: string; items: Item[] }[] = [
  { title: 'Overview', items: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { title: 'Platform', items: [
    { to: '/admin/organizations', label: 'Organizations', icon: Building, roles: ['SUPER_ADMIN'] },
    { to: '/admin/subscriptions', label: 'Subscriptions', icon: Crown },
  ] },
  { title: 'People', items: [
    { to: '/admin/students', label: 'Students', icon: Users, roles: ['ADMIN'] },
    { to: '/admin/wardens', label: 'Wardens', icon: UserCog, roles: ['ADMIN'] },
    { to: '/admin/admissions', label: 'Admissions', icon: ClipboardCheck, roles: ['ADMIN'] },
  ] },
  { title: 'Property', items: [
    { to: '/admin/hostels', label: 'Hostels', icon: Hotel, roles: ['ADMIN'] },
    { to: '/admin/buildings', label: 'Buildings', icon: Building2, roles: ['ADMIN'] },
    { to: '/admin/floors', label: 'Floors', icon: Layers, roles: ['ADMIN'] },
    { to: '/admin/rooms', label: 'Rooms', icon: DoorOpen, roles: ['ADMIN'] },
    { to: '/admin/beds', label: 'Beds', icon: BedDouble, roles: ['ADMIN'] },
    { to: '/admin/allocations', label: 'Allocations', icon: KeyRound, roles: ['ADMIN'] },
  ] },
  { title: 'Finance', items: [
    { to: '/admin/fees', label: 'Fees', icon: Wallet, roles: ['ADMIN'] },
    { to: '/admin/payments', label: 'Payments', icon: CreditCard, roles: ['ADMIN'] },
    { to: '/admin/expenses', label: 'Expenses', icon: Receipt, roles: ['ADMIN'] },
  ] },
  { title: 'Operations', items: [
    { to: '/admin/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['ADMIN'] },
    { to: '/admin/complaints', label: 'Complaints', icon: MessageSquareWarning, roles: ['ADMIN'] },
    { to: '/admin/leave', label: 'Leave', icon: Plane, roles: ['ADMIN'] },
    { to: '/admin/visitors', label: 'Visitors', icon: UserCheck, roles: ['ADMIN'] },
    { to: '/admin/inventory', label: 'Inventory', icon: Package, roles: ['ADMIN'] },
    { to: '/admin/notices', label: 'Notices', icon: Megaphone, roles: ['ADMIN'] },
  ] },
  { title: 'Insights', items: [
    { to: '/admin/reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN'] },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ] },
];

interface Props { role?: Role; collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onClose: () => void }

export default function Sidebar({ role, collapsed, onToggle, mobileOpen, onClose }: Props) {
  const body = (compact: boolean, mobile: boolean) => (
    <div className="flex h-full flex-col bg-navy-900 text-navy-100">
      <div className={`flex items-center h-16 px-4 border-b border-white/10 ${compact ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0"><Home className="h-5 w-5" /></div>
          {!compact && <span className="text-lg font-bold text-white tracking-tight">Smart<span className="text-brand-300">Hostel</span></span>}
        </div>
        {mobile && <button onClick={onClose} className="p-1.5 text-navy-200 hover:text-white" aria-label="Close menu"><X className="h-5 w-5" /></button>}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Main">
        {groups.map((g) => {
          const items = g.items.filter((i) => !i.roles || (role && i.roles.includes(role)));
          if (!items.length) return null;
          return (
            <div key={g.title}>
              {!compact && <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-400">{g.title}</p>}
              <ul className="space-y-0.5">
                {items.map((i) => (
                  <li key={i.to}>
                    <NavLink to={i.to} onClick={onClose} title={compact ? i.label : undefined}
                      className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${compact ? 'justify-center' : ''} ${isActive ? 'bg-brand-600 text-white shadow-md shadow-brand-900/30' : 'text-navy-200 hover:bg-white/10 hover:text-white'}`}>
                      <i.icon className="h-[18px] w-[18px] shrink-0" />
                      {!compact && <span className="truncate">{i.label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
      {!mobile && (
        <button onClick={onToggle} className="m-3 flex items-center justify-center gap-2 rounded-xl py-2 text-xs text-navy-300 hover:bg-white/10 hover:text-white" aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}>
          {compact ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
        </button>
      )}
    </div>
  );

  return (
    <>
      <aside className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-[width] duration-200 ${collapsed ? 'w-[72px]' : 'w-64'}`}>{body(collapsed, false)}</aside>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-navy-950/60" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">{body(false, true)}</aside>
        </div>
      )}
    </>
  );
}
