'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Hash, Music2, TrendingUp, ArrowUpRight, Copy,
  Sparkles, Info, Flame, RefreshCw, Loader2, Link2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useBrandStore } from '@/store/brand';
import { api, ApiError } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type TrendPlatform = 'Instagram' | 'TikTok' | 'X' | 'LinkedIn';

interface HashtagTrend {
  tag: string;
  platform: string;
  category: string;
  posts: number;
  growthPct: number;
  heat: 'hot' | 'rising' | 'steady';
  updatedAt?: string;
  isLive?: boolean;
}

interface AudioTrend {
  title: string;
  artist: string;
  platform: TrendPlatform;
  uses: number;
  growthPct: number;
  heat: 'hot' | 'rising' | 'steady';
}

// ─── Sample audio (no official API available for trending audio) ───────────

const SAMPLE_AUDIO: AudioTrend[] = [
  { title: 'Golden Hour (sped up)',        artist: 'JVKE',              platform: 'TikTok',    uses: 412_000, growthPct: 88,  heat: 'hot' },
  { title: 'Paint The Town Red',           artist: 'Doja Cat',          platform: 'Instagram', uses: 268_000, growthPct: 21,  heat: 'steady' },
  { title: 'Original sound — cozy vlog',   artist: 'creator audio',     platform: 'TikTok',    uses: 154_000, growthPct: 156, heat: 'hot' },
  { title: 'Espresso',                     artist: 'Sabrina Carpenter', platform: 'Instagram', uses: 601_000, growthPct: 6,   heat: 'steady' },
  { title: 'Lo-fi study beat',             artist: 'chillhop',          platform: 'TikTok',    uses: 89_300,  growthPct: 43,  heat: 'rising' },
];

// ─── Platform brand config ────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, {
  dot: string;
  dotStyle?: React.CSSProperties;
  label: string;
  chip: string;
  border: string;
}> = {
  Instagram: {
    dot: '',
    dotStyle: { background: 'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)' },
    label: 'text-pink-600',
    chip:  'bg-pink-50 border-pink-100',
    border: 'border-l-[3px] border-l-pink-400',
  },
  TikTok: {
    dot: 'bg-black',
    label: 'text-gray-900',
    chip:  'bg-gray-100 border-gray-200',
    border: 'border-l-[3px] border-l-gray-900',
  },
  X: {
    dot: 'bg-gray-950',
    label: 'text-gray-800',
    chip:  'bg-gray-100 border-gray-200',
    border: 'border-l-[3px] border-l-gray-700',
  },
  LinkedIn: {
    dot: 'bg-[#0A66C2]',
    label: 'text-[#0A66C2]',
    chip:  'bg-blue-50 border-blue-100',
    border: 'border-l-[3px] border-l-[#0A66C2]',
  },
};

const PLATFORMS_LIST: TrendPlatform[] = ['Instagram', 'TikTok', 'X', 'LinkedIn'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString();
}

function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PlatformDot({ platform }: { platform: string }) {
  const cfg = PLATFORM_CONFIG[platform];
  if (!cfg) return null;
  return (
    <span
      className={cn('w-2.5 h-2.5 rounded-full shrink-0 inline-block', cfg.dot)}
      style={cfg.dotStyle}
    />
  );
}

function PlatformChip({ platform, category }: { platform: string; category: string }) {
  const cfg = PLATFORM_CONFIG[platform];
  if (!cfg) return <span className="text-[11px] text-gray-400">{platform} · {category}</span>;
  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10.5px] font-semibold w-fit', cfg.chip)}>
      <PlatformDot platform={platform} />
      <span className={cfg.label}>{platform}</span>
      <span className="text-gray-400">·</span>
      <span className="text-gray-500">{category}</span>
    </div>
  );
}

function HeatBadge({ heat }: { heat: 'hot' | 'rising' | 'steady' }) {
  if (heat === 'hot') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100">
      <Flame size={10} /> Hot
    </span>
  );
  if (heat === 'rising') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">
      <ArrowUpRight size={10} /> Rising
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
      Steady
    </span>
  );
}

// ─── TrendsView ───────────────────────────────────────────────────────────────

export function TrendsView() {
  const { toast } = useToast();
  const activeBrand = useBrandStore((s) => s.activeBrand());

  const [tab, setTab] = useState<'hashtags' | 'audio'>('hashtags');
  const [platform, setPlatform] = useState<TrendPlatform | 'all'>('all');

  const [hashtags, setHashtags] = useState<HashtagTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [noAccount, setNoAccount] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  // Fetch cached hashtag trends from the backend
  const fetchHashtags = useCallback(async () => {
    if (!activeBrand) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get<HashtagTrend[]>(
        `/brands/${activeBrand.id}/trends/hashtags`,
      );
      setHashtags(data);
      if (data.length > 0 && data[0].updatedAt) {
        setLastRefreshed(data[0].updatedAt);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load trends');
    } finally {
      setLoading(false);
    }
  }, [activeBrand?.id]);

  useEffect(() => { fetchHashtags(); }, [fetchHashtags]);

  // Trigger a fresh pull from Instagram's hashtag API
  const handleRefresh = async () => {
    if (!activeBrand || refreshing) return;
    setRefreshing(true);
    setError('');
    setNoAccount(false);
    try {
      const res = await api.post<{ refreshed: number; errors: string[]; platform: string | null }>(
        `/brands/${activeBrand.id}/trends/refresh`, {}
      );
      if (res.platform === null) {
        setNoAccount(true);
      } else {
        toast(
          `Refreshed ${res.refreshed} hashtag trend${res.refreshed !== 1 ? 's' : ''} from ${res.platform}.` +
          (res.errors.length ? ` ${res.errors.length} error(s).` : ''),
          res.errors.length ? 'error' : 'success',
        );
        await fetchHashtags();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const filteredHashtags = useMemo(
    () => platform === 'all' ? hashtags : hashtags.filter(h => h.platform === platform),
    [hashtags, platform],
  );

  const filteredAudio = useMemo(
    () => platform === 'all' ? SAMPLE_AUDIO : SAMPLE_AUDIO.filter(a => a.platform === platform),
    [platform],
  );

  const copyTag = async (tag: string) => {
    try {
      await navigator.clipboard.writeText(tag);
      toast(`Copied ${tag} — paste it into your caption`, 'success');
    } catch {
      toast('Could not copy — your browser blocked clipboard access', 'error');
    }
  };

  const copyAudio = async (title: string, artist: string) => {
    try {
      await navigator.clipboard.writeText(`${title} — ${artist}`);
      toast('Copied track name — search for it when picking audio', 'success');
    } catch {
      toast('Could not copy — your browser blocked clipboard access', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Tab + controls */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Tab switcher */}
          <div className="flex gap-0.5 p-1 bg-gray-100/80 rounded-xl w-fit border border-gray-200/60">
            {([
              { key: 'hashtags', label: 'Hashtags', icon: Hash },
              { key: 'audio',    label: 'Audio',    icon: Music2 },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'h-7 px-3.5 text-xs font-semibold rounded-lg transition-all inline-flex items-center gap-1.5',
                  tab === key
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>

          {/* Refresh + last updated */}
          <div className="flex items-center gap-2">
            {lastRefreshed && !loading && (
              <span className="text-[11px] text-gray-400">
                Updated {relativeTime(lastRefreshed)}
              </span>
            )}
            {loading && (
              <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" /> Loading…
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="btn-clay-secondary h-8 px-3 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Platform pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', ...PLATFORMS_LIST] as const).map((p) => {
            const isActive = p === 'all' ? platform === 'all' : platform === p;
            const cfg = p !== 'all' ? PLATFORM_CONFIG[p] : null;
            return (
              <button
                key={p}
                onClick={() => setPlatform(p as TrendPlatform | 'all')}
                className={cn(
                  'h-7 px-2.5 text-[11px] font-semibold rounded-lg transition-all inline-flex items-center gap-1.5 shrink-0 border',
                  isActive
                    ? 'bg-gray-900 border-gray-900 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800'
                )}
              >
                {p !== 'all' && (
                  <span
                    className={cn('w-2 h-2 rounded-full inline-block', cfg?.dot)}
                    style={isActive ? undefined : cfg?.dotStyle}
                  />
                )}
                {p === 'all' ? 'All platforms' : p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={13} className="text-red-500 shrink-0" />
          <p className="text-xs font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* No IG account connected */}
      {noAccount && (
        <div className="flex items-start gap-3 px-4 py-4 bg-orange-50 border border-orange-100 rounded-xl">
          <Link2 size={16} className="text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Connect an Instagram account first</p>
            <p className="text-[12px] text-orange-700 mt-0.5 leading-relaxed">
              Live hashtag trends are fetched from Instagram's Graph API using your connected business account.
              Head to <span className="font-semibold">Connected Accounts</span> and link your Instagram Page to unlock this.
            </p>
          </div>
        </div>
      )}

      {/* Audio sample notice */}
      {tab === 'audio' && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-orange-50 border border-orange-100 rounded-xl">
          <Info size={14} className="text-orange-500 mt-0.5 shrink-0" />
          <p className="text-[12.5px] text-orange-700 leading-relaxed">
            <span className="font-semibold">Sample data:</span> No platform currently offers a public API for trending audio.
            These tracks are illustrative — check TikTok's Discover page or Instagram's Reels tab for live audio trends.
          </p>
        </div>
      )}

      {/* Hashtags grid */}
      {tab === 'hashtags' && (
        <>
          {/* Empty state — no data yet */}
          {!loading && hashtags.length === 0 && !error && !noAccount && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <Hash size={24} className="text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">No trend data yet</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Click <span className="font-semibold">Refresh</span> to pull live hashtag data from your connected Instagram account.
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn-clay-primary h-8 px-4 text-xs inline-flex items-center gap-1.5"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                Pull live data
              </button>
            </div>
          )}

          {/* Grid */}
          {hashtags.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredHashtags.length === 0 ? (
                <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-2 text-center">
                  <Hash size={24} className="text-gray-200" />
                  <p className="text-sm font-semibold text-gray-500">No {platform} hashtags in the current data</p>
                  <p className="text-xs text-gray-400">Only Instagram hashtags are currently fetched live. Other platforms coming soon.</p>
                </div>
              ) : (
                filteredHashtags.map((h) => {
                  const cfg = PLATFORM_CONFIG[h.platform] ?? PLATFORM_CONFIG.Instagram;
                  return (
                    <div
                      key={h.tag}
                      className={cn(
                        'bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs hover:shadow-sm transition-all',
                        cfg.border,
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[15px] font-bold text-gray-900 truncate leading-snug">{h.tag}</p>
                        <HeatBadge heat={h.heat} />
                      </div>

                      <PlatformChip platform={h.platform} category={h.category} />

                      {/* Stats */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-none tabular-nums">{fmtCount(h.posts)}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {h.platform === 'LinkedIn' ? 'followers' : 'engagement'}
                          </p>
                        </div>
                        <div className="text-right">
                          {h.growthPct !== 0 ? (
                            <>
                              <p className="text-sm font-bold text-emerald-600 leading-none flex items-center gap-0.5 justify-end tabular-nums">
                                <TrendingUp size={12} /> +{h.growthPct}%
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">vs previous</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-gray-400 leading-none">—</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">first reading</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => copyTag(h.tag)}
                          className="btn-clay-secondary flex-1 h-8 text-xs inline-flex items-center justify-center gap-1.5"
                        >
                          <Copy size={12} /> Copy hashtag
                        </button>
                        {h.updatedAt && (
                          <span className="text-[10px] text-gray-400 shrink-0">{relativeTime(h.updatedAt)}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* Audio list */}
      {tab === 'audio' && (
        <div className="flex flex-col gap-2">
          {filteredAudio.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <Music2 size={24} className="text-gray-200" />
              <p className="text-sm font-semibold text-gray-500">No audio samples for this platform</p>
            </div>
          ) : (
            filteredAudio.map((a) => {
              const cfg = PLATFORM_CONFIG[a.platform] ?? PLATFORM_CONFIG.Instagram;
              return (
                <div
                  key={a.title}
                  className={cn(
                    'bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs hover:shadow-sm transition-all',
                    cfg.border,
                  )}
                >
                  <div
                    className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white', cfg.dot)}
                    style={cfg.dotStyle}
                  >
                    <Music2 size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-900 truncate">{a.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-gray-400 truncate">{a.artist}</span>
                      <span className="text-gray-300">·</span>
                      <span className={cn('text-[11px] font-semibold', cfg.label)}>{a.platform}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold text-gray-900 tabular-nums">{fmtCount(a.uses)}</p>
                    <p className="text-[10px] text-gray-400">uses</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] font-bold text-emerald-600 flex items-center gap-0.5 justify-end tabular-nums">
                      <TrendingUp size={11} /> +{a.growthPct}%
                    </p>
                    <p className="text-[10px] text-gray-400">vs last week</p>
                  </div>
                  <HeatBadge heat={a.heat} />
                  <button
                    onClick={() => copyAudio(a.title, a.artist)}
                    title="Copy track name"
                    className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 text-[11px] text-gray-400 pt-1">
        <Sparkles size={12} className="text-orange-400" />
        Hashtag data is pulled from Instagram and LinkedIn daily. Instagram shows top-post engagement; LinkedIn shows hashtag follower growth. Nothing here posts automatically.
      </div>
    </div>
  );
}
