'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { TrendingUp, Eye, Heart, Users, Zap, AlertCircle, Loader2, Lightbulb, Info, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrandStore } from '@/store/brand';
import { api, ApiError } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsOverview {
  period: { from: string; to: string };
  totals: {
    reach: number; impressions: number; likes: number; comments: number;
    shares: number; saves: number; clicks: number; count: number;
  };
  engagementRate: number;
  byPlatform: Record<string, {
    reach: number; impressions: number; likes: number; comments: number;
    shares: number; saves: number; clicks: number; count: number;
  }>;
}

// ─── Chart utils ──────────────────────────────────────────────────────────────

function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map(v => (v - min) / range);
}

function buildLinePath(normed: number[], w: number, h: number, pad = 4): string {
  if (normed.length < 2) return '';
  const pts: [number, number][] = normed.map((v, i) => [
    (i / (normed.length - 1)) * w,
    pad + (1 - v) * (h - pad * 2),
  ]);
  const d: string[] = [`M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`];
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const cp1x = px + (cx - px) / 3;
    const cp2x = cx - (cx - px) / 3;
    d.push(`C ${cp1x.toFixed(2)} ${py.toFixed(2)} ${cp2x.toFixed(2)} ${cy.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)}`);
  }
  return d.join(' ');
}

function buildAreaPath(normed: number[], w: number, h: number, pad = 4): string {
  const line = buildLinePath(normed, w, h, pad);
  return `${line} L ${w.toFixed(2)} ${h.toFixed(2)} L 0 ${h.toFixed(2)} Z`;
}

function getPoints(normed: number[], w: number, h: number, pad = 4): [number, number][] {
  return normed.map((v, i) => [
    (i / (normed.length - 1)) * w,
    pad + (1 - v) * (h - pad * 2),
  ]);
}

function fmtBig(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const normed = useMemo(() => normalize(values), [values]);
  const w = 70; const h = 28;
  const line = buildLinePath(normed, w, h, 2);
  const area = buildAreaPath(normed, w, h, 2);
  const id = `spark-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CHART_W = 800;
const CHART_H = 180;
const C_PAD = { t: 12, r: 8, b: 28, l: 48 };
const INNER_W = CHART_W - C_PAD.l - C_PAD.r;
const INNER_H = CHART_H - C_PAD.t - C_PAD.b;

function AreaChart({ values, color, labels }: { values: number[]; color: string; labels: string[] }) {
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const normed = useMemo(() => normalize(values), [values]);
  const pts = useMemo(() => getPoints(normed, INNER_W, INNER_H), [normed]);
  const linePath = useMemo(() => buildLinePath(normed, INNER_W, INNER_H), [normed]);
  const areaPath = useMemo(() => buildAreaPath(normed, INNER_W, INNER_H), [normed]);

  const yMin = Math.min(...values);
  const yMax = Math.max(...values);
  const yTicks = [0, 0.5, 1].map(t => ({
    y: C_PAD.t + (1 - t) * INNER_H,
    label: fmtBig(Math.round(yMin + t * (yMax - yMin))),
  }));
  const xLabelIdxs = [0, Math.floor(values.length * 0.5), values.length - 1];

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const innerX = svgX - C_PAD.l;
    if (innerX < 0 || innerX > INNER_W) { setHover(null); return; }
    const idx = Math.round((innerX / INNER_W) * (values.length - 1));
    const clampedIdx = Math.max(0, Math.min(values.length - 1, idx));
    setHover({ idx: clampedIdx, x: C_PAD.l + pts[clampedIdx][0], y: C_PAD.t + pts[clampedIdx][1] });
  }, [pts, values.length]);

  const gradId = `area-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full"
      style={{ height: CHART_H }} onMouseMove={handleMouseMove} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={C_PAD.l} y1={t.y} x2={CHART_W - C_PAD.r} y2={t.y} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3 3" />
          <text x={C_PAD.l - 6} y={t.y + 3} textAnchor="end" fontSize="10" fontWeight="500" fill="#9CA3AF">{t.label}</text>
        </g>
      ))}
      {xLabelIdxs.map((idx) => {
        const x = C_PAD.l + (idx / (values.length - 1)) * INNER_W;
        return <text key={idx} x={x} y={CHART_H - 6} textAnchor="middle" fontSize="10" fontWeight="500" fill="#9CA3AF">{labels[idx] ?? ''}</text>;
      })}
      <g transform={`translate(${C_PAD.l}, ${C_PAD.t})`}>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {hover && (
        <g>
          <line x1={hover.x} y1={C_PAD.t} x2={hover.x} y2={CHART_H - C_PAD.b} stroke="#6366F1" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx={hover.x} cy={hover.y} r="4" fill={color} stroke="white" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

// ─── Platform colors ──────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#EC4899', LinkedIn: '#2563EB', X: '#111827', Facebook: '#1D4ED8', TikTok: '#000000',
};

function PlatformBar({ name, reach, posts, engRate, maxReach }: {
  name: string; reach: number; posts: number; engRate: string; maxReach: number;
}) {
  const pct = maxReach > 0 ? (reach / maxReach) * 100 : 0;
  const color = PLATFORM_COLORS[name] ?? '#9CA3AF';
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 font-medium text-gray-700 shrink-0 truncate">{name}</span>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <span className="w-12 text-right font-semibold text-gray-800 tabular-nums">{fmtBig(reach)}</span>
      </div>
      <span className="w-8 text-right font-medium text-gray-400 tabular-nums shrink-0">{posts}p</span>
      <span className="w-10 text-right font-bold text-emerald-600 shrink-0">{engRate}%</span>
    </div>
  );
}

// ─── Metric config ────────────────────────────────────────────────────────────

type MetricKey = 'reach' | 'impressions' | 'engagements';

const METRICS: { key: MetricKey; label: string; icon: typeof Eye; svgColor: string }[] = [
  { key: 'reach',       label: 'Reach',       icon: Eye,   svgColor: '#6366F1' },
  { key: 'impressions', label: 'Impressions',  icon: Zap,   svgColor: '#8B5CF6' },
  { key: 'engagements', label: 'Engagements',  icon: Heart, svgColor: '#EC4899' },
];

type Period = 7 | 30 | 90;

// ─── AnalyticsView ────────────────────────────────────────────────────────────

export function AnalyticsView() {
  const [period, setPeriod] = useState<Period>(30);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('reach');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [timeSeries, setTimeSeries] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const activeBrand = useBrandStore((s) => s.activeBrand());

  // Fetch KPI overview
  useEffect(() => {
    if (!activeBrand) return;
    setLoading(true);
    setError('');
    const from = new Date(Date.now() - period * 86_400_000).toISOString();
    const to = new Date().toISOString();
    api.get<AnalyticsOverview>(`/brands/${activeBrand.id}/analytics/overview?from=${from}&to=${to}`)
      .then(setOverview)
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [activeBrand?.id, period, refreshTick]);

  // Fetch time-series for chart
  useEffect(() => {
    if (!activeBrand) return;
    setChartLoading(true);
    const from = new Date(Date.now() - period * 86_400_000).toISOString();
    const to = new Date().toISOString();
    const metric = activeMetric === 'engagements' ? 'engagements' : activeMetric;
    api.get<{ date: string; value: number }[]>(
      `/brands/${activeBrand.id}/analytics/time-series?metric=${metric}&from=${from}&to=${to}`
    )
      .then(setTimeSeries)
      .catch(() => setTimeSeries([]))
      .finally(() => setChartLoading(false));
  }, [activeBrand?.id, period, activeMetric, refreshTick]);

  // Pull fresh insights from the platforms on demand, then reload.
  const handleRefresh = async () => {
    if (!activeBrand || refreshing) return;
    setRefreshing(true);
    setSyncMsg(null);
    try {
      const r = await api.post<{ collected: number; targets: number; errors: string[]; message?: string }>(
        `/brands/${activeBrand.id}/analytics/collect`, {}
      );
      setSyncMsg(
        r.message ??
        `Collected fresh data from ${r.collected} of ${r.targets} post target${r.targets !== 1 ? 's' : ''}.` +
        (r.errors.length ? ` ${r.errors.length} error${r.errors.length !== 1 ? 's' : ''}.` : '')
      );
      setRefreshTick(t => t + 1);
    } catch (e) {
      setSyncMsg(e instanceof ApiError ? e.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const chartValues = useMemo(() => timeSeries.map(d => d.value), [timeSeries]);
  const labels = useMemo(() => timeSeries.map(d => {
    const dt = new Date(d.date);
    return dt.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  }), [timeSeries]);

  // Real totals from API
  const totals = overview?.totals;
  const realValues: Record<MetricKey, number> = {
    reach:       totals?.reach ?? 0,
    impressions: totals?.impressions ?? 0,
    engagements: (totals?.likes ?? 0) + (totals?.comments ?? 0) + (totals?.shares ?? 0),
  };

  // Platform breakdown from API
  const platformRows = useMemo(() => {
    if (!overview?.byPlatform) return [];
    return Object.entries(overview.byPlatform).map(([name, data]) => {
      const eng = data.impressions > 0
        ? (((data.likes + data.comments + data.shares) / data.impressions) * 100).toFixed(1)
        : '0.0';
      return { name, reach: data.reach, posts: data.count, engRate: eng };
    });
  }, [overview]);

  // Performance-based suggestions — derived from real platform/engagement data when available.
  // Templated rules, not a trained model — framed as "suggested" rather than a guarantee.
  const suggestions = useMemo(() => {
    if (!platformRows.length) return [];
    const items: { title: string; detail: string }[] = [];

    const byEngagement = [...platformRows].sort((a, b) => parseFloat(b.engRate) - parseFloat(a.engRate));
    const best = byEngagement[0];
    if (best && parseFloat(best.engRate) > 0) {
      items.push({
        title: `${best.name} is your best-performing platform`,
        detail: `Posts there average a ${best.engRate}% engagement rate — your highest across connected platforms. Consider posting there more often, or repurposing your top ${best.name} content for other platforms.`,
      });
    }

    const totalPosts = totals?.count ?? 0;
    if (totalPosts > 0) {
      const perDay = (totalPosts / period).toFixed(1);
      items.push({
        title: `You're averaging ${perDay} post${perDay === '1.0' ? '' : 's'}/day`,
        detail: totalPosts >= period
          ? 'Consistent posting is paying off — keep this cadence to maintain reach.'
          : 'Accounts that post more consistently tend to see steadier reach — try filling a few more slots on your content calendar this week.',
      });
    }

    if (totals && totals.impressions > 0) {
      const saveRate = ((totals.saves / totals.impressions) * 100).toFixed(1);
      if (totals.saves > 0) {
        items.push({
          title: `Saves are ${saveRate}% of impressions`,
          detail: 'Content people save tends to be reference-worthy (tips, lists, how-tos). Posts like your highest-saved ones are worth making more of.',
        });
      }
    }

    return items.slice(0, 3);
  }, [platformRows, totals, period]);

  const maxReach = Math.max(...platformRows.map(p => p.reach), 1);
  const activeColor = METRICS.find(m => m.key === activeMetric)!.svgColor;
  const hasData = totals && (totals.reach + totals.impressions + totals.likes) > 0;
  const chartHasData = chartValues.some(v => v > 0);

  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle size={22} className="text-gray-300" />
        <p className="text-sm font-medium text-gray-500">No brand selected</p>
        <p className="text-xs text-gray-400">Select a brand from the sidebar to view analytics.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {([7, 30, 90] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn('h-7 px-3 text-xs font-medium rounded-lg transition-colors',
                period === p ? 'btn-clay-primary text-white text-[11px]' : 'btn-clay-secondary text-gray-600 text-[11px]')}>
              {p === 7 ? '7d' : p === 30 ? '30d' : '90d'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          {loading && <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </div>}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Pull the latest reach & engagement from Facebook / Instagram now"
            className="btn-clay-secondary h-7 px-3 text-[11px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh data'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
          <Info size={12} className="text-gray-400 shrink-0" />
          <p className="text-[11.5px] text-gray-600">{syncMsg}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={13} className="text-red-500 shrink-0" />
          <p className="text-xs font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* No-data banner */}
      {!loading && !error && !hasData && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            No analytics data yet for <span className="font-semibold">{activeBrand.name}</span>. Publish some posts and analytics will appear here.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {METRICS.map(({ key, label, icon: Icon, svgColor }) => {
          const value = realValues[key];
          const isActive = activeMetric === key;
          const sparkValues = isActive && chartValues.length > 0 ? chartValues.slice(-20) : [0, 0];
          return (
            <button key={key} onClick={() => setActiveMetric(key)}
              className={cn('bg-white border rounded-xl p-3 flex flex-col gap-2 text-left transition-colors shadow-2xs cursor-pointer',
                isActive ? 'border-orange-500 bg-orange-50/30 ring-1 ring-orange-500/20' : 'border-gray-200 hover:border-gray-300')}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
                <Icon size={14} className="text-gray-400" />
              </div>
              <div className="text-xl font-bold text-gray-900 leading-none tracking-tight">{fmtBig(value)}</div>
              <div className="flex items-center justify-between gap-1 pt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-50 text-gray-400 border border-gray-200">
                  <Users size={10} className="mr-0.5 inline" />
                  {period}d
                </span>
                <Sparkline values={sparkValues} color={svgColor} />
              </div>
            </button>
          );
        })}

        {/* Engagement rate card */}
        <div className={cn('bg-white border rounded-xl p-3 flex flex-col gap-2 text-left shadow-2xs',
          'border-gray-200')}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Eng. Rate</span>
            <TrendingUp size={14} className="text-gray-400" />
          </div>
          <div className="text-xl font-bold text-gray-900 leading-none tracking-tight">
            {overview ? `${overview.engagementRate}%` : '—'}
          </div>
          <div className="text-[10px] text-gray-400 font-medium">
            {totals ? `${totals.count} post targets tracked` : 'No data'}
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight capitalize">
            {METRICS.find(m => m.key === activeMetric)!.label} Trend
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Last {period} days</span>
            {chartLoading && <Loader2 size={12} className="animate-spin text-gray-400" />}
            {!chartLoading && !chartHasData && (
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">No data yet</span>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[480px]">
            {chartValues.length > 1 ? (
              <AreaChart values={chartValues} color={activeColor} labels={labels} />
            ) : (
              <div className="flex items-center justify-center h-[180px]">
                <p className="text-xs text-gray-400">Publish posts to see trend data here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">Platform Breakdown</h3>
          {platformRows.length === 0 ? (
            <p className="text-xs text-gray-400">No platform data for this period.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {platformRows.map(p => (
                <PlatformBar key={p.name} {...p} maxReach={maxReach} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">Summary</h3>
          {!totals ? (
            <p className="text-xs text-gray-400">No data yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {([
                { label: 'Likes',    value: totals.likes    },
                { label: 'Comments', value: totals.comments },
                { label: 'Shares',   value: totals.shares   },
                { label: 'Saves',    value: totals.saves    },
                { label: 'Clicks',   value: totals.clicks   },
                { label: 'Posts',    value: totals.count    },
              ] as const).map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5 p-2 bg-gray-50 rounded-lg">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
                  <span className="text-sm font-bold text-gray-900">{fmtBig(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance-based suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
              <Lightbulb size={14} className="text-orange-500" /> Suggested for you
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400">
              <Info size={11} /> Based on your data
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {suggestions.map((s, i) => (
              <div key={i} className="flex flex-col gap-1.5 p-3 bg-orange-50/50 border border-orange-100 rounded-lg">
                <p className="text-xs font-bold text-gray-900 leading-snug">{s.title}</p>
                <p className="text-[11.5px] text-gray-500 leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
