import { Filter } from 'lucide-react';
import type { FilterDef } from '../types';

interface Props { filters: FilterDef[]; values: Record<string, string>; onChange: (key: string, value: string) => void; onReset: () => void }

export default function FilterPanel({ filters, values, onChange, onReset }: Props) {
  if (!filters.length) return null;
  const active = Object.values(values).some(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="h-4 w-4 text-slate-400" />
      {filters.map((f) => (
        <select key={f.key} className="input !w-auto !py-1.5 text-xs" value={values[f.key] ?? ''} onChange={(e) => onChange(f.key, e.target.value)} aria-label={f.label}>
          <option value="">{f.label}: All</option>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ))}
      {active && <button className="text-xs text-brand-600 hover:underline" onClick={onReset}>Reset</button>}
    </div>
  );
}
