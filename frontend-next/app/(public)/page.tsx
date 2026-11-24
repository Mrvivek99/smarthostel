import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bed, CalendarCheck, CheckCircle2, CreditCard, FileText, MessageSquareWarning, ShieldCheck, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: { absolute: 'SmartHostel - Hostel management for modern campuses' },
  description: 'Online admissions, conflict-free bed allocation, Razorpay fee payments, attendance, complaints and notices - one platform for students and wardens.',
  alternates: { canonical: '/' },
};

const FEATURES = [
  { icon: FileText, title: 'Online admissions', text: 'Students apply, upload documents and track approval without a single paper form.' },
  { icon: Bed, title: 'Smart bed allocation', text: 'Gender-aware, capacity-safe allocation that never double-books a bed.' },
  { icon: CreditCard, title: 'Secure fee payments', text: 'Pay hostel fees through Razorpay. Every payment is verified on the server and receipts are instant.' },
  { icon: CalendarCheck, title: 'Daily attendance', text: 'Wardens mark attendance in seconds; students see their monthly percentage.' },
  { icon: MessageSquareWarning, title: 'Complaints that get closed', text: 'Categorised tickets with status tracking and resolution notes.' },
  { icon: ShieldCheck, title: 'Built for isolation', text: 'Role-based access and strict organisation-level data separation.' },
];

const STEPS = [
  { n: '1', title: 'Register', text: 'Create your student account with your hostel organisation code.' },
  { n: '2', title: 'Apply & get a bed', text: 'Submit your admission. Once approved, a bed is allocated.' },
  { n: '3', title: 'Live hassle-free', text: 'Pay fees, raise complaints, apply for leave and read notices.' },
];

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div aria-hidden className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-brand-400/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div>
            <span className="badge bg-white/10 text-brand-200">Hostel management, simplified</span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
              One calm place for everything that happens in your hostel.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-navy-200">
              From the first admission form to the last fee receipt, SmartHostel keeps students and wardens in sync - on any device.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="btn-primary px-6 py-3 text-base">Create student account <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/login" className="btn border border-white/25 px-6 py-3 text-base text-white hover:bg-white/10">Log in</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-navy-200">
              {['No double-booked beds', 'Server-verified payments', 'Works on mobile'].map((t) => (
                <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand-300" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="hidden lg:block" aria-hidden>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-pop backdrop-blur">
              <div className="grid grid-cols-2 gap-4">
                {[['Occupied beds', '184 / 220'], ['Pending fees', 'Rs. 42,500'], ['Attendance today', '96%'], ['Open complaints', '7']].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-white p-4 text-navy-900">
                    <p className="text-xs font-medium text-navy-500">{k}</p>
                    <p className="mt-1 text-2xl font-bold">{v}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-xs text-navy-300">Illustrative dashboard preview</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="features">
        <div className="max-w-2xl">
          <h2 id="features" className="text-3xl font-bold">Everything your hostel runs on</h2>
          <p className="mt-3 text-navy-500">Purpose-built modules for the people who live in and run a hostel.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-pop">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><f.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-navy-500">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20" aria-labelledby="how">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="how" className="text-3xl font-bold">How it works</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl bg-surface p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">{s.n}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-navy-500">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="card flex flex-col items-start justify-between gap-6 bg-gradient-to-br from-navy-900 to-navy-700 p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <div>
            <div className="flex items-center gap-2 text-brand-300"><Users className="h-5 w-5" /> For students and wardens</div>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Ready to move your hostel online?</h2>
          </div>
          <Link href="/register" className="btn-primary px-6 py-3 text-base">Get started</Link>
        </div>
      </section>
    </>
  );
}
