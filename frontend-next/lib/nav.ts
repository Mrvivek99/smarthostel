export type IconName =
  | 'dashboard' | 'user' | 'file' | 'bed' | 'wallet' | 'receipt' | 'calendar' | 'alert' | 'plane' | 'bell' | 'settings' | 'users' | 'door';

export interface NavItem { href: string; label: string; icon: IconName }

export const STUDENT_NAV: NavItem[] = [
  { href: '/student/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/student/profile', label: 'Profile', icon: 'user' },
  { href: '/student/admission', label: 'Admission', icon: 'file' },
  { href: '/student/room', label: 'My Room', icon: 'bed' },
  { href: '/student/fees', label: 'Fees', icon: 'wallet' },
  { href: '/student/payments', label: 'Payments', icon: 'receipt' },
  { href: '/student/attendance', label: 'Attendance', icon: 'calendar' },
  { href: '/student/complaints', label: 'Complaints', icon: 'alert' },
  { href: '/student/leave', label: 'Leave', icon: 'plane' },
  { href: '/student/notices', label: 'Notices', icon: 'bell' },
  { href: '/student/settings', label: 'Settings', icon: 'settings' },
];

export const WARDEN_NAV: NavItem[] = [
  { href: '/warden/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/warden/students', label: 'Students', icon: 'users' },
  { href: '/warden/attendance', label: 'Attendance', icon: 'calendar' },
  { href: '/warden/complaints', label: 'Complaints', icon: 'alert' },
  { href: '/warden/leave', label: 'Leave', icon: 'plane' },
  { href: '/warden/visitors', label: 'Visitors', icon: 'door' },
  { href: '/warden/notices', label: 'Notices', icon: 'bell' },
  { href: '/warden/settings', label: 'Settings', icon: 'settings' },
];
