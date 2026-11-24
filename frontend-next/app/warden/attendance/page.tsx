import type { Metadata } from 'next';
import { AttendanceClient } from './client';

export const metadata: Metadata = { title: 'Attendance' };

export default function Page() {
  return <AttendanceClient />;
}
