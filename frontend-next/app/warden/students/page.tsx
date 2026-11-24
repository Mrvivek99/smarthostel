import type { Metadata } from 'next';
import { StudentsClient } from './client';

export const metadata: Metadata = { title: 'Students' };

export default function Page() {
  return <StudentsClient />;
}
