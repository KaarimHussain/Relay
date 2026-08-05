'use client';

import { useEffect } from 'react';
import { Link2, AlertCircle, Loader2 } from 'lucide-react';
import { PlatformCard } from '@/components/accounts/PlatformCard';
import { PLATFORMS } from '@/components/accounts/platforms';
import { useBrandStore } from '@/store/brand';
import { useAccountStore } from '@/store/account';

export default function AccountsPage() {
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const { accounts, status, error, fetchAccounts } = useAccountStore();

  useEffect(() => {
    if (activeBrand?.id) fetchAccounts(activeBrand.id);
  }, [activeBrand?.id, fetchAccounts]);

  const platformsWithAccounts = PLATFORMS.map((p) => ({
    platform: p,
    // prefer Active/Expired over Disconnected so the card shows reconnect state
    account:
      accounts.find((a) => a.platform === p.platform && a.status !== 'Disconnected') ??
      accounts.find((a) => a.platform === p.platform),
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-[22px] font-bold text-gray-900 tracking-tight">
            Connected Accounts
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage the social accounts linked to{' '}
            <span className="font-semibold text-gray-700">{activeBrand?.name ?? 'your brand'}</span>.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3.5 bg-orange-50 border border-orange-100 rounded-xl">
        <Link2 size={15} className="text-orange-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-[13px] font-medium text-orange-700">
            Accounts are scoped to your active brand
          </p>
          <p className="text-[12px] text-orange-500 mt-0.5">
            Switch brands from the sidebar to manage accounts for a different workspace.
          </p>
        </div>
      </div>

      {/* No brand */}
      {!activeBrand && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <p className="text-sm font-medium text-gray-500">No brand selected</p>
          <p className="text-xs text-gray-400">Create or select a brand from the sidebar first.</p>
        </div>
      )}

      {/* Loading */}
      {activeBrand && status === 'loading' && (
        <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading accounts…</span>
        </div>
      )}

      {/* Error */}
      {activeBrand && status === 'error' && (
        <div className="flex items-center gap-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={15} className="text-red-500 shrink-0" />
          <p className="text-[13px] text-red-700 font-medium flex-1">{error}</p>
          <button
            onClick={() => fetchAccounts(activeBrand.id)}
            className="text-xs font-semibold text-red-600 hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Platform grid */}
      {activeBrand && (status === 'ready' || status === 'idle') && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Available platforms
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {platformsWithAccounts.map(({ platform, account }) => (
              <PlatformCard
                key={platform.id}
                brandId={activeBrand.id}
                platform={platform}
                account={account}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
