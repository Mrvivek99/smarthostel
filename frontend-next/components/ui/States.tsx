import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden />;
}

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-12 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title, message, action, icon }: { title: string; message?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-navy-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-navy-500">{message}</p>
      {onRetry && (
        <button className="btn-secondary mt-4" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Renders loading / error / empty / content for a data-backed section. */
export function Async({
  loading, error, empty, emptyTitle = 'Nothing here yet', emptyMessage, emptyAction, onRetry, children, rows,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  onRetry?: () => void;
  rows?: number;
  children: React.ReactNode;
}) {
  if (loading && !error) return <div className="p-4"><LoadingState rows={rows} /></div>;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (empty) return <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />;
  return <>{children}</>;
}

const TONES: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700', APPROVED: 'bg-emerald-50 text-emerald-700', RESOLVED: 'bg-emerald-50 text-emerald-700',
  PRESENT: 'bg-emerald-50 text-emerald-700', ACTIVE: 'bg-emerald-50 text-emerald-700', VERIFIED: 'bg-emerald-50 text-emerald-700', AVAILABLE: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700', SUBMITTED: 'bg-amber-50 text-amber-700', PARTIAL: 'bg-amber-50 text-amber-700', CREATED: 'bg-amber-50 text-amber-700',
  UNDER_REVIEW: 'bg-sky-50 text-sky-700', ASSIGNED: 'bg-sky-50 text-sky-700', IN_PROGRESS: 'bg-sky-50 text-sky-700', ON_LEAVE: 'bg-sky-50 text-sky-700', MEDIUM: 'bg-sky-50 text-sky-700',
  REJECTED: 'bg-red-50 text-red-700', ABSENT: 'bg-red-50 text-red-700', FAILED: 'bg-red-50 text-red-700', CANCELLED: 'bg-navy-100 text-navy-600',
  URGENT: 'bg-red-50 text-red-700', HIGH: 'bg-orange-50 text-orange-700', LOW: 'bg-navy-100 text-navy-600',
  OCCUPIED: 'bg-brand-50 text-brand-700', CHECKED_OUT: 'bg-navy-100 text-navy-600', TRANSFERRED: 'bg-navy-100 text-navy-600', INACTIVE: 'bg-navy-100 text-navy-600',
  REFUNDED: 'bg-navy-100 text-navy-600', PARTIALLY_REFUNDED: 'bg-navy-100 text-navy-600',
};

export function StatusBadge({ status }: { status?: string | null }) {
  const s = String(status ?? '');
  return <span className={`badge ${TONES[s] ?? 'bg-navy-100 text-navy-600'}`}>{s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) || '-'}</span>;
}
