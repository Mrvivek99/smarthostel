import type { Metadata } from 'next';
import { WardenDashboard } from './client';

export const metadata: Metadata = { title: 'Dashboard' };

export default function Page() {
  return <WardenDashboard />;
}
