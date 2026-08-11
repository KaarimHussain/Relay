'use client';

import { useMemo, useState } from 'react';
import {
  Hash, Music2, TrendingUp, ArrowUpRight, Copy,
  Sparkles, Info, Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

// ─── Mock data ──────────────────────────────────────────────────────────────
// UI preview only — not wired to a live trends feed yet. Numbers are illustrative.

type TrendPlatform = 'Instagram' | 'TikTok' | 'X' | 'LinkedIn';

interface HashtagTrend {
  tag: string;
  platform: TrendPlatform;
  category: string;
  posts: number;
  growthPct: number;
  heat: 'hot' | 'rising' | 'steady';
}

interface AudioTrend {
  title: string;
  artist: string;
  platform: TrendPlatform;
  uses: number;
  growthPct: number;
  heat: 'hot' | 'rising' | 'steady';
}

const HASHTAGS: HashtagTrend[] = [
  { tag: '#SmallBizSaturday', platform: 'Instagram', category: 'Commerce',     posts: 284_000, growthPct: 62, heat: 'hot' },
  { tag: '#BehindTheScenes',  platform: 'TikTok',     category: 'Lifestyle',   posts: 1_200_000, growthPct: 18, heat: 'steady' },
  { tag: '#AITools',          platform: 'X',          category: 'Tech',       posts: 96_400,  growthPct: 134, heat: 'hot' },
  { tag: '#MorningRoutine',   platform: 'Instagram',  category: 'Wellness',   posts: 540_000, growthPct: 24, heat: 'rising' },
  { tag: '#FounderTips',      platform: 'LinkedIn',   category: 'Business',   posts: 41_200,  growthPct: 47, heat: 'rising' },
  { tag: '#OOTD',              platform: 'TikTok',     category: 'Fashion',    posts: 2_800_000, growthPct: 9,  heat: 'steady' },
  { tag: '#ProductLaunch',    platform: 'Instagram',  category: 'Commerce',   posts: 118_000, growthPct: 71, heat: 'hot' },
  { tag: '#RemoteWork',       platform: 'X',          category: 'Business',   posts: 73_900,  growthPct: 15, heat: 'steady' },
];

const AUDIO: AudioTrend[] = [
  { title: 'Golden Hour (sped up)', artist: 'JVKE',        platform: 'TikTok',    uses: 412_000, growthPct: 88, heat: 'hot' },
  { title: 'Paint The Town Red',    artist: 'Doja Cat',    platform: 'Instagram', uses: 268_000, growthPct: 21, heat: 'steady' },
  { title: 'Original sound — cozy vlog', artist: 'creator audio', platform: 'TikTok', uses: 154_000, growthPct: 156, heat: 'hot' },
  { title: 'Espresso',              artist: 'Sabrina Carpenter', platform: 'Instagram', uses: 601_000, growthPct: 6,  heat: 'steady' },
  { title: 'Lo-fi study beat',      artist: 'chillhop',    platform: 'TikTok',    uses: 89_300,  growthPct: 43, heat: 'rising' },
];

const PLATFORM_DOT: Record<TrendPlatform, string> = {
  Instagram: 'bg-gradient-to-br from-pink-500 to-amber-400',
  TikTok:    'bg-gray-950',
  X:         'bg-gray-900',
  LinkedIn:  'bg-blue-700',
};

function fmtCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString();
}

function HeatBadge({ heat }: { heat: 'hot' | 'rising' | 'steady' }) {
  if (heat === 'hot') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100">
        <Flame size={10} /> Hot
      </span>
    );
  }
  if (heat === 'rising') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">
        <ArrowUpRight size={10} /> Rising
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
      Steady
    </span>
  );
}

export function TrendsView() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'hashtags' | 'audio'>('hashtags');
  const [platform, setPlatform] = useState<TrendPlatform | 'all'>('all');

  const filteredHashtags = useMemo(
    () => (platform === 'all' ? HASHTAGS : HASHTAGS.filter(h => h.platform === platform)),
    [platform],
  );
  const filteredAudio = useMemo(
    () => (platform === 'all' ? AUDIO : AUDIO.filter(a => a.platform === platform)),
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
    <div className="flex flex-col gap-4">
      {/* Preview notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-orange-50 border border-orange-100 rounded-xl">
        <Info size={14} className="text-orange-500 mt-0.5 shrink-0" />
        <p className="text-[12.5px] text-orange-700 leading-relaxed">
          <span className="font-semibold">Preview:</span> this is what trend detection will look like once it's connected to a live feed.
          The hashtags and audio below are sample data, not real-time results — Relay never auto-posts using trends, it only surfaces them for you to use.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {([
            { key: 'hashtags', label: 'Hashtags', icon: Hash },
            { key: 'audio', label: 'Audio', icon: Music2 },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'h-7 px-3.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5',
                tab === key ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as TrendPlatform | 'all')}
          className="h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 outline-none focus:border-orange-500"
        >
          <option value="all">All platforms</option>
          <option value="Instagram">Instagram</option>
          <option value="TikTok">TikTok</option>
          <option value="X">X</option>
          <option value="LinkedIn">LinkedIn</option>
        </select>
      </div>

      {/* Hashtags grid */}
      {tab === 'hashtags' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredHashtags.map((h) => (
            <div key={h.tag} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2.5 shadow-2xs hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('w-2 h-2 rounded-full shrink-0', PLATFORM_DOT[h.platform])} />
                  <p className="text-sm font-bold text-gray-900 truncate">{h.tag}</p>
                </div>
                <HeatBadge heat={h.heat} />
              </div>
              <p className="text-[11px] text-gray-400">{h.platform} · {h.category}</p>
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-none">{fmtCount(h.posts)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">posts this week</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600 leading-none flex items-center gap-0.5 justify-end">
                    <TrendingUp size={12} /> +{h.growthPct}%
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">vs last week</p>
                </div>
              </div>
              <button
                onClick={() => copyTag(h.tag)}
                className="btn-clay-secondary h-8 text-xs inline-flex items-center justify-center gap-1.5 mt-1"
              >
                <Copy size={12} /> Copy hashtag
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Audio list */}
      {tab === 'audio' && (
        <div className="flex flex-col gap-2">
          {filteredAudio.map((a) => (
            <div key={a.title} className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs hover:border-gray-300 transition-colors">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white', PLATFORM_DOT[a.platform])}>
                <Music2 size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{a.title}</p>
                <p className="text-[11px] text-gray-400 truncate">{a.artist} · {a.platform}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-gray-900">{fmtCount(a.uses)} uses</p>
                <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 justify-end">
                  <TrendingUp size={10} /> +{a.growthPct}%
                </p>
              </div>
              <HeatBadge heat={a.heat} />
              <button
                onClick={() => copyAudio(a.title, a.artist)}
                title="Copy track name"
                className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              >
                <Copy size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      <div className="flex items-center gap-2 text-[11px] text-gray-400 pt-1">
        <Sparkles size={12} className="text-orange-400" />
        Trends refresh daily once connected to a live feed. Nothing here posts automatically — you choose what to use.
      </div>
    </div>
  );
}
