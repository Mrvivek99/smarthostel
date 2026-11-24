'use client';
import { useEffect, useState } from 'react';
import { useApi } from '@/lib/hooks';

export interface WardenHostel { _id: string; name: string; code?: string }

/** The warden's assigned hostels (from /api/auth/me) plus a selected-hostel state defaulting to the first. */
export function useWardenHostels() {
  const me = useApi<any>('/api/auth/me');
  const hostels: WardenHostel[] = me.data?.warden?.hostels ?? [];
  const [hostel, setHostel] = useState('');
  useEffect(() => {
    if (!hostel && hostels.length) setHostel(String(hostels[0]._id));
  }, [hostels, hostel]);
  return { me, hostels, hostel, setHostel, userId: me.data?.user?.id as string | undefined };
}
