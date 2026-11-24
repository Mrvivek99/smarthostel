import type { Metadata } from 'next';
import { LeaveClient } from './client';

export const metadata: Metadata = { title: 'Leave' };

export default function Page() {
  return <LeaveClient />;
}
