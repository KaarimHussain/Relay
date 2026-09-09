'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AgentSwitch } from '@/components/agent/AgentSwitch';
import { useAuthStore } from '@/store/auth';

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <p className="text-xs font-semibold text-gray-400 tracking-wide">Loading…</p>
      </div>
    );
  }
  if (status === 'unauthenticated') return null;

  return (
    <div className="relative h-screen w-screen bg-white overflow-hidden">
      {children}
      <AgentSwitch />
    </div>
  );
}
