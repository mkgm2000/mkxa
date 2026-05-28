'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAthlete } from '@/lib/athlete-context';

export default function RootPage() {
  const router = useRouter();
  const athlete = useAthlete();

  useEffect(() => {
    router.replace(athlete ? '/home' : '/pick');
  }, [athlete, router]);

  return null;
}
