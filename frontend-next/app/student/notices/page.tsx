import type { Metadata } from 'next';
import { NoticesClient } from './client';

export const metadata: Metadata = { title: 'Notices' };

export default function Page() {
  return <NoticesClient />;
}
