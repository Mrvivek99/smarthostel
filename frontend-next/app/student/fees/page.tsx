import type { Metadata } from 'next';
import { FeesClient } from './client';

export const metadata: Metadata = { title: 'Fees' };

export default function Page() {
  return <FeesClient />;
}
