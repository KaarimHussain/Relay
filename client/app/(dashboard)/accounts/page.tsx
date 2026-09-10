'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Link2, AlertCircle, Loader2, CheckCircle, XCircle,
  Building2, User, Plus, Unlink, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { PLATFORMS } from '@/components/accounts/platforms';
import { PlatformDef } from '@/components/accounts/PlatformCard';
import { ConnectGuideModal } from '@/components/accounts/ConnectGuideModal';
import { useBrandStore } from '@/store/brand';
import { useAccountStore, SocialAccount } from '@/store/account';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

// ─── LinkedIn Picker modal (unchanged) ───────────────────────────────────────

interface LinkedInOption { id: string; name: string }
interface LinkedInOptions { person: LinkedInOption; orgs: LinkedInOption[] }

function LinkedInPicker() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { fetchAccounts, reset } = useAccountStore();
  const activeBrand = useBrandStore((s) => s.activeBrand());

  const tempId = searchParams.get('linkedin_pending');
  const [options, setOptions] = useState<LinkedInOptions | null>(null);
  const [selections, setSelections] = useState<Set<string>>(new Set(['person']));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!tempId) return;
    api.get<LinkedInOptions>(`/oauth/linkedin/pending?tempId=${tempId}`)
      .then((data) => {
        setOptions(data);
        setSelections(new Set(['person', ...data.orgs.map((o) => o.id)]));
      })
      .catch(() => router.replace('/accounts?error=' + encodeURIComponent('LinkedIn session expired — please connect again')));
  }, [tempId, router]);

  const toggle = (id: string) => setSelections((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleConfirm = async () => {
    if (!tempId || selections.size === 0) return;
    setSubmitting(true); setSubmitError('');
    try {
      await api.post('/oauth/linkedin/finalize', { tempId, selections: [...selections] });
      if (activeBrand?.id) { reset(); fetchAccounts(activeBrand.id); }
      router.replace('/accounts?connected=LinkedIn');
    } catch (err: any) {
      setSubmitError(err.message ?? 'Failed to connect — please try again');
      setSubmitting(false);
    }
  };

  if (!tempId || !options) return null;
  const count = selections.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-[440px] bg-white rounded-xl border border-gray-200 shadow-xl">
        <div className="flex items-start gap-3 p-5 pb-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-gray-900">Choose LinkedIn accounts</h2>
            <p className="text-xs text-gray-500 mt-0.5">Select which accounts to connect to Relay.</p>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-2">
          {submitError && <p className="text-xs text-red-600 font-medium mb-1">{submitError}</p>}

          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
            <input type="checkbox" checked={selections.has('person')} onChange={() => toggle('person')} className="w-4 h-4 accent-blue-600 shrink-0" />
            <User size={15} className="text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{options.person.name}</p>
              <p className="text-xs text-gray-400">Personal profile</p>
            </div>
          </label>

          {options.orgs.map((org) => (
            <label key={org.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="checkbox" checked={selections.has(org.id)} onChange={() => toggle(org.id)} className="w-4 h-4 accent-blue-600 shrink-0" />
              <Building2 size={15} className="text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{org.name}</p>
                <p className="text-xs text-gray-400">Company page</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl">
          <button onClick={() => router.replace('/accounts')} className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors">Cancel</button>
          <button onClick={handleConfirm} disabled={count === 0 || submitting}
            className="btn-clay-primary h-9 px-4 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
            {submitting ? <><Loader2 size={12} className="animate-spin" /> Connecting…</> : `Connect ${count} account${count !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── OAuth result banner ──────────────────────────────────────────────────────

function OAuthResultBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { fetchAccounts, reset } = useAccountStore();
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const handledRef = useRef(false);

  const connected = searchParams.get('connected');
  const error = searchParams.get('error');
  const linkedinPending = searchParams.get('linkedin_pending');

  useEffect(() => {
    if (handledRef.current || (!connected && !error)) return;
    handledRef.current = true;
    if (connected && activeBrand?.id) { reset(); fetchAccounts(activeBrand.id); }
    const timer = setTimeout(() => router.replace('/accounts'), 4000);
    return () => clearTimeout(timer);
  }, [connected, error, activeBrand?.id, fetchAccounts, router]);

  if (linkedinPending || (!connected && !error)) return null;

  if (error) return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl">
      <XCircle size={15} className="text-red-500 shrink-0" />
      <p className="text-[13px] text-red-700 font-medium flex-1">Connection failed: {decodeURIComponent(error)}</p>
    </div>
  );

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
      <CheckCircle size={15} className="text-emerald-500 shrink-0" />
      <p className="text-[13px] text-emerald-700 font-medium flex-1">{decodeURIComponent(connected!)} connected successfully!</p>
    </div>
  );
}

// ─── LinkedIn company page modal ──────────────────────────────────────────────

function LinkedInPageModal({ brandId, onClose, onConnected }: { brandId: string; onClose: () => void; onConnected: () => void }) {
  const [pageUrl, setPageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    const trimmed = pageUrl.trim();
    if (!trimmed) return;
    setLoading(true); setError('');
    try {
      await api.post(`/brands/${brandId}/accounts/linkedin-page`, { pageIdentifier: trimmed });
      onConnected();
    } catch (err: any) {
      setError(err.message ?? 'Connection failed — please check the URL and try again');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-[440px] bg-white rounded-xl border border-gray-200 shadow-xl">
        <div className="flex items-start gap-3 p-5 pb-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Building2 size={16} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-bold text-gray-900">Connect LinkedIn Company Page</h2>
            <p className="text-xs text-gray-500 mt-0.5">Paste your company page URL — Relay uses your personal LinkedIn token to post on its behalf.</p>
          </div>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company Page URL or slug</label>
            <input type="text" value={pageUrl} onChange={(e) => setPageUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              placeholder="https://www.linkedin.com/company/your-company/"
              className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
            <p className="text-[11px] text-gray-400">e.g. <span className="font-mono">linkedin.com/company/relay-hq</span> or just <span className="font-mono">relay-hq</span></p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 bg-gray-50 border-t border-gray-100 rounded-b-xl">
          <button onClick={onClose} className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors">Cancel</button>
          <button onClick={handleConnect} disabled={!pageUrl.trim() || loading}
            className="btn-clay-primary h-9 px-4 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
            {loading ? <><Loader2 size={12} className="animate-spin" /> Connecting…</> : 'Connect Page'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Platform row ─────────────────────────────────────────────────────────────

function PlatformRow({ brandId, platform, account, onLinkedInPage }: {
  brandId: string;
  platform: PlatformDef;
  account?: SocialAccount;
  onLinkedInPage?: () => void;
}) {
  const { disconnectAccount, checkHealth } = useAccountStore();
  const [busy, setBusy] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const isConnected = !!account && account.status !== 'Disconnected';
  const isExpired = account?.status === 'Expired';
  const comingSoon = platform.comingSoon ?? false;
  const hasGuide = !!platform.guideSteps?.length;

  const handleConnect = async () => {
    setConnectError(''); setBusy(true);
    try {
      const token = localStorage.getItem('relay_token');
      if (!token) throw new Error('Not logged in');
      const res = await fetch(`${API_BASE}/oauth/connect/${platform.platform.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ brandId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as any;
        throw new Error(err.message ?? `Failed (${res.status})`);
      }
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch (e: any) { setConnectError(e.message ?? 'Failed to connect'); setBusy(false); }
  };

  const handleDisconnect = async () => {
    if (!account) return;
    setBusy(true);
    try { await disconnectAccount(brandId, account.id); } finally { setBusy(false); }
  };

  const handleHealth = async () => {
    if (!account) return;
    setBusy(true);
    try { await checkHealth(brandId, account.id); } finally { setBusy(false); }
  };

  return (
    <>
      <div className={cn(
        'group flex items-center gap-3 px-5 py-3.5 transition-colors min-w-0',
        comingSoon ? 'opacity-55' : isConnected ? 'hover:bg-emerald-50/40' : 'hover:bg-gray-50/60',
      )}>
        {/* Platform icon */}
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', platform.color)}>
          {platform.icon}
        </div>

        {/* Name + description */}
        <div className="w-40 shrink-0">
          <p className="text-[13px] font-semibold text-gray-900 leading-tight">{platform.name}</p>
          <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{platform.description}</p>
        </div>

        {/* Connected handle */}
        <div className="flex-1 min-w-0">
          {isConnected && account ? (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full">
              <div className={cn('w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0', platform.color)}>
                {platform.name[0]}
              </div>
              <span className="text-[12px] font-medium text-gray-700 truncate max-w-[180px]">
                {account.platformHandle}
              </span>
              {isExpired && <AlertTriangle size={11} className="text-amber-500 shrink-0" />}
            </div>
          ) : (
            <span className="text-[12px] text-gray-300">—</span>
          )}
        </div>

        {/* Status */}
        <div className="shrink-0">
          {comingSoon ? (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 whitespace-nowrap">Coming soon</span>
          ) : isConnected ? (
            <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
              isExpired ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isExpired ? 'bg-amber-400' : 'bg-emerald-500')} />
              {isExpired ? 'Expired' : 'Connected'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
              Not connected
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0 justify-end">
          {connectError && (
            <span className="text-[11px] text-red-500 truncate max-w-[100px]" title={connectError}>{connectError}</span>
          )}

          {!comingSoon && isConnected && (
            <>
              {onLinkedInPage && (
                <button onClick={onLinkedInPage}
                  className="h-7 px-2.5 text-[11px] font-semibold text-blue-600 border border-blue-100 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 shrink-0">
                  <Plus size={11} /> Company Page
                </button>
              )}
              <button onClick={handleHealth} disabled={busy} title="Refresh status"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40 shrink-0">
                <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
              </button>
              <button onClick={handleDisconnect} disabled={busy}
                className="h-7 px-2.5 text-[11px] font-semibold text-red-500 border border-red-100 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0">
                <Unlink size={11} />
                {busy ? 'Removing…' : 'Disconnect'}
              </button>
            </>
          )}

          {!comingSoon && !isConnected && (
            <button
              onClick={() => hasGuide ? setShowGuide(true) : handleConnect()}
              disabled={busy}
              className="h-7 px-3 text-[11px] font-semibold btn-clay-primary flex items-center gap-1 disabled:opacity-50 shrink-0"
            >
              {busy
                ? <><Loader2 size={11} className="animate-spin" /> Redirecting…</>
                : account?.status === 'Disconnected' ? `Reconnect` : 'Connect'
              }
            </button>
          )}
        </div>
      </div>

      {hasGuide && (
        <ConnectGuideModal open={showGuide} platform={platform}
          onClose={() => setShowGuide(false)}
          onContinue={() => { setShowGuide(false); handleConnect(); }} />
      )}
    </>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ label, count, top }: { label: string; count: number; top?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2 px-5 py-2 bg-gray-50/80 border-b border-gray-100', top && 'border-t-0')}>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200/80 text-gray-500">{count}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const { accounts, status, error, fetchAccounts, reset } = useAccountStore();
  const [showLinkedInPageModal, setShowLinkedInPageModal] = useState(false);

  useEffect(() => {
    if (activeBrand?.id) fetchAccounts(activeBrand.id);
  }, [activeBrand?.id, fetchAccounts]);

  const hasLinkedInPersonal = accounts.some(
    (a) => a.platform === 'LinkedIn' && !a.platformUserId?.startsWith('org:') && a.status !== 'Disconnected',
  );

  const platformsWithAccounts = PLATFORMS.map((p) => ({
    platform: p,
    account:
      accounts.find((a) => a.platform === p.platform && a.status !== 'Disconnected') ??
      accounts.find((a) => a.platform === p.platform),
  }));

  const connectedRows = platformsWithAccounts.filter(
    ({ account }) => account && account.status !== 'Disconnected',
  );
  const availableRows = platformsWithAccounts.filter(
    ({ account }) => !account || account.status === 'Disconnected',
  );

  const activeCount = connectedRows.length;
  const totalAvailable = PLATFORMS.filter((p) => !p.comingSoon).length;
  const pct = totalAvailable > 0 ? Math.round((activeCount / totalAvailable) * 100) : 0;

  const isReady = activeBrand && (status === 'ready' || status === 'idle');

  return (
    <div className="flex flex-col gap-5">
      {/* LinkedIn company page modal */}
      {showLinkedInPageModal && activeBrand && (
        <LinkedInPageModal
          brandId={activeBrand.id}
          onClose={() => setShowLinkedInPageModal(false)}
          onConnected={() => {
            setShowLinkedInPageModal(false);
            if (activeBrand?.id) { reset(); fetchAccounts(activeBrand.id); }
          }}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-[22px] font-bold text-gray-900 tracking-tight">Connected Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage social accounts for{' '}
            <span className="font-semibold text-gray-700">{activeBrand?.name ?? 'your brand'}</span>.
          </p>
        </div>

        {isReady && (
          <div className="flex items-center gap-3 shrink-0 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
            <div className="text-right">
              <p className="text-[15px] font-bold text-gray-900 tabular-nums leading-none">{activeCount}<span className="text-gray-300 font-normal"> / {totalAvailable}</span></p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-none">platforms active</p>
            </div>
            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: pct === 100 ? '#10b981' : pct > 0 ? '#f97316' : '#e5e7eb',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* OAuth banners */}
      <Suspense>
        <OAuthResultBanner />
        <LinkedInPicker />
      </Suspense>

      {/* Scope notice */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl">
        <Link2 size={13} className="text-orange-400 shrink-0" />
        <p className="text-[12px] text-orange-600">
          <span className="font-semibold">Accounts are brand-scoped.</span>{' '}
          Switch brands from the sidebar to manage a different workspace.
        </p>
      </div>

      {/* No brand */}
      {!activeBrand && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center bg-white border border-gray-200 rounded-xl">
          <p className="text-sm font-medium text-gray-500">No brand selected</p>
          <p className="text-xs text-gray-400">Create or select a brand from the sidebar first.</p>
        </div>
      )}

      {/* Loading */}
      {activeBrand && status === 'loading' && (
        <div className="flex items-center justify-center py-16 gap-2 text-gray-400 bg-white border border-gray-200 rounded-xl">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading accounts…</span>
        </div>
      )}

      {/* Error */}
      {activeBrand && status === 'error' && (
        <div className="flex items-center gap-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={15} className="text-red-500 shrink-0" />
          <p className="text-[13px] text-red-700 font-medium flex-1">{error}</p>
          <button onClick={() => fetchAccounts(activeBrand.id)} className="text-xs font-semibold text-red-600 hover:underline shrink-0">Retry</button>
        </div>
      )}

      {/* Platform list */}
      {isReady && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

          {/* Connected */}
          {connectedRows.length > 0 && (
            <>
              <SectionLabel label="Connected" count={connectedRows.length} top />
              <div className="divide-y divide-gray-100">
                {connectedRows.map(({ platform, account }) => (
                  <PlatformRow
                    key={platform.id}
                    brandId={activeBrand.id}
                    platform={platform}
                    account={account}
                    onLinkedInPage={
                      platform.platform === 'LinkedIn' && hasLinkedInPersonal
                        ? () => setShowLinkedInPageModal(true)
                        : undefined
                    }
                  />
                ))}
              </div>
            </>
          )}

          {/* Available */}
          {availableRows.length > 0 && (
            <>
              <SectionLabel label="Available" count={availableRows.length} />
              <div className="divide-y divide-gray-100">
                {availableRows.map(({ platform, account }) => (
                  <PlatformRow
                    key={platform.id}
                    brandId={activeBrand.id}
                    platform={platform}
                    account={account}
                  />
                ))}
              </div>
            </>
          )}

          {/* Empty state (all disconnected somehow) */}
          {connectedRows.length === 0 && availableRows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-gray-500">No platforms configured</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
