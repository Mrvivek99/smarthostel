import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, Scale, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About',
  description: 'SmartHostel is a multi-tenant hostel management platform built for correctness: atomic bed allocation, verified payments and strict data isolation.',
  alternates: { canonical: '/about' },
};

const VALUES = [
  { icon: Scale, title: 'Correct by construction', text: 'A bed can only be held by one student. Allocations are atomic and enforced by database indexes, not just by the UI.' },
  { icon: Lock, title: 'Private by default', text: 'Every record belongs to an organisation. Wardens only see the hostels they are assigned to; students only see their own data.' },
  { icon: Zap, title: 'Fast for everyone', text: 'Wardens mark a whole hostel present in a few taps; students pay fees in under a minute.' },
];

export default function About() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-4xl font-bold">About SmartHostel</h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-navy-600">
        Hostels run on hundreds of small interactions: an admission form, a bed assignment, a fee reminder, a late-night leave request. SmartHostel brings those into one
        platform so wardens spend less time on registers and spreadsheets, and students always know where they stand.
      </p>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {VALUES.map((v) => (
          <div key={v.title} className="card p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><v.icon className="h-5 w-5" /></div>
            <h2 className="mt-4 text-lg font-semibold">{v.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-navy-500">{v.text}</p>
          </div>
        ))}
      </div>
      <div className="card mt-12 p-6 sm:p-8">
        <h2 className="text-2xl font-bold">What you can do</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-semibold text-brand-700">Students</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-navy-600">
              <li>Apply for admission and track the decision</li>
              <li>See room and bed, pay fees online, download receipts</li>
              <li>Check attendance, raise complaints, request leave</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-brand-700">Wardens</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-navy-600">
              <li>Monitor occupancy, attendance and pending requests</li>
              <li>Approve leave, resolve complaints, register visitors</li>
              <li>Publish notices to all residents</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-10 flex gap-3">
        <Link href="/register" className="btn-primary">Create an account</Link>
        <Link href="/contact" className="btn-secondary">Talk to us</Link>
      </div>
    </div>
  );
}
