import { PlatformCard } from '@/components/accounts/PlatformCard';
import { PLATFORMS } from '@/components/accounts/platforms';
import { Link2 } from 'lucide-react';

export default function AccountsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Connected Accounts</h1>
          <p className="text-[14px] text-gray-500 mt-0.5">
            Manage the social accounts linked to your active brand.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
        <Link2 size={15} className="text-indigo-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-[13px] font-medium text-indigo-700">
            Accounts are scoped to your active brand
          </p>
          <p className="text-[12px] text-indigo-500 mt-0.5">
            Switch brands from the sidebar to manage accounts for a different workspace.
          </p>
        </div>
      </div>

      {/* Platform grid */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Available platforms
        </p>
        <div className="grid grid-cols-3 gap-4">
          {PLATFORMS.map((platform) => (
            <PlatformCard key={platform.id} platform={platform} />
          ))}
        </div>
      </div>
    </div>
  );
}
