import type { Metadata } from 'next';
import { ProfileClient } from './client';

export const metadata: Metadata = { title: 'Profile' };

export default function Page() {
  return <ProfileClient />;
}
