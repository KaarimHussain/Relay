'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AgentSwitch({ className }: { className?: string }) {
  const pathname = usePathname();
  const isAgent = pathname?.startsWith('/agent') ?? false;

  return (
    <div
      className={`relative flex items-center p-0.5 rounded-full shrink-0 ${className ?? ''}`}
      role="tablist"
      aria-label="Interaction mode"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
        border: '1px solid rgba(209, 213, 219, 0.9)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,1), 0 2px 4px rgba(0,0,0,0.04), 0 8px 18px -6px rgba(0,0,0,0.14)',
      }}
    >
        {/* Sliding orange pill indicator */}
        <span
          aria-hidden
          className="absolute top-1 bottom-1 rounded-full pointer-events-none"
          style={{
            width: 'calc(50% - 2px)',
            left: isAgent ? 'calc(50%)' : '2px',
            transition: 'left 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
            background: 'linear-gradient(180deg, #F97316 0%, #EA6910 100%)',
            border: '1px solid rgba(234, 105, 16, 0.9)',
            boxShadow:
              'inset 0 1px 0.5px rgba(255,255,255,0.35), 0 1.5px 3px rgba(234,105,16,0.15), 0 4px 10px -1px rgba(249,115,22,0.25)',
          }}
        />

        <Link
          href="/dashboard"
          role="tab"
          aria-selected={!isAgent}
          className="relative z-10 w-1/2 text-center text-xs font-semibold px-3 py-1 rounded-full"
          style={{ transition: 'color 0.2s ease', color: !isAgent ? '#ffffff' : '#6b7280' }}
        >
          Manual
        </Link>
        <Link
          href="/agent"
          role="tab"
          aria-selected={isAgent}
          className="relative z-10 w-1/2 text-center text-xs font-semibold px-3 py-1 rounded-full"
          style={{ transition: 'color 0.2s ease', color: isAgent ? '#ffffff' : '#6b7280' }}
        >
          Agent
        </Link>
    </div>
  );
}
