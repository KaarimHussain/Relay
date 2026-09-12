'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Loader2, LogOut, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useBrandStore } from '@/store/brand';
import { useAuthStore } from '@/store/auth';

const PLATFORMS = ['LinkedIn', 'Instagram', 'Facebook', 'X', 'TikTok'];
const VOICES = ['Friendly & conversational', 'Professional & clear', 'Bold & energetic', 'Warm & educational'];

export default function OnboardingPreferencesPage() {
  const router = useRouter();
  const activeBrand = useBrandStore((state) => state.activeBrand());
  const { fetchBrands, status } = useBrandStore();
  const logout = useAuthStore((state) => state.logout);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [voiceTone, setVoiceTone] = useState('');
  const [postingCadence, setPostingCadence] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'idle') void fetchBrands();
  }, [fetchBrands, status]);

  const togglePlatform = (platform: string) => {
    setPlatforms((current) => current.includes(platform)
      ? current.filter((item) => item !== platform)
      : [...current, platform]);
  };

  const continueToAccounts = async () => {
    if (!activeBrand || saving) return;
    setSaving(true);
    setError('');
    try {
      await Promise.all([
        api.patch(`/brands/${activeBrand.id}`, { voiceTone: voiceTone || undefined }),
        api.patch(`/brands/${activeBrand.id}/agent-memory`, {
          preferredPlatforms: platforms,
          preferredPostingTimes: postingCadence,
        }),
      ]);
      await fetchBrands();
      router.push('/onboarding/accounts');
    } catch (err: any) {
      setError(err?.message ?? 'We could not save your preferences. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fb] px-4 py-8 flex flex-col items-center justify-center">
      <div className="mb-6 flex w-full max-w-[520px] items-center justify-between">
        <div className="flex items-center gap-2"><svg width="30" height="30" viewBox="0 0 256 256" fill="none" aria-hidden="true"><path d="M 128 256 L 64 256 L 64 192 L 128 192 Z M 256 256 L 192 256 L 192 192 L 256 192 Z M 64 192 L 0 192 L 0 128 L 64 128 Z M 192 192 L 128 192 L 128 128 L 192 128 Z M 128 128 L 64 128 L 64 64 L 128 64 Z M 256 128 L 192 128 L 192 64 L 256 64 Z M 64 64 L 0 64 L 0 0 L 64 0 Z M 192 64 L 128 64 L 128 0 L 192 0 Z" fill="#1A1A1A" /></svg><span className="text-lg font-bold tracking-tight text-gray-900">Relay</span></div>
        <button type="button" onClick={() => { logout(); router.replace('/login'); }} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-white hover:text-red-600"><LogOut size={13} /> Log out</button>
      </div>

      <div className="mb-5 flex items-center gap-2 text-xs whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-orange-600"><span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-orange-600 text-[11px] font-bold text-white"><Check size={12} /></span><span className="font-semibold">Brand</span></div>
        <div className="h-px w-6 bg-orange-300" />
        <div className="flex items-center gap-1.5 text-orange-600"><span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-orange-600 text-[11px] font-bold text-white">2</span><span className="font-semibold">Preferences</span></div>
        <div className="h-px w-6 bg-gray-200" />
        <div className="flex items-center gap-1.5 text-gray-400"><span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-gray-200 text-[11px] font-bold">3</span><span className="font-medium">Accounts</span></div>
      </div>

      <main className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/40">
        <div className="border-b border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 px-6 py-5">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm"><Sparkles size={17} /></div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Make Relay feel like your brand</h1>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">A few defaults help the agent make useful suggestions from your first post. You can change everything later.</p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <fieldset>
            <legend className="text-xs font-semibold text-gray-800">Where do you plan to post?</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const selected = platforms.includes(platform);
                return <button key={platform} type="button" onClick={() => togglePlatform(platform)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${selected ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-orange-200 hover:bg-orange-50/40'}`}>{selected && <Check size={12} className="mr-1 inline" />}{platform}</button>;
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-semibold text-gray-800">What should your voice sound like?</legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {VOICES.map((voice) => <button key={voice} type="button" onClick={() => setVoiceTone(voice)} className={`rounded-xl border p-3 text-left text-xs font-medium transition-all ${voiceTone === voice ? 'border-orange-500 bg-orange-50 text-orange-800 ring-1 ring-orange-200' : 'border-gray-200 text-gray-600 hover:border-orange-200 hover:bg-gray-50'}`}>{voice}</button>)}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-xs font-semibold text-gray-800">When do you usually post?</span>
            <input value={postingCadence} onChange={(event) => setPostingCadence(event.target.value)} placeholder="e.g. Weekdays around 10:00 AM" className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-orange-500 focus:bg-white" />
          </label>

          {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}
        </div>

        <footer className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-3">
          <Link href="/onboarding" className="text-xs font-semibold text-gray-500 hover:text-gray-800">← Back</Link>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.push('/onboarding/accounts')} className="text-xs font-semibold text-gray-500 hover:text-gray-800">Skip for now</button>
            <button type="button" onClick={() => void continueToAccounts()} disabled={saving || !activeBrand} className="btn-clay-primary inline-flex h-8 items-center gap-1.5 px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50">{saving ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : <>Continue <ArrowRight size={13} /></>}</button>
          </div>
        </footer>
      </main>
    </div>
  );
}
