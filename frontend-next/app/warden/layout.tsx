import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { guardPortal } from '@/lib/portal';
import { WARDEN_NAV } from '@/lib/nav';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { default: 'Warden Portal', template: '%s | Warden Portal' }, robots: { index: false, follow: false } };

export default async function WardenLayout({ children }: { children: React.ReactNode }) {
  const auth = await guardPortal('WARDEN');
  return (
    <DashboardLayout items={WARDEN_NAV} portal="Warden Portal" role={auth.role} user={{ name: auth.name, email: auth.email }}>
      {children}
    </DashboardLayout>
  );
}
