import type { Metadata } from 'next';
import { VisitorsClient } from './client';

export const metadata: Metadata = { title: 'Visitors' };

export default function Page() {
  return <VisitorsClient />;
}
