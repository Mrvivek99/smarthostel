import type { Metadata } from 'next';
import { RoomClient } from './client';

export const metadata: Metadata = { title: 'My Room' };

export default function Page() {
  return <RoomClient />;
}
