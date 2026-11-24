import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetForm } from './ResetForm';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
