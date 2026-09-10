'use client';

import { usePathname } from 'next/navigation';
import { AgentSwitch } from './AgentSwitch';
import { useAuthStore } from '@/store/auth';

export function AgentSwitchPortal() {
  const pathname = usePathname();
  const status = useAuthStore((state) => state.status);
  const isAuthRoute =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/forgot-password') ||
    pathname?.startsWith('/reset-password') ||
    pathname?.startsWith('/onboarding');

  // The dashboard and Agent Mode are sibling authenticated experiences.
  // Keep the switch available throughout either experience, never on auth pages.
  if (status !== 'authenticated' || isAuthRoute) return null;
  return <AgentSwitch />;
}
