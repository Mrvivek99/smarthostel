import type { Metadata } from 'next';
import { AdmissionClient } from './client';

export const metadata: Metadata = { title: 'Admission' };

export default function Page() {
  return <AdmissionClient />;
}
