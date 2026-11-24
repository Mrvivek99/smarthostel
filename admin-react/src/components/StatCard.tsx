import { ReactNode } from 'react';

const tones: Record<string, string> = {
  purple: 'bg-brand-50 text-brand-600',
  navy: 'bg-navy-50 text-navy-700',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  sky: 'bg-sky-50 text-sky-600',
};

export default function StatCard({ label, value, icon, tone = 'purple', hint }: { label: string; value: string | number; icon: ReactNode; tone?: keyof typeof tones; hint?: string }) {
  return (
    <div className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-navy-900 leading-tight truncate">{value}</p>
        {hint && <p className="text-xs text-slate-400 truncate">{hint}</p>}
      </div>
    </div>
  );
}
