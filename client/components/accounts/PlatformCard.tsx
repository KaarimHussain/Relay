'use client';

import { useState } from 'react';
import { Unlink, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SocialAccount, useAccountStore } from '@/store/account';
import { Platform } from '@/store/account';
import { ConnectGuideModal } from './ConnectGuideModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export interface GuideStep {
  title: string;
  detail: string;
}

export interface PlatformDef {
  id: string;
  name: string;
  description: string;
  color: string;
  platform: Platform;
  icon: React.ReactNode;
  comingSoon?: boolean;
  /** Plain-language "before you connect" steps shown in a guide modal. Omit for platforms that don't need extra setup. */
  guideSteps?: GuideStep[];
  /** Optional one-line summary of why the extra setup is required, shown above the steps. */
  guideIntro?: string;
}

interface PlatformCardProps {
  brandId: string;
  platform: PlatformDef;
  account?: SocialAccount;
}

const STATUS_CONFIG = {
  Active:       { label: 'Connected',     badge: 'text-emerald-700 bg-emerald-50', dot: 'bg-emerald-500' },
  Expired:      { label: 'Token expired', badge: 'text-amber-700 bg-amber-50',     dot: 'bg-amber-400'  },
  Disconnected: { label: 'Disconnected',  badge: 'text-gray-500 bg-gray-100',      dot: 'bg-gray-400'   },
};

export function PlatformCard({ brandId, platform, account }: PlatformCardProps) {
  const { disconnectAccount, checkHealth } = useAccountStore();
  const [actionLoading, setActionLoading] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const isConnected = !!account && account.status !== 'Disconnected';
  const status = account ? STATUS_CONFIG[account.status] : null;
  const comingSoon = platform.comingSoon ?? false;
  const hasGuide = !!platform.guideSteps?.length;

  const handleConnect = async () => {
    setConnectError('');
    setActionLoading(true);
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
      setConnectError(err.message ?? 'Failed to connect');
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!account) return;
    setActionLoading(true);
    try {
      await disconnectAccount(brandId, account.id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleHealthCheck = async () => {
    if (!account) return;
    setActionLoading(true);
    try {
      await checkHealth(brandId, account.id);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'bg-white border rounded-xl overflow-hidden shadow-2xs flex flex-col transition-colors',
        comingSoon ? 'border-gray-200 opacity-70' : isConnected ? 'border-emerald-200' : 'border-gray-200'
      )}
    >
      {/* Top colour strip */}
      <div className={cn('h-1.5 w-full', platform.color)} />

      <div className="p-3.5 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', platform.color)}>
              {platform.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">{platform.name}</p>
              <p className="text-[11px] text-gray-500">{platform.description}</p>
            </div>
          </div>

          {comingSoon ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 bg-gray-100 text-gray-500">
              Coming Soon
            </span>
          ) : account && status ? (
            <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0', status.badge)}>
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', status.dot)} />
              {status.label}
            </span>
          ) : null}
        </div>

        {/* Connected account info */}
        {account && account.status !== 'Disconnected' && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
            <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0', platform.color)}>
              {platform.name[0]}
            </div>
            <p className="text-xs font-semibold text-gray-800 truncate flex-1">
              {account.platformHandle}
            </p>
            {account.status === 'Expired' && (
              <AlertTriangle size={12} className="text-amber-500 shrink-0" />
            )}
            <button
              onClick={handleHealthCheck}
              disabled={actionLoading}
              title="Check connection health"
              className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={12} className={actionLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}

        {/* Connect error */}
        {connectError && (
          <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
            {connectError}
          </p>
        )}

        {/* Action button */}
        {comingSoon ? (
          <button
            disabled
            className="w-full h-8 text-xs font-semibold bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            Coming Soon
          </button>
        ) : isConnected ? (
          <button
            onClick={handleDisconnect}
            disabled={actionLoading}
            className="w-full h-8 text-xs font-semibold btn-clay-secondary text-gray-600 hover:text-red-600 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            {actionLoading
              ? <><Loader2 size={12} className="animate-spin" /> Disconnecting…</>
              : <><Unlink size={12} /> Disconnect</>
            }
          </button>
        ) : (
          <button
            onClick={() => (hasGuide ? setShowGuide(true) : handleConnect())}
            disabled={actionLoading}
            className="w-full h-8 text-xs font-semibold btn-clay-primary flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {actionLoading
              ? <><Loader2 size={12} className="animate-spin" /> Redirecting…</>
              : account?.status === 'Disconnected' ? `Reconnect ${platform.name}` : `Connect ${platform.name}`
            }
          </button>
        )}
      </div>

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
