import { ReactNode } from 'react';
import { Building2, BedDouble, DoorOpen, MapPin, Phone, Receipt, User as UserIcon, Wrench, Calendar } from 'lucide-react';
import type { Row } from '../types';
import { StatusBadge } from './States';
import { fmtDate, inr, label, nm, titleCase } from '../lib/format';

const Shell = ({ children, actions }: { children: ReactNode; actions?: ReactNode }) => (
  <div className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow h-full">
    <div className="flex-1 flex flex-col gap-3">{children}</div>
    {actions && <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">{actions}</div>}
  </div>
);

export function StudentCard({ s, actions }: { s: Row; actions?: ReactNode }) {
  const initials = (nm(s) || '?').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  return (
    <Shell actions={actions}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold shrink-0">{initials}</div>
          <div className="min-w-0"><h3 className="font-semibold text-navy-900 truncate">{nm(s)}</h3><p className="text-xs text-slate-500 truncate">{s.email}</p></div>
        </div>
        <StatusBadge value={s.status} />
      </div>
      <dl className="text-xs text-slate-500 space-y-1">
        {s.enrollmentNo && <div className="flex justify-between gap-2"><dt>Enrollment</dt><dd className="text-slate-700">{s.enrollmentNo}</dd></div>}
        {s.course && <div className="flex justify-between gap-2"><dt>Course</dt><dd className="text-slate-700 truncate">{s.course}{s.year ? ` · Year ${s.year}` : ''}</dd></div>}
        {s.phone && <div className="flex justify-between gap-2"><dt>Phone</dt><dd className="text-slate-700">{s.phone}</dd></div>}
        <div className="flex justify-between gap-2"><dt>Placement</dt><dd className="text-slate-700 truncate">{s.room ? `${label(s.hostel)} · Room ${s.room?.roomNumber ?? label(s.room)}` : 'Not allocated'}</dd></div>
      </dl>
    </Shell>
  );
}

export function HostelCard({ h, actions }: { h: Row; actions?: ReactNode }) {
  const beds = h.totalBeds ?? h.capacity;
  const occ = h.occupiedBeds ?? h.occupied;
  const pct = beds ? Math.min(100, Math.round(((occ ?? 0) / beds) * 100)) : null;
  return (
    <Shell actions={actions}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-2xl bg-navy-800 text-white flex items-center justify-center shrink-0"><Building2 className="h-5 w-5" /></div>
          <div className="min-w-0"><h3 className="font-semibold text-navy-900 truncate">{h.name}</h3><p className="text-xs text-slate-500">{titleCase(h.type ?? h.gender ?? '')}</p></div>
        </div>
        <StatusBadge value={h.isActive === undefined ? h.status : h.isActive} />
      </div>
      {(h.address || h.city) && <p className="text-sm text-slate-500 flex gap-1.5"><MapPin className="h-4 w-4 shrink-0 mt-0.5" />{[h.address, h.city].filter(Boolean).join(', ')}</p>}
      {h.warden && <p className="text-sm text-slate-500 flex gap-1.5"><UserIcon className="h-4 w-4 shrink-0 mt-0.5" />Warden: {nm(h.warden) || label(h.warden)}</p>}
      {h.contactPhone && <p className="text-sm text-slate-500 flex gap-1.5"><Phone className="h-4 w-4 shrink-0 mt-0.5" />{h.contactPhone}</p>}
      {pct !== null && (
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Occupancy</span><span>{occ ?? 0}/{beds} beds</span></div>
          <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} /></div>
        </div>
      )}
    </Shell>
  );
}

export function RoomCard({ r, actions }: { r: Row; actions?: ReactNode }) {
  const cap = r.capacity ?? 0;
  const occ = r.occupiedBeds ?? r.occupied ?? 0;
  return (
    <Shell actions={actions}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center"><DoorOpen className="h-5 w-5" /></div>
          <div><h3 className="font-semibold text-navy-900">Room {r.roomNumber}</h3><p className="text-xs text-slate-500">{[label(r.hostel), label(r.building)].filter(Boolean).join(' · ')}</p></div>
        </div>
        <StatusBadge value={r.status} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Type', titleCase(r.type ?? '-')], ['Capacity', cap], ['Occupied', occ]].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl bg-slate-50 py-2"><p className="text-[11px] text-slate-400 uppercase">{k}</p><p className="text-sm font-semibold text-navy-800">{v}</p></div>
        ))}
      </div>
      {r.status === 'MAINTENANCE' && <p className="text-xs text-amber-600 flex items-center gap-1"><Wrench className="h-3.5 w-3.5" />Under maintenance</p>}
    </Shell>
  );
}

const bedTone: Record<string, string> = {
  AVAILABLE: 'border-emerald-200 bg-emerald-50/50 text-emerald-600',
  OCCUPIED: 'border-brand-200 bg-brand-50/50 text-brand-600',
  MAINTENANCE: 'border-amber-200 bg-amber-50/50 text-amber-600',
};
export function BedCard({ b, actions }: { b: Row; actions?: ReactNode }) {
  const tone = bedTone[b.status] ?? 'border-slate-200 bg-slate-50 text-slate-500';
  const occupant = b.student ?? b.occupant;
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-2 ${tone}`}>
      <div className="flex items-center justify-between"><BedDouble className="h-6 w-6" /><StatusBadge value={b.status} /></div>
      <div className="text-navy-900"><p className="font-semibold">Bed {b.bedNumber}</p><p className="text-xs text-slate-500">{b.room?.roomNumber ? `Room ${b.room.roomNumber}` : label(b.room)}{b.hostel ? ` · ${label(b.hostel)}` : ''}</p></div>
      {occupant && <p className="text-xs text-slate-600 truncate">Student: {nm(occupant) || label(occupant)}</p>}
      {actions && <div className="flex gap-1.5 pt-2 border-t border-black/5">{actions}</div>}
    </div>
  );
}

export function ComplaintCard({ c, actions }: { c: Row; actions?: ReactNode }) {
  return (
    <Shell actions={actions}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><h3 className="font-semibold text-navy-900 truncate">{c.title ?? titleCase(c.category ?? 'Complaint')}</h3><p className="text-xs text-slate-500">{titleCase(c.category ?? '')} · {nm(c.student) || label(c.student)}</p></div>
        <StatusBadge value={c.status} />
      </div>
      {c.description && <p className="text-sm text-slate-600 line-clamp-3">{c.description}</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {c.priority && <StatusBadge value={c.priority} />}
        {c.createdAt && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDate(c.createdAt)}</span>}
        {c.assignedTo && <span className="flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" />{nm(c.assignedTo) || label(c.assignedTo)}</span>}
      </div>
      {c.resolutionNote && <p className="text-xs rounded-xl bg-emerald-50 text-emerald-700 p-2">Resolution: {c.resolutionNote}</p>}
    </Shell>
  );
}

export function PaymentCard({ p, actions }: { p: Row; actions?: ReactNode }) {
  return (
    <Shell actions={actions}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Receipt className="h-5 w-5" /></div>
          <div className="min-w-0"><p className="text-xl font-bold text-navy-900">{inr(p.amount)}</p><p className="text-xs text-slate-500 truncate">{nm(p.student) || label(p.student)}</p></div>
        </div>
        <StatusBadge value={p.status} />
      </div>
      <dl className="text-xs text-slate-500 space-y-1">
        {(p.razorpayPaymentId || p.transactionId) && <div className="flex justify-between gap-2"><dt>Reference</dt><dd className="font-mono text-slate-700 truncate">{p.razorpayPaymentId ?? p.transactionId}</dd></div>}
        {p.method && <div className="flex justify-between"><dt>Method</dt><dd className="text-slate-700">{titleCase(p.method)}</dd></div>}
        <div className="flex justify-between"><dt>Date</dt><dd className="text-slate-700">{fmtDate(p.paidAt ?? p.createdAt)}</dd></div>
        {p.refundedAmount ? <div className="flex justify-between"><dt>Refunded</dt><dd className="text-purple-700">{inr(p.refundedAmount)}</dd></div> : null}
      </dl>
    </Shell>
  );
}
