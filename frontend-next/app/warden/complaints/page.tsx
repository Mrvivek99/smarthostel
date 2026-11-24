import type { Metadata } from 'next';
import { ComplaintsClient } from './client';

export const metadata: Metadata = { title: 'Complaints' };

export default function Page() {
  return <ComplaintsClient />;
}
