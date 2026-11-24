import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { guardPortal } from '@/lib/portal';
import { STUDENT_NAV } from '@/lib/nav';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { default: 'Student Portal', template: '%s | Student Portal' }, robots: { index: false, follow: false } };

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const auth = await guardPortal('STUDENT');
  return (
    <DashboardLayout items={STUDENT_NAV} portal="Student Portal" role={auth.role} user={{ name: auth.name, email: auth.email }}>
      {children}
    </DashboardLayout>
  );
}
