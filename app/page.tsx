'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// PWA entry point. Always lands on the athlete picker so cold-opens
// (icon tap, refresh, share target) reset who's using the app. The
// stored athlete is kept in localStorage so downstream pages don't
// break mid-session — /pick reads it for affordances but the user
// still has to tap an avatar to enter.
export default function RootPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/pick'); }, [router]);
  return null;
}
