import { ReactNode } from 'react';

interface Props { tabs: { id: string; label: string; icon?: ReactNode }[]; active: string; onChange: (id: string) => void }

export default function Tabs({ tabs, active, onChange }: Props) {
  return (
    <div className="flex gap-1 border-b border-slate-200 mb-5 overflow-x-auto" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => onChange(t.id)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${active === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          {t.icon}{t.label}
        </button>
      ))}
    </div>
  );
}
