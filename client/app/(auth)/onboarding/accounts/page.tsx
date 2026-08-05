import Link from 'next/link';
import { PLATFORMS } from '@/components/accounts/platforms';

export default function OnboardingAccountsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4 bg-[#F8F9FA]">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-6">
        <svg width="30" height="30" viewBox="0 0 256 256" fill="none">
          <path d="M 128 256 L 64 256 L 64 192 L 128 192 Z M 256 256 L 192 256 L 192 192 L 256 192 Z M 64 192 L 0 192 L 0 128 L 64 128 Z M 192 192 L 128 192 L 128 128 L 192 128 Z M 128 128 L 64 128 L 64 64 L 128 64 Z M 256 128 L 192 128 L 192 64 L 256 64 Z M 64 64 L 0 64 L 0 0 L 64 0 Z M 192 64 L 128 64 L 128 0 L 192 0 Z" fill="#1A1A1A"/>
        </svg>
        <span className="text-lg font-bold text-gray-900 tracking-tight">Relay</span>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-1.5 opacity-60">
          <div className="w-5.5 h-5.5 rounded-full bg-orange-600 flex items-center justify-center text-white text-[11px] font-bold">✓</div>
          <span className="text-xs font-semibold text-orange-600">Brand created</span>
        </div>
        <div className="w-8 h-px bg-orange-300" />
        <div className="flex items-center gap-1.5">
          <div className="w-5.5 h-5.5 rounded-full bg-orange-600 flex items-center justify-center text-white text-[11px] font-bold">2</div>
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
          {PLATFORMS.map((platform) => (
            <div key={platform.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 bg-gray-50">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${platform.color}`}>
                {platform.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">{platform.name}</p>
                <p className="text-[11px] text-gray-500">{platform.description}</p>
              </div>
            </div>
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
