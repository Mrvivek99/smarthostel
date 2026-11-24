import { ReactNode } from 'react';

interface Props { label: string; htmlFor?: string; error?: string; hint?: string; required?: boolean; children: ReactNode; className?: string }

export default function FormField({ label, htmlFor, error, hint, required, children, className = '' }: Props) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-rose-600" role="alert">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
