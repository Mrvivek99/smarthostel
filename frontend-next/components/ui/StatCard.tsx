import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label, value, icon: Icon, hint, tone = 'brand', loading = false,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: string;
  tone?: 'brand' | 'navy' | 'green' | 'amber' | 'red';
  loading?: boolean;
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600', navy: 'bg-navy-100 text-navy-700', green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600',
  } as const;
  return (
    <div className="card flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-navy-500">{label}</p>
        {loading ? <div className="skeleton mt-2 h-8 w-24" /> : <p className="mt-1 truncate text-2xl font-bold text-navy-900 sm:text-[28px]">{value}</p>}
        {hint && !loading && <p className="mt-1 text-xs text-navy-400">{hint}</p>}
      </div>
      {Icon && (
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
