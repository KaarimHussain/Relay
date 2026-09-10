'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <p className="text-xs font-semibold text-gray-400 tracking-wide">Loading…</p>
      </div>
    );
  }
  if (status === 'unauthenticated') return null;

  return (
    <div
      className={`relative h-screen w-full bg-white overflow-hidden transition-[opacity,transform] duration-300 ease-out ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      {children}
    </div>
  );
}
