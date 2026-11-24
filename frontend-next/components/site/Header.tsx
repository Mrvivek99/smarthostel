'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Building2, Menu, X } from 'lucide-react';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-navy-100/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-white"><Building2 className="h-5 w-5" /></span>
          <span className="text-lg font-bold">Smart<span className="text-brand-600">Hostel</span></span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50 hover:text-navy-900">{l.label}</Link>
          ))}
          <Link href="/login" className="btn-secondary ml-2">Log in</Link>
          <Link href="/register" className="btn-primary">Get started</Link>
        </nav>
        <button className="btn-ghost px-2 md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="space-y-1 border-t border-navy-100 bg-white px-4 py-3 md:hidden" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-50">{l.label}</Link>
          ))}
          <div className="flex gap-2 pt-2">
            <Link href="/login" onClick={() => setOpen(false)} className="btn-secondary flex-1">Log in</Link>
            <Link href="/register" onClick={() => setOpen(false)} className="btn-primary flex-1">Get started</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
