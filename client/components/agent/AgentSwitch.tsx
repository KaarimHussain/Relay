'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AgentSwitch() {
  const pathname = usePathname();
  const isAgent = pathname?.startsWith('/agent') ?? false;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className="pointer-events-auto relative flex items-center p-1 rounded-full"
        role="tablist"
        aria-label="Interaction mode"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
          border: '1px solid rgba(209, 213, 219, 0.9)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,1), 0 2px 4px rgba(0,0,0,0.04), 0 12px 32px -4px rgba(0,0,0,0.12)',
        }}
      >
        <SegmentLink href="/dashboard" label="Manual" active={!isAgent} />
        <SegmentLink href="/agent" label="Agent" active={isAgent} />
      </div>
    </div>
  );
}

function SegmentLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  if (active) {
    return (
      <Link
        href={href}
        role="tab"
        aria-selected="true"
        className="btn-clay-primary text-sm px-5 py-1.5 rounded-full"
        style={{ borderRadius: '9999px' }}
      >
        {label}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      role="tab"
      aria-selected="false"
      className="text-sm font-medium px-5 py-1.5 rounded-full text-gray-500 hover:text-gray-800 transition-colors"
    >
      {label}
    </Link>
  );
}
