import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

const siteUrl = process.env.APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'SmartHostel - Hostel management for modern campuses', template: '%s | SmartHostel' },
  description:
    'SmartHostel is a multi-tenant hostel management platform: online admissions, smart bed allocation, fee payments with Razorpay, attendance, complaints, leave and notices.',
  applicationName: 'SmartHostel',
  keywords: ['hostel management', 'hostel software', 'student hostel', 'room allocation', 'hostel fees', 'warden dashboard'],
  openGraph: {
    type: 'website',
    siteName: 'SmartHostel',
    title: 'SmartHostel - Hostel management for modern campuses',
    description: 'Admissions, room allocation, fees, attendance and complaints in one beautifully simple platform.',
  },
  twitter: { card: 'summary_large_image', title: 'SmartHostel', description: 'Hostel management for modern campuses.' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#121c38' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
