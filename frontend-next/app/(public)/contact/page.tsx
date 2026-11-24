import type { Metadata } from 'next';
import { Mail, MapPin, Phone } from 'lucide-react';
import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the SmartHostel team for demos, onboarding and support.',
  alternates: { canonical: '/contact' },
};

export default function Contact() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <h1 className="text-4xl font-bold">Contact us</h1>
        <p className="mt-4 text-navy-600">Questions about onboarding your hostel, or need help with your account? Send us a note and we will get back to you.</p>
        <ul className="mt-8 space-y-4 text-sm">
          <li className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Mail className="h-5 w-5" /></span> support@smarthostel.local</li>
          <li className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Phone className="h-5 w-5" /></span> Mon-Sat, 9am - 6pm IST</li>
          <li className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><MapPin className="h-5 w-5" /></span> Remote-first team, India</li>
        </ul>
      </div>
      <div className="lg:col-span-3"><ContactForm /></div>
    </div>
  );
}
