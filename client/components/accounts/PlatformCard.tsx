'use client';

import { useState } from 'react';
import { Check, ExternalLink, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlatformDef {
  id: string;
  name: string;
  handle?: string;
  description: string;
  color: string;
  textColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

interface PlatformCardProps {
  platform: PlatformDef;
  compact?: boolean;
}

export function PlatformCard({ platform, compact = false }: PlatformCardProps) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setConnected(true);
    setLoading(false);
  };

  const handleDisconnect = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    setConnected(false);
    setLoading(false);
  };

  if (compact) {
    return (
      <div
        className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between shadow-2xs"
      >
        <div className="flex items-center gap-2.5">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', platform.color)}>
            {platform.icon}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">{platform.name}</p>
            <p className="text-[11px] text-gray-500">{connected && platform.handle ? platform.handle : platform.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {connected && (
            <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              <Check size={10} strokeWidth={2.5} className="mr-0.5" /> Connected
            </span>
          )}
          <button
            onClick={connected ? handleDisconnect : handleConnect}
            disabled={loading}
            className={cn(
              'h-7 px-2.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-50',
              connected
                ? 'btn-clay-secondary text-gray-600 hover:text-red-600'
                : 'btn-clay-primary text-white'
            )}
          >
            {loading ? '...' : connected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs flex flex-col',
        connected ? 'border-emerald-300' : ''
      )}
    >
      <div className={cn('h-1.5 w-full', platform.color)} />

      <div className="p-3.5 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', platform.color)}>
              {platform.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">{platform.name}</p>
              <p className="text-[11px] text-gray-500">{platform.description}</p>
            </div>
          </div>
          {connected && (
            <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              <Check size={10} strokeWidth={2.5} className="mr-0.5" /> Connected
            </span>
          )}
        </div>

        {connected && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
            <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0', platform.color)}>
              {platform.name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{platform.handle ?? '@relay_brand'}</p>
            </div>
            <ExternalLink size={12} className="shrink-0 text-gray-400 ml-auto" />
          </div>
        )}

        <button
          onClick={connected ? handleDisconnect : handleConnect}
          disabled={loading}
          className={cn(
            'w-full h-8 text-xs font-semibold transition-all disabled:opacity-50',
            connected
              ? 'btn-clay-secondary text-gray-600 hover:text-red-600 flex items-center justify-center gap-1'
              : 'btn-clay-primary text-white'
          )}
        >
          {loading ? (
            <span className="opacity-70">Connecting…</span>
          ) : connected ? (
            <>
              <Unlink size={12} /> Disconnect
            </>
          ) : (
            `Connect ${platform.name}`
          )}
        </button>
      </div>
    </div>
  );
}
