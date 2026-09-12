import { SettingsView } from '@/components/settings/SettingsView';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-600">Workspace controls</p>
        <h1 className="mt-1 text-[22px] font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-[14px] text-gray-500 mt-0.5">
          Manage your profile, brand, notifications, and billing.
        </p>
      </div>

      <SettingsView />
    </div>
  );
}
