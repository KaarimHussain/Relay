'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, Eye, Heart, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Seeded data generation (deterministic) ───────────────────────────────────

function seed(n: number) { return (Math.abs(Math.sin(n * 9301 + 49297)) * 233280) % 1; }

function buildSeries(days: number, base: number, variance: number, trend: number): number[] {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < days; i++) {
    v += trend + (seed(i + base) - 0.5) * variance;
    out.push(Math.max(0, Math.round(v)));
  }
  return out;
}

const ALL_90 = {
  reach:       buildSeries(90, 3800,  900,  35),
  impressions: buildSeries(90, 9200,  1800, 80),
  engagements: buildSeries(90, 480,   120,  3),
  followers:   buildSeries(90, 22400, 200,  18),
};

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

function fmtChange(curr: number[], prev: number[]): { pct: number; up: boolean } {
  const c = curr.reduce((a, b) => a + b, 0);
  const p = prev.reduce((a, b) => a + b, 0) || 1;
  const pct = ((c - p) / p) * 100;
  return { pct: Math.abs(pct), up: pct >= 0 };
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

function AreaChart({
  values,
  color,
  labels,
}: {
  values: number[];
  color: string;
  labels: string[];
}) {
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
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      style={{ height: CHART_H }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={C_PAD.l} y1={t.y}
            x2={CHART_W - C_PAD.r} y2={t.y}
            stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3 3"
          />
          <text
            x={C_PAD.l - 6} y={t.y + 3}
            textAnchor="end"
            fontSize="10" fontWeight="500" fill="#9CA3AF"
          >
            {t.label}
          </text>
        </g>
      ))}

      {xLabelIdxs.map((idx) => {
        const x = C_PAD.l + (idx / (values.length - 1)) * INNER_W;
        return (
          <text
            key={idx}
            x={x} y={CHART_H - 6}
            textAnchor="middle"
            fontSize="10" fontWeight="500" fill="#9CA3AF"
          >
            {labels[idx] ?? ''}
          </text>
        );
      })}

      <g transform={`translate(${C_PAD.l}, ${C_PAD.t})`}>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {hover && (
        <g>
          <line
            x1={hover.x} y1={C_PAD.t}
            x2={hover.x} y2={CHART_H - C_PAD.b}
            stroke="#6366F1" strokeWidth="1" strokeDasharray="3 3"
          />
          <circle cx={hover.x} cy={hover.y} r="4" fill={color} stroke="white" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

const PLATFORM_DATA = [
  { name: 'Instagram', color: '#EC4899', reach: 18400, posts: 24, eng: 5.2 },
  { name: 'LinkedIn',  color: '#2563EB', reach: 12200, posts: 18, eng: 6.1 },
  { name: 'X',         color: '#111827', reach: 9800,  posts: 31, eng: 2.8 },
  { name: 'Facebook',  color: '#1D4ED8', reach: 6100,  posts: 12, eng: 3.4 },
];

function PlatformBar({ name, color, reach, posts, eng, maxReach }: typeof PLATFORM_DATA[0] & { maxReach: number }) {
  const pct = (reach / maxReach) * 100;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 font-medium text-gray-700 shrink-0 truncate">{name}</span>
      <div className="flex-1 flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <span className="w-12 text-right font-semibold text-gray-800 tabular-nums">{fmtBig(reach)}</span>
      </div>
      <span className="w-8 text-right font-medium text-gray-400 tabular-nums shrink-0">{posts}p</span>
      <span className="w-10 text-right font-bold text-emerald-600 shrink-0">{eng}%</span>
    </div>
  );
}

const TOP_POSTS = [
  { id: 1, title: 'How to grow your LinkedIn from 0 to 10K followers',    platform: 'LinkedIn',  reach: 8400, eng: 9.2 },
  { id: 2, title: '5 ways AI is changing content strategy in 2025',        platform: 'Instagram', reach: 6100, eng: 7.8 },
];

type MetricKey = 'reach' | 'impressions' | 'engagements' | 'followers';

const METRICS: {
  key: MetricKey;
  label: string;
  icon: typeof Eye;
  svgColor: string;
}[] = [
  { key: 'reach',       label: 'Reach',         icon: Eye,       svgColor: '#6366F1' },
  { key: 'impressions', label: 'Impressions',    icon: Zap,       svgColor: '#8B5CF6' },
  { key: 'engagements', label: 'Engagements',    icon: Heart,     svgColor: '#EC4899' },
  { key: 'followers',   label: 'Total Followers',icon: Users,     svgColor: '#10B981' },
];

type Period = 7 | 30 | 90;

export function AnalyticsView() {
  const [period, setPeriod] = useState<Period>(30);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('reach');

  const data = useMemo(() => {
    const slice = (arr: number[]) => arr.slice(90 - period);
    return {
      reach:       slice(ALL_90.reach),
      impressions: slice(ALL_90.impressions),
      engagements: slice(ALL_90.engagements),
      followers:   slice(ALL_90.followers),
    };
  }, [period]);

  const prevData = useMemo(() => {
    const prev = (arr: number[]) => arr.slice(Math.max(0, 90 - period * 2), 90 - period);
    return {
      reach:       prev(ALL_90.reach),
      impressions: prev(ALL_90.impressions),
      engagements: prev(ALL_90.engagements),
      followers:   prev(ALL_90.followers),
    };
  }, [period]);

  const labels = useMemo(() => {
    const now = new Date();
    return Array.from({ length: period }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (period - 1 - i));
      return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    });
  }, [period]);

  const activeSeries = data[activeMetric];
  const activeColor = METRICS.find(m => m.key === activeMetric)!.svgColor;
  const maxReach = Math.max(...PLATFORM_DATA.map(p => p.reach));

  return (
    <div className="flex flex-col gap-4">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {([7, 30, 90] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'h-7 px-3 text-xs font-medium rounded-lg transition-colors',
                period === p
                  ? 'btn-clay-primary text-white text-[11px]'
                  : 'btn-clay-secondary text-gray-600 text-[11px]'
              )}
            >
              {p === 7 ? '7d' : p === 30 ? '30d' : '90d'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {METRICS.map(({ key, label, icon: Icon, svgColor }) => {
          const vals = data[key];
          const prev = prevData[key];
          const total = key === 'followers'
            ? vals[vals.length - 1]
            : vals.reduce((a, b) => a + b, 0);
          const { pct, up } = fmtChange(vals, prev);
          const isActive = activeMetric === key;

          return (
            <button
              key={key}
              onClick={() => setActiveMetric(key)}
              className={cn(
                'bg-white border rounded-xl p-3 flex flex-col gap-2 text-left transition-colors shadow-2xs cursor-pointer',
                isActive ? 'border-orange-500 bg-orange-50/30 ring-1 ring-orange-500/20' : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
                <Icon size={14} className="text-gray-400" />
              </div>
              <div className="text-xl font-bold text-gray-900 leading-none tracking-tight">
                {fmtBig(total)}
              </div>
              <div className="flex items-center justify-between gap-1 pt-0.5">
                <span
                  className={cn(
                    'inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold',
                    up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                  )}
                >
                  {up ? <TrendingUp size={10} className="mr-0.5 inline" /> : <TrendingDown size={10} className="mr-0.5 inline" />}
                  {pct.toFixed(1)}%
                </span>
                <Sparkline values={vals.slice(-20)} color={svgColor} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight capitalize">
            {METRICS.find(m => m.key === activeMetric)!.label} Trend
          </h3>
          <span className="text-xs font-semibold text-gray-500">Last {period} days</span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[480px]">
            <AreaChart values={activeSeries} color={activeColor} labels={labels} />
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">Platform Breakdown</h3>
          <div className="flex flex-col gap-2.5">
            {PLATFORM_DATA.map(p => (
              <PlatformBar key={p.name} {...p} maxReach={maxReach} />
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">Top Posts</h3>
          <div className="flex flex-col divide-y divide-gray-100">
            {TOP_POSTS.map((post, i) => (
              <div key={post.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                <span className="text-xs font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{post.title}</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 shrink-0">{post.eng}% eng</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
