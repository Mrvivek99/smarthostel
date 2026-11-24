import Link from 'next/link';
import { Building2 } from 'lucide-react';

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-navy-900 via-navy-800 to-transparent opacity-[0.07]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-10rem)] max-w-md flex-col justify-center px-4 py-10 sm:px-0">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-800 to-brand-600 text-white shadow-card"><Building2 className="h-6 w-6" /></span>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-navy-500">{subtitle}</p>}
        </div>
        <div className="card p-6 sm:p-8">{children}</div>
        {footer && <p className="mt-5 text-center text-sm text-navy-500">{footer}</p>}
        <p className="mt-4 text-center text-xs text-navy-300"><Link href="/" className="hover:underline">Back to home</Link></p>
      </div>
    </div>
  );
}
