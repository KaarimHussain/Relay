import Link from 'next/link';
import { PlatformCard } from '@/components/accounts/PlatformCard';
import { PLATFORMS } from '@/components/accounts/platforms';

export default function OnboardingAccountsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4 bg-[#F8F9FA]">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-base">
          L
        </div>
        <span className="text-lg font-bold text-gray-900 tracking-tight">Lapizly</span>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-1.5 opacity-60">
          <div className="w-5.5 h-5.5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">✓</div>
          <span className="text-xs font-semibold text-indigo-600">Brand created</span>
        </div>
        <div className="w-8 h-px bg-indigo-300" />
        <div className="flex items-center gap-1.5">
          <div className="w-5.5 h-5.5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">2</div>
          <span className="text-xs font-semibold text-indigo-600">Connect accounts</span>
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
          {PLATFORMS.map((platform) => (
            <PlatformCard key={platform.id} platform={platform} compact />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-100">
          <Link
            href="/onboarding"
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
