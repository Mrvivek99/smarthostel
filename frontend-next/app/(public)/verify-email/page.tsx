import { Suspense } from 'react';
import type { Metadata } from 'next';
import { VerifyEmail } from './VerifyEmail';

export const metadata: Metadata = { title: 'Verify email', robots: { index: false } };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
