'use client';
import { useState } from 'react';
import type { NavItem } from '@/lib/nav';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export function DashboardLayout({
  items, portal, user, role, children,
}: {
  items: NavItem[];
  portal: string;
  role: string;
  user: { name: string; email: string };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <Sidebar items={items} portal={portal} open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-72">
        <Navbar user={user} role={role} onMenu={() => setOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
