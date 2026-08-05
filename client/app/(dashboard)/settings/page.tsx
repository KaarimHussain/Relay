import { SettingsView } from '@/components/settings/SettingsView';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-[14px] text-gray-500 mt-0.5">
          Manage your profile, brand, notifications, and billing.
        </p>
      </div>

      <SettingsView />
    </div>
  );
}
