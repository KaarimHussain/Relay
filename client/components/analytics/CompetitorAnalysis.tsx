'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users, Plus, RefreshCw, Trash2, AlertCircle, Loader2, Info, Swords, X,
  AlertTriangle, RotateCcw, Trophy, Activity, Heart, CalendarClock,
  TrendingUp, TrendingDown, Minus, Crown, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandStore } from '@/store/brand';
import { api, ApiError } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompareRow {
  id?: string;
  handle: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  followerCount: number;
  avgLikes: number;
  avgComments: number;
  postsPerWeek: number;
  engagementRate: number;
  source?: 'Manual' | 'InstagramApi' | 'RapidApi';
  lastSyncedAt?: string | null;
  isSelf?: boolean;
}

interface CompareResponse {
  platform: string;
  scraperReady: boolean;
  self: CompareRow;
  competitors: CompareRow[];
}

interface Decorated extends CompareRow {
  color: string;
  avgEng: number;
}

const PLATFORMS = ['Instagram', 'LinkedIn', 'X', 'Facebook', 'TikTok'] as const;
type Platform = (typeof PLATFORMS)[number];

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#EC4899', LinkedIn: '#2563EB', X: '#111827', Facebook: '#1D4ED8', TikTok: '#000000',
};

// Distinct series colors for competitors (self is always orange).
const SELF_COLOR = '#F97316';
const SERIES = ['#6366F1', '#0EA5E9', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B', '#14B8A6', '#D946EF'];

function fmtBig(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return (n || 0).toLocaleString();
}

function median(vals: number[]): number {
  if (!vals.length) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ─── Metric definitions ─────────────────────────────────────────────────────────

type MetricKey = 'engagementRate' | 'followerCount' | 'avgEng' | 'postsPerWeek';

const METRICS: {
  key: MetricKey;
  label: string;
  short: string;
  icon: typeof Users;
  fmt: (v: number) => string;
}[] = [
  { key: 'engagementRate', label: 'Engagement Rate', short: 'Eng. Rate', icon: Activity, fmt: (v) => `${v.toFixed(2)}%` },
  { key: 'followerCount', label: 'Followers', short: 'Followers', icon: Users, fmt: fmtBig },
  { key: 'avgEng', label: 'Avg Engagement / Post', short: 'Avg Eng.', icon: Heart, fmt: fmtBig },
  { key: 'postsPerWeek', label: 'Posting Cadence', short: 'Posts/Wk', icon: CalendarClock, fmt: (v) => v.toFixed(1) },
];

const metricValue = (r: CompareRow, key: MetricKey): number =>
  key === 'avgEng' ? (r.avgLikes || 0) + (r.avgComments || 0) : (r[key] as number) || 0;

// ─── Delta chip ─────────────────────────────────────────────────────────────────

function Delta({ value, unit = '', invert = false }: { value: number; unit?: string; invert?: boolean }) {
  const good = invert ? value < 0 : value > 0;
  const neutral = Math.abs(value) < (unit === '%' ? 0.05 : 0.5);
  const Icon = neutral ? Minus : value > 0 ? TrendingUp : TrendingDown;
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  const magnitude = unit === '%' ? Math.abs(value).toFixed(1) : fmtBig(Math.abs(value));
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums',
        neutral ? 'text-gray-400' : good ? 'text-emerald-600' : 'text-red-500'
      )}
    >
      <Icon size={10} strokeWidth={2.5} />
      {neutral ? '—' : `${sign}${magnitude}${unit}`}
    </span>
  );
}

// ─── Summary KPI strip ──────────────────────────────────────────────────────────

function SummaryStrip({ rows, self }: { rows: Decorated[]; self: Decorated }) {
  const others = rows.filter((r) => !r.isSelf);
  const avg = (fn: (r: Decorated) => number) =>
    others.length ? others.reduce((s, r) => s + fn(r), 0) / others.length : 0;

  // Rank by engagement rate (1 = best).
  const rankBoard = [...rows].sort((a, b) => b.engagementRate - a.engagementRate);
  const rank = rankBoard.findIndex((r) => r.isSelf) + 1;
  const leader = rankBoard[0];

  const followerLeader = [...rows].sort((a, b) => b.followerCount - a.followerCount)[0];
  const followerGap = self.followerCount - followerLeader.followerCount; // 0 if you lead

  const tiles = [
    {
      icon: Trophy,
      tint: rank === 1 ? 'text-amber-500 bg-amber-50' : 'text-orange-500 bg-orange-50',
      label: 'Your Rank',
      value: `#${rank}`,
      sub: `of ${rows.length} · by engagement`,
      badge: rank === 1 ? 'Leader' : null,
    },
    {
      icon: Activity,
      tint: 'text-pink-500 bg-pink-50',
      label: 'Engagement Rate',
      value: `${self.engagementRate.toFixed(2)}%`,
      delta: { value: self.engagementRate - avg((r) => r.engagementRate), unit: '%' },
      sub: 'vs market avg',
    },
    {
      icon: Users,
      tint: 'text-indigo-500 bg-indigo-50',
      label: followerGap >= 0 ? 'Follower Lead' : 'Gap to Leader',
      value: fmtBig(Math.abs(followerGap)),
      sub: followerGap >= 0 ? 'ahead of field' : `behind @${followerLeader.handle}`,
    },
    {
      icon: Heart,
      tint: 'text-rose-500 bg-rose-50',
      label: 'Avg Engagement',
      value: fmtBig(self.avgEng),
      delta: { value: self.avgEng - avg((r) => r.avgEng), unit: '' },
      sub: 'likes + comments/post',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {tiles.map((t) => (
        <div key={t.label} className="flex flex-col gap-1.5 p-3 bg-white border border-gray-150 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', t.tint)}>
              <t.icon size={14} />
            </div>
            {t.badge && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                <Crown size={9} /> {t.badge}
              </span>
            )}
            {t.delta && <Delta value={t.delta.value} unit={t.delta.unit} />}
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900 tabular-nums leading-none">{t.value}</div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1">{t.label}</div>
            <div className="text-[10px] text-gray-400 mt-0.5 truncate">{t.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Metric leaderboard (switchable horizontal bar chart) ───────────────────────

function Leaderboard({ rows, self }: { rows: Decorated[]; self: Decorated }) {
  const [metric, setMetric] = useState<MetricKey>('engagementRate');
  const def = METRICS.find((m) => m.key === metric)!;

  const ranked = useMemo(
    () => [...rows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric)),
    [rows, metric]
  );
  const max = Math.max(...ranked.map((r) => metricValue(r, metric)), 0.0001);
  const selfVal = metricValue(self, metric);

  return (
    <div className="flex flex-col gap-3 p-3.5 bg-white border border-gray-150 rounded-xl shadow-2xs">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
          <def.icon size={13} className="text-orange-500" /> {def.label} — Leaderboard
        </h4>
        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200/70 rounded-lg p-0.5">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetric(m.key)}
              className={cn(
                'px-2 py-1 text-[10px] font-semibold rounded-md transition-all whitespace-nowrap',
                metric === m.key ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              {m.short}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {ranked.map((r, i) => {
          const val = metricValue(r, metric);
          const pct = Math.min(100, Math.max(2, (val / max) * 100));
          const diff = r.isSelf ? 0 : selfVal - val; // + means you're ahead
          return (
            <div key={r.id || 'self'} className="flex items-center gap-2.5">
              <span className="w-4 text-[10px] font-bold text-gray-400 tabular-nums text-right">{i + 1}</span>
              <div className="w-24 sm:w-32 flex items-center gap-1.5 shrink-0">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: r.color }}
                />
                <span className={cn('text-[11px] truncate', r.isSelf ? 'font-bold text-gray-900' : 'font-medium text-gray-600')}>
                  {r.isSelf ? 'You' : r.displayName || `@${r.handle}`}
                </span>
              </div>
              <div className="flex-1 h-5 bg-gray-100/70 rounded-md overflow-hidden relative">
                <div
                  className="h-full rounded-md transition-all duration-700 ease-out flex items-center"
                  style={{ width: `${pct}%`, backgroundColor: r.color, opacity: r.isSelf ? 1 : 0.85 }}
                />
              </div>
              <span className="w-16 text-right text-[11px] font-bold text-gray-800 tabular-nums shrink-0">
                {def.fmt(val)}
              </span>
              <div className="w-12 text-right shrink-0 hidden sm:block">
                {!r.isSelf && <Delta value={diff} unit={metric === 'engagementRate' ? '%' : ''} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Competitive positioning map (scatter quadrant) ─────────────────────────────

function PositioningMap({ rows }: { rows: Decorated[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const W = 500, H = 320;
  const padL = 52, padR = 24, padT = 30, padB = 44;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const followers = rows.map((r) => Math.max(1, r.followerCount));
  const ers = rows.map((r) => r.engagementRate);
  const engs = rows.map((r) => r.avgEng);

  const logF = followers.map((f) => Math.log10(f));
  const minLog = Math.min(...logF);
  const maxLog = Math.max(...logF, minLog + 0.3);
  const maxEr = Math.max(...ers, 0.5) * 1.15;
  const maxEng = Math.max(...engs, 1);

  const medLogF = median(logF);
  const medEr = median(ers);

  const xOf = (f: number) => padL + ((Math.log10(Math.max(1, f)) - minLog) / (maxLog - minLog || 1)) * plotW;
  const yOf = (er: number) => padT + plotH - (er / maxEr) * plotH;
  const rOf = (e: number) => Math.max(8, 6 + Math.sqrt(e / maxEng) * 14);

  const medX = xOf(Math.pow(10, medLogF));
  const medY = yOf(medEr);

  const hoveredRow = rows.find((r) => (r.id || 'self') === hovered) ?? null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // Place label away from quadrant corner labels and other bubbles
  const getLabelProps = (cx: number, cy: number, rad: number) => {
    const nearRight = cx > padL + plotW * 0.58;
    const nearTop   = cy < padT + plotH * 0.38;
    return {
      textAnchor: nearRight ? 'end' : 'start',
      dx: nearRight ? -(rad + 6) : (rad + 6),
      dy: nearTop   ? (rad + 13) : -(rad + 6),
    } as const;
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 bg-white border border-gray-150 rounded-xl shadow-2xs">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
          <Target size={13} className="text-orange-500" /> Competitive Positioning
        </h4>
        <span className="text-[10px] text-gray-400">Bubble size = avg engagement/post · hover for details</span>
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-x-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[380px]" style={{ height: 'auto', display: 'block' }}>
          {/* Quadrant fills */}
          <rect x={medX}  y={padT}  width={W - padR - medX} height={medY - padT}          fill="#F0FDF4" rx="4" />
          <rect x={padL}  y={padT}  width={medX - padL}      height={medY - padT}          fill="#FEFCE8" rx="4" />
          <rect x={padL}  y={medY}  width={medX - padL}      height={padT + plotH - medY}  fill="#F9FAFB" />
          <rect x={medX}  y={medY}  width={W - padR - medX}  height={padT + plotH - medY}  fill="#F9FAFB" />

          {/* Border frame */}
          <rect x={padL} y={padT} width={plotW} height={plotH} fill="none" stroke="#E5E7EB" strokeWidth="1" rx="6" />

          {/* Median dividers */}
          <line x1={medX} y1={padT} x2={medX} y2={padT + plotH} stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 3" />
          <line x1={padL} y1={medY} x2={padL + plotW} y2={medY}  stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 3" />

          {/* Quadrant label pills — fixed to corners so they never overlap bubbles */}
          <rect x={padL + plotW - 60} y={padT + 8}           width={54} height={14} rx="7" fill="#BBF7D0" />
          <text x={padL + plotW - 33} y={padT + 18}           textAnchor="middle" fill="#15803D" fontSize="8" fontWeight="800" letterSpacing="0.4">LEADERS</text>

          <rect x={padL + 8}          y={padT + 8}           width={82} height={14} rx="7" fill="#FEF08A" />
          <text x={padL + 49}         y={padT + 18}           textAnchor="middle" fill="#A16207" fontSize="8" fontWeight="800" letterSpacing="0.4">NICHE &amp; ENGAGING</text>

          <rect x={padL + 8}          y={padT + plotH - 22}  width={52} height={14} rx="7" fill="#E5E7EB" />
          <text x={padL + 34}         y={padT + plotH - 12}  textAnchor="middle" fill="#6B7280" fontSize="8" fontWeight="700" letterSpacing="0.4">EMERGING</text>

          <rect x={padL + plotW - 66} y={padT + plotH - 22}  width={60} height={14} rx="7" fill="#E5E7EB" />
          <text x={padL + plotW - 36} y={padT + plotH - 12}  textAnchor="middle" fill="#6B7280" fontSize="8" fontWeight="700" letterSpacing="0.4">BIG &amp; QUIET</text>

          {/* Axis titles */}
          <text x={padL + plotW / 2} y={H - 6}  textAnchor="middle" fill="#9CA3AF" fontSize="9.5" fontWeight="600">Followers (log scale) →</text>
          <text x={14} y={padT + plotH / 2} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#9CA3AF" transform={`rotate(-90 14 ${padT + plotH / 2})`}>Engagement Rate →</text>

          {/* Bubbles — non-hovered first so hovered renders on top */}
          {[...rows].sort((a) => (a.id || 'self') === hovered ? 1 : -1).map((r) => {
            const id    = r.id || 'self';
            const cx    = xOf(r.followerCount);
            const cy    = yOf(r.engagementRate);
            const rad   = rOf(r.avgEng);
            const isHov = hovered === id;
            const dimmed = hovered !== null && !isHov;
            const { textAnchor, dx, dy } = getLabelProps(cx, cy, rad);
            const label = r.isSelf ? 'You' : `@${r.handle}`.slice(0, 11);

            return (
              <g key={id} onMouseEnter={() => setHovered(id)} style={{ cursor: 'crosshair' }}>
                {r.isSelf && (
                  <circle cx={cx} cy={cy} r={rad + 5} fill="none"
                    stroke={SELF_COLOR} strokeWidth="1.5" strokeDasharray="3 2"
                    opacity={dimmed ? 0.12 : 0.55}
                  />
                )}
                <circle
                  cx={cx} cy={cy}
                  r={isHov ? rad * 1.15 : rad}
                  fill={r.color}
                  fillOpacity={dimmed ? 0.12 : r.isSelf ? 0.88 : 0.55}
                  stroke={r.color}
                  strokeWidth={isHov ? 2.5 : r.isSelf ? 2 : 1}
                  strokeOpacity={dimmed ? 0.15 : 1}
                  style={{ transition: 'r 0.12s ease, fill-opacity 0.15s ease' }}
                />
                <text
                  x={cx + dx} y={cy + dy}
                  textAnchor={textAnchor}
                  fontSize="9"
                  fontWeight={r.isSelf ? 800 : isHov ? 700 : 600}
                  fill={r.isSelf ? SELF_COLOR : dimmed ? '#D1D5DB' : '#374151'}
                  style={{ pointerEvents: 'none', userSelect: 'none', transition: 'fill 0.15s ease' }}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip card */}
        {hoveredRow && (
          <div
            className="absolute z-10 pointer-events-none"
            style={{
              left: tooltipPos.x + 14,
              top:  Math.max(4, tooltipPos.y - 10),
              transform: tooltipPos.x > (containerRef.current?.clientWidth ?? 400) * 0.55
                ? 'translateX(calc(-100% - 28px))' : undefined,
            }}
          >
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[158px]">
              <div
                className="px-3 py-2 flex items-center gap-2"
                style={{ backgroundColor: `${hoveredRow.color}18`, borderBottom: `1px solid ${hoveredRow.color}28` }}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: hoveredRow.color }} />
                <span className="text-[11px] font-bold text-gray-900 truncate">
                  {hoveredRow.isSelf ? 'You' : hoveredRow.displayName || `@${hoveredRow.handle}`}
                </span>
                {hoveredRow.isSelf && (
                  <span className="ml-auto text-[8px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0">You</span>
                )}
              </div>
              <div className="px-3 py-2.5 flex flex-col gap-1.5">
                {([
                  ['Followers',    fmtBig(hoveredRow.followerCount)],
                  ['Engagement',   `${hoveredRow.engagementRate.toFixed(2)}%`],
                  ['Avg eng/post', fmtBig(hoveredRow.avgEng)],
                  ['Posts/week',   hoveredRow.postsPerWeek.toFixed(1)],
                ] as [string, string][]).map(([lbl, val]) => (
                  <div key={lbl} className="flex items-center justify-between gap-4">
                    <span className="text-[10px] text-gray-400">{lbl}</span>
                    <span className="text-[11px] font-bold text-gray-800 tabular-nums">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend — also acts as hover trigger */}
      <div className="flex items-center gap-3 flex-wrap pt-1.5 border-t border-gray-100">
        {rows.map((r) => (
          <div
            key={r.id || 'self'}
            className="flex items-center gap-1.5 cursor-default"
            onMouseEnter={() => setHovered(r.id || 'self')}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
            <span className="text-[10px] font-semibold text-gray-600 truncate max-w-[100px]">
              {r.isSelf ? 'You' : r.displayName || `@${r.handle}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Detailed comparison table ──────────────────────────────────────────────────

function ComparisonTable({
  rows, self, scraperReady, busyId, onSync, onDelete,
}: {
  rows: Decorated[];
  self: Decorated;
  scraperReady: boolean;
  busyId: string | null;
  onSync: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cols = METRICS;
  return (
    <div className="flex flex-col gap-2 p-3.5 bg-white border border-gray-150 rounded-xl shadow-2xs">
      <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
        <Swords size={13} className="text-orange-500" /> Head-to-Head Breakdown
      </h4>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse min-w-[560px]">
          <thead>
            <tr className="border-b border-gray-150">
              <th className="text-left py-2 pr-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Account</th>
              {cols.map((c) => (
                <th key={c.key} className="text-right py-2 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                  {c.short}
                </th>
              ))}
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const busy = busyId === r.id;
              const avatarChar = (r.displayName || r.handle || '?')[0].toUpperCase();
              return (
                <tr
                  key={r.id || 'self'}
                  className={cn(
                    'border-b border-gray-100 last:border-0 transition-colors',
                    r.isSelf ? 'bg-orange-50/40' : 'hover:bg-gray-50/60',
                    busy && 'opacity-50 pointer-events-none'
                  )}
                >
                  <td className="py-2.5 pr-2">
                    <div className="flex items-center gap-2">
                      {r.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.avatarUrl} alt={r.handle} className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-black/5" />
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: r.color }}>
                          {avatarChar}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[11.5px] font-bold text-gray-900 truncate max-w-[110px]">
                            {r.displayName || `@${r.handle}`}
                          </span>
                          {r.isSelf && <span className="text-[8px] font-bold text-orange-600 bg-orange-100 px-1 py-0.5 rounded-full uppercase">You</span>}
                        </div>
                        <span className="text-[10px] text-gray-400 truncate block">
                          @{r.handle}{r.source === 'Manual' && !r.isSelf ? ' · manual' : ''}
                        </span>
                      </div>
                    </div>
                  </td>
                  {cols.map((c) => {
                    const val = metricValue(r, c.key);
                    const diff = r.isSelf ? 0 : val - metricValue(self, c.key); // + means competitor beats you
                    return (
                      <td key={c.key} className="text-right py-2.5 px-2 whitespace-nowrap">
                        <div className="text-[12px] font-bold text-gray-800 tabular-nums">{c.fmt(val)}</div>
                        {!r.isSelf && (
                          <div className="mt-0.5 flex justify-end">
                            <Delta value={diff} unit={c.key === 'engagementRate' ? '%' : ''} invert />
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2.5 pl-2">
                    {!r.isSelf && r.id && (
                      <div className="flex items-center gap-0.5 justify-end">
                        {scraperReady && (
                          <button
                            type="button"
                            onClick={() => onSync(r.id!)}
                            disabled={busy}
                            title="Re-fetch live metrics"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          >
                            <RefreshCw size={12} className={busy ? 'animate-spin text-orange-500' : ''} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(r.id!)}
                          disabled={busy}
                          title="Remove competitor"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-400 flex items-center gap-1 pt-0.5">
        <Info size={11} /> Deltas compare each competitor against you. Green = you lead, red = they lead.
      </p>
    </div>
  );
}

// ─── Add Competitor Form Component ──────────────────────────────────────────────

function AddCompetitorForm({ platform, scraperReady, onAdd, onCancel }: {
  platform: Platform;
  scraperReady: boolean;
  onAdd: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [handle, setHandle] = useState('');
  const [showManual, setShowManual] = useState(!scraperReady);
  const [followerCount, setFollowerCount] = useState('');
  const [avgLikes, setAvgLikes] = useState('');
  const [avgComments, setAvgComments] = useState('');
  const [postsPerWeek, setPostsPerWeek] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    const cleanHandle = handle.replace(/^@/, '').trim();
    if (!cleanHandle) {
      setErr('Please enter a valid account handle.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const body: Record<string, unknown> = { platform, handle: cleanHandle };
      if (followerCount !== '') body.followerCount = Math.max(0, Number(followerCount) || 0);
      if (avgLikes !== '') body.avgLikes = Math.max(0, Number(avgLikes) || 0);
      if (avgComments !== '') body.avgComments = Math.max(0, Number(avgComments) || 0);
      if (postsPerWeek !== '') body.postsPerWeek = Math.max(0, Number(postsPerWeek) || 0);

      await onAdd(body);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Failed to add competitor. Please check the handle and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 bg-gray-50/80 border border-gray-200 rounded-xl animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
          <Plus size={13} className="text-orange-500" /> Add {platform} Competitor
        </span>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm font-semibold pl-1">@</span>
        <input
          autoFocus
          value={handle}
          onChange={e => setHandle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={`${platform} handle (e.g. nike)`}
          className="flex-1 h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"
        />
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-gray-500 leading-relaxed">
        <Info size={13} className="text-gray-400 shrink-0 mt-0.5" />
        {scraperReady
          ? `Relay will fetch @${handle.replace(/^@/, '').trim() || 'handle'}'s public metrics automatically. Make sure the profile is public.`
          : `Live lookup for ${platform} is limited or offline — enter estimated numbers below to benchmark against.`}
      </p>

      {scraperReady && !showManual && (
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline text-left w-fit transition-colors"
        >
          + Enter metrics manually instead
        </button>
      )}

      {showManual && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-gray-200/60">
          {([
            ['Followers', followerCount, setFollowerCount],
            ['Avg likes/post', avgLikes, setAvgLikes],
            ['Avg comments/post', avgComments, setAvgComments],
            ['Posts/week', postsPerWeek, setPostsPerWeek],
          ] as const).map(([label, val, set]) => (
            <label key={label} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
              <input
                type="number"
                min="0"
                value={val}
                onChange={e => set(e.target.value)}
                placeholder="0"
                className="h-8 px-2 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-orange-500"
              />
            </label>
          ))}
        </div>
      )}

      {err && (
        <div className="flex items-center gap-1.5 text-[11.5px] text-red-600 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
          <AlertCircle size={13} className="shrink-0 text-red-500" />
          <span>{err}</span>
        </div>
      )}

      <div className="flex items-center gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="btn-clay-secondary h-7 px-3 text-[11px] font-semibold text-gray-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="btn-clay-primary h-7 px-3 text-[11px] font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          {saving ? 'Adding…' : 'Add Competitor'}
        </button>
      </div>
    </div>
  );
}

// ─── Loading Skeleton Component ─────────────────────────────────────────────────

function CompetitorSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-1">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-gray-100 bg-gray-50/50 animate-pulse" />
        ))}
      </div>
      <div className="h-52 rounded-xl border border-gray-100 bg-gray-50/40 animate-pulse" />
    </div>
  );
}

// ─── Main CompetitorAnalysis Component ──────────────────────────────────────────

export function CompetitorAnalysis() {
  const [platform, setPlatform] = useState<Platform>('Instagram');
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Notification banner state (e.g. Scraper warnings / Rate limit notices)
  const [notice, setNotice] = useState<{ message: string; type: 'warning' | 'info' | 'error' } | null>(null);

  const activeBrand = useBrandStore((s) => s.activeBrand());
  const activeBrandId = activeBrand?.id;

  // Race condition cancellation ref
  const lastFetchId = useRef(0);

  const load = useCallback(async (isSilentRefresh = false) => {
    if (!activeBrandId) return;

    const fetchId = ++lastFetchId.current;

    if (isSilentRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await api.get<CompareResponse>(
        `/brands/${activeBrandId}/competitors/compare?platform=${platform}`
      );

      if (fetchId === lastFetchId.current) {
        setData(res);
      }
    } catch (e) {
      if (fetchId === lastFetchId.current) {
        const msg = e instanceof ApiError ? e.message : 'Unable to connect to competitor benchmarks service.';
        setError(msg);
      }
    } finally {
      if (fetchId === lastFetchId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [activeBrandId, platform]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (body: Record<string, unknown>) => {
    if (!activeBrandId) return;
    try {
      await api.post(`/brands/${activeBrandId}/competitors`, body);
      setShowAdd(false);
      setNotice(null);
      await load(true);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to save competitor.';
      setNotice({ message: msg, type: 'warning' });
    }
  };

  const handleSync = async (id: string) => {
    if (!activeBrandId) return;
    setBusyId(id);
    setNotice(null);
    try {
      await api.post(`/brands/${activeBrandId}/competitors/${id}/sync`);
      await load(true);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Sync failed. Profile might be private or rate limited.';
      setNotice({ message: msg, type: 'warning' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeBrandId) return;
    setBusyId(id);
    try {
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, competitors: prev.competitors.filter((c) => c.id !== id) };
      });

      await api.delete(`/brands/${activeBrandId}/competitors/${id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Delete failed.';
      setNotice({ message: msg, type: 'error' });
      await load(true);
    } finally {
      setBusyId(null);
    }
  };

  // Decorate self + competitors with a series color and computed avgEng.
  const { rows, self } = useMemo(() => {
    if (!data || !data.self) return { rows: [] as Decorated[], self: null as Decorated | null };
    const decoratedSelf: Decorated = {
      ...data.self,
      isSelf: true,
      color: SELF_COLOR,
      avgEng: (data.self.avgLikes || 0) + (data.self.avgComments || 0),
    };
    const comps: Decorated[] = (data.competitors || []).map((c, i) => ({
      ...c,
      color: SERIES[i % SERIES.length],
      avgEng: (c.avgLikes || 0) + (c.avgComments || 0),
    }));
    return { rows: [decoratedSelf, ...comps], self: decoratedSelf };
  }, [data]);

  const hasCompetitors = rows.length > 1;

  // No Brand State
  if (!activeBrand) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2 shadow-2xs">
        <Swords size={24} className="text-gray-300" />
        <p className="text-xs font-bold text-gray-700">No Active Brand Selected</p>
        <p className="text-[11.5px] text-gray-400 max-w-xs">
          Select or create a brand to analyze competitor benchmarks.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50/40 border border-gray-200 rounded-xl p-4 flex flex-col gap-3.5 shadow-2xs relative">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-150 pb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
            <Swords size={15} className="text-orange-500" /> Competitor Analysis
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Benchmark reach, engagement &amp; cadence against your market. Engagement rate = (likes + comments) ÷ followers.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            title="Refresh benchmark data"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-orange-500' : ''} />
          </button>
          {!showAdd && (
            <button
              type="button"
              onClick={() => { setShowAdd(true); setNotice(null); }}
              className="btn-clay-primary h-7 px-3 text-[11px] font-semibold text-white inline-flex items-center gap-1 shrink-0"
            >
              <Plus size={12} /> Add Competitor
            </button>
          )}
        </div>
      </div>

      {/* Platform Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {PLATFORMS.map((p) => {
          const isActive = platform === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                if (platform !== p) {
                  setPlatform(p);
                  setShowAdd(false);
                  setNotice(null);
                }
              }}
              className={cn(
                'h-7 px-3 text-[11px] font-semibold rounded-lg transition-all inline-flex items-center gap-1.5 shrink-0',
                isActive
                  ? 'btn-clay-primary text-white shadow-2xs'
                  : 'bg-white border border-gray-200/80 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: isActive ? '#FFFFFF' : PLATFORM_COLORS[p] }}
              />
              {p}
            </button>
          );
        })}
      </div>

      {/* Add Competitor Form */}
      {showAdd && (
        <AddCompetitorForm
          platform={platform}
          scraperReady={data?.scraperReady ?? false}
          onAdd={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Warning/Notice Banner */}
      {notice && (
        <div
          className={cn(
            'flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs animate-in fade-in-50 duration-200',
            notice.type === 'warning' && 'bg-amber-50/90 border-amber-200 text-amber-800',
            notice.type === 'error' && 'bg-red-50/90 border-red-200 text-red-800',
            notice.type === 'info' && 'bg-blue-50/90 border-blue-200 text-blue-800'
          )}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'warning' && <AlertTriangle size={15} className="text-amber-600 shrink-0" />}
            {notice.type === 'error' && <AlertCircle size={15} className="text-red-600 shrink-0" />}
            {notice.type === 'info' && <Info size={15} className="text-blue-600 shrink-0" />}
            <span className="font-medium leading-normal">{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-md transition-colors shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Error State View with Retry */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-8 px-4 bg-red-50/40 border border-red-100 rounded-xl text-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-red-100/80 flex items-center justify-center text-red-600 shrink-0">
            <AlertCircle size={20} />
          </div>
          <div className="flex flex-col gap-0.5 max-w-sm">
            <p className="text-xs font-bold text-gray-900">Unable to load {platform} competitor data</p>
            <p className="text-[11.5px] text-gray-500 leading-relaxed">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => load(false)}
            className="mt-1 btn-clay-secondary h-7.5 px-3.5 text-xs font-semibold text-gray-700 inline-flex items-center gap-1.5 hover:bg-white transition-all shadow-2xs"
          >
            <RotateCcw size={13} className="text-gray-500" /> Retry Loading
          </button>
        </div>
      )}

      {/* Initial Loading Skeleton */}
      {loading && !data && <CompetitorSkeleton />}

      {/* Main Dashboard & Empty States */}
      {!error && (!loading || data) && self && (
        <div className={cn('flex flex-col gap-3 transition-opacity duration-200', refreshing && 'opacity-60')}>
          {!hasCompetitors && !showAdd ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 bg-white border border-dashed border-gray-200 rounded-xl text-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                <Users size={20} />
              </div>
              <div className="flex flex-col gap-1 max-w-xs">
                <p className="text-xs font-bold text-gray-900">No {platform} competitors added yet</p>
                <p className="text-[11.5px] text-gray-400 leading-relaxed">
                  Add competitors to unlock the positioning map, leaderboard, and head-to-head breakdown.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowAdd(true); setNotice(null); }}
                className="mt-1 btn-clay-primary h-7.5 px-3.5 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Plus size={13} /> Add {platform} Competitor
              </button>
            </div>
          ) : hasCompetitors ? (
            <>
              <SummaryStrip rows={rows} self={self} />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <Leaderboard rows={rows} self={self} />
                <PositioningMap rows={rows} />
              </div>
              <ComparisonTable
                rows={rows}
                self={self}
                scraperReady={data?.scraperReady ?? false}
                busyId={busyId}
                onSync={handleSync}
                onDelete={handleDelete}
              />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
