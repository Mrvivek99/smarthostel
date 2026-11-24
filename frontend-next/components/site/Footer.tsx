import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-navy-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-navy-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>&copy; {new Date().getFullYear()} SmartHostel. All rights reserved.</p>
        <div className="flex gap-5">
          <Link href="/about" className="hover:text-navy-900">About</Link>
          <Link href="/contact" className="hover:text-navy-900">Contact</Link>
          <Link href="/login" className="hover:text-navy-900">Log in</Link>
        </div>
      </div>
    </footer>
  );
}
