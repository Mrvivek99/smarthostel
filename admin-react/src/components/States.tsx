import { ReactNode } from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

export function LoadingState({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400" role="status">
      <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
      <p className="mt-3 text-sm">{text}</p>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', description, action }: { title?: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="h-14 w-14 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center"><Inbox className="h-7 w-7" /></div>
      <h3 className="mt-4 font-semibold text-navy-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4" role="alert">
      <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center"><AlertCircle className="h-7 w-7" /></div>
      <h3 className="mt-4 font-semibold text-navy-900">Something went wrong</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-md">{message}</p>
      {onRetry && <button className="btn-secondary mt-4" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const tones: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  purple: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/10',
};
const map: Record<string, string> = {
  PAID: 'green', APPROVED: 'green', RESOLVED: 'green', ACTIVE: 'green', AVAILABLE: 'green', PRESENT: 'green', COMPLETED: 'green', VERIFIED: 'green', GOOD: 'green', SUCCESS: 'green', CAPTURED: 'green',
  PENDING: 'amber', SUBMITTED: 'amber', PARTIAL: 'amber', FAIR: 'amber', MAINTENANCE: 'amber', ON_LEAVE: 'amber', LOW: 'blue', CREATED: 'blue', MEDIUM: 'amber',
  REJECTED: 'red', FAILED: 'red', OVERDUE: 'red', ABSENT: 'red', DAMAGED: 'red', POOR: 'red', INACTIVE: 'gray', HIGH: 'red', URGENT: 'red', CRITICAL: 'red',
  OCCUPIED: 'purple', ASSIGNED: 'blue', IN_PROGRESS: 'purple', REFUNDED: 'purple', CHECKED_OUT: 'gray', TRANSFERRED: 'gray', CANCELLED: 'gray', EXPIRED: 'red',
};

export function StatusBadge({ value }: { value?: string | boolean | null }) {
  if (value === undefined || value === null || value === '') return <span className="text-slate-300">—</span>;
  const v = typeof value === 'boolean' ? (value ? 'ACTIVE' : 'INACTIVE') : String(value);
  const tone = tones[map[v.toUpperCase()] ?? 'gray'];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${tone}`}>{v.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</span>;
}
