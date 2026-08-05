'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const BRAND_COLORS = [
  { label: 'Indigo',  bg: 'bg-indigo-500',  hex: '#6366F1' },
  { label: 'Violet',  bg: 'bg-violet-500',  hex: '#8B5CF6' },
  { label: 'Sky',     bg: 'bg-sky-500',     hex: '#0EA5E9' },
  { label: 'Emerald', bg: 'bg-emerald-500', hex: '#10B981' },
  { label: 'Amber',   bg: 'bg-amber-500',   hex: '#F59E0B' },
  { label: 'Rose',    bg: 'bg-rose-500',    hex: '#F43F5E' },
  { label: 'Pink',    bg: 'bg-pink-500',    hex: '#EC4899' },
  { label: 'Slate',   bg: 'bg-slate-500',   hex: '#64748B' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(BRAND_COLORS[0]);

  const initials = name.trim().slice(0, 2).toUpperCase() || '?';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    router.push('/onboarding/accounts');
  };

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
        <div className="flex items-center gap-1.5">
          <div className="w-5.5 h-5.5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">1</div>
          <span className="text-xs font-semibold text-indigo-600">Create brand</span>
        </div>
        <div className="w-8 h-px bg-gray-200" />
        <div className="flex items-center gap-1.5 opacity-50">
          <div className="w-5.5 h-5.5 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-[11px] font-bold">2</div>
          <span className="text-xs font-medium text-gray-500">Connect accounts</span>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-6 pb-4">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-1">
            Set up your first brand
          </h1>
          <p className="text-xs text-gray-500 font-normal leading-relaxed">
            Create your primary brand workspace to start organizing your social media posts.
          </p>
        </div>

        {/* Avatar preview */}
        <div className="flex justify-center pb-4">
          <div
            className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold tracking-tight shadow-2xs',
              selectedColor.bg
            )}
          >
            {initials}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 pb-5 flex flex-col gap-4">
            {/* Brand name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Brand name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Co., My Agency"
                maxLength={40}
                autoFocus
                className="h-8.5 bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 font-medium outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            {/* Color picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">Brand color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {BRAND_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={cn(
                      'w-7 h-7 rounded-lg transition-transform',
                      c.bg,
                      selectedColor.hex === c.hex
                        ? 'ring-2 ring-offset-2 ring-gray-400 scale-105'
                        : 'hover:scale-105'
                    )}
                    aria-label={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-[11px] text-gray-400 font-medium">Step 1 of 2</p>
            <button
              type="submit"
              disabled={!name.trim()}
              className="btn-clay-primary h-8 px-4 text-xs font-semibold gap-1"
            >
              Continue →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
