'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { PLATFORMS } from '@/components/accounts/platforms';
import { PlatformDef } from '@/components/accounts/PlatformCard';
import { ConnectGuideModal } from '@/components/accounts/ConnectGuideModal';
import { useBrandStore } from '@/store/brand';
import { useAuthStore } from '@/store/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

function PlatformRow({ platform, brandId }: { platform: PlatformDef; brandId: string }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const hasGuide = !!platform.guideSteps?.length;

  const handleConnect = async () => {
    setError('');
    setConnecting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('relay_token') : null;
      if (!token) throw new Error('Not logged in');

      const res = await fetch(`${API_BASE}/oauth/connect/${platform.platform.toLowerCase()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ brandId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as any;
        throw new Error(err.message ?? `Failed to start OAuth (${res.status})`);
      }

      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch (err: any) {
      setError(err.message ?? 'Failed to connect');
      setConnecting(false);
    }
  };

  if (platform.comingSoon) {
    return (
      <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 bg-gray-50 opacity-60">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${platform.color}`}>
          {platform.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-900">{platform.name}</p>
          <p className="text-[11px] text-gray-500">{platform.description}</p>
        </div>
        <span className="shrink-0 h-7 px-2.5 text-[11px] font-semibold bg-gray-200 text-gray-500 rounded-lg inline-flex items-center">
          Coming Soon
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 bg-gray-50">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${platform.color}`}>
        {platform.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-900">{platform.name}</p>
        <p className="text-[11px] text-gray-500">{platform.description}</p>
        {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
      </div>
      <button
        onClick={() => (hasGuide ? setShowGuide(true) : handleConnect())}
        disabled={connecting || !brandId}
        className="shrink-0 h-7 px-2.5 text-[11px] font-semibold btn-clay-primary disabled:opacity-50 inline-flex items-center gap-1.5"
      >
        {connecting
          ? <><Loader2 size={11} className="animate-spin" /> Connecting…</>
          : `Connect`
        }
      </button>

      {hasGuide && (
        <ConnectGuideModal
          open={showGuide}
          platform={platform}
          onClose={() => setShowGuide(false)}
          onContinue={() => {
            setShowGuide(false);
            handleConnect();
          }}
        />
      )}
    </div>
  );
}

export default function OnboardingAccountsPage() {
  const router = useRouter();
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const { fetchBrands, status } = useBrandStore();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (status === 'idle') fetchBrands();
  }, [status, fetchBrands]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4 bg-[#F8F9FA]">
      <div className="w-full max-w-[480px] flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <svg width="30" height="30" viewBox="0 0 256 256" fill="none">
            <path d="M 128 256 L 64 256 L 64 192 L 128 192 Z M 256 256 L 192 256 L 192 192 L 256 192 Z M 64 192 L 0 192 L 0 128 L 64 128 Z M 192 192 L 128 192 L 128 128 L 192 128 Z M 128 128 L 64 128 L 64 64 L 128 64 Z M 256 128 L 192 128 L 192 64 L 256 64 Z M 64 64 L 0 64 L 0 0 L 64 0 Z M 192 64 L 128 64 L 128 0 L 192 0 Z" fill="#1A1A1A"/>
          </svg>
          <span className="text-lg font-bold text-gray-900 tracking-tight">Relay</span>
        </div>
        <button type="button" onClick={() => { logout(); router.replace('/login'); }} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-white hover:text-red-600">
          <LogOut size={13} /> Log out
        </button>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-1.5 opacity-60">
          <div className="w-5.5 h-5.5 rounded-full bg-orange-600 flex items-center justify-center text-white text-[11px] font-bold">✓</div>
          <span className="text-xs font-semibold text-orange-600">Brand created</span>
        </div>
        <div className="w-8 h-px bg-orange-300" />
        <div className="flex items-center gap-1.5 opacity-60">
          <div className="w-5.5 h-5.5 rounded-full bg-orange-600 flex items-center justify-center text-white text-[11px] font-bold">✓</div>
          <span className="text-xs font-semibold text-orange-600">Preferences</span>
        </div>
        <div className="w-8 h-px bg-orange-300" />
        <div className="flex items-center gap-1.5">
          <div className="w-5.5 h-5.5 rounded-full bg-orange-600 flex items-center justify-center text-white text-[11px] font-bold">3</div>
          <span className="text-xs font-semibold text-orange-600">Connect accounts</span>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-[480px] bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-6 pb-4">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-1">
            Connect your social accounts
          </h1>
          <p className="text-xs text-gray-500 font-normal leading-relaxed">
            Link your channels to start scheduling posts under your new brand workspace.
          </p>
        </div>

        <div className="px-6 pb-5 grid grid-cols-1 gap-2.5">
          {!activeBrand && status === 'loading' ? (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
              <Loader2 size={15} className="animate-spin" />
              <span className="text-xs">Loading…</span>
            </div>
          ) : (
            PLATFORMS.map((platform) => (
              <PlatformRow
                key={platform.id}
                platform={platform}
                brandId={activeBrand?.id ?? ''}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-100">
          <Link
            href="/onboarding/preferences"
            className="text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors"
          >
            ← Back
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="btn-clay-secondary h-8 px-3 text-xs"
            >
              Skip for now
            </Link>
            <Link
              href="/dashboard"
              className="btn-clay-primary h-8 px-3.5 text-xs font-semibold"
            >
              Go to dashboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
