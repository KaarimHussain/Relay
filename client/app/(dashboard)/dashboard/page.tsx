'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, CheckCircle2, CircleAlert, FilePlus2, FileText, Layers, Link2, ShieldCheck, Sparkles, Wifi } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { PostTable } from '@/components/dashboard/PostTable';
import { useBrandStore } from '@/store/brand';
import { usePostStore } from '@/store/post';
import { useAccountStore } from '@/store/account';
import { api } from '@/lib/api';
import { formatScheduledAt } from '@/lib/format';

type BriefingItem = { kind: string; title: string; detail: string; href: string; priority: 'info' | 'warning' | 'urgent' };
type Briefing = { id: string; items: BriefingItem[]; createdAt: string };
type FocusItem = { title: string; detail: string; href: string; icon: React.ReactNode; tone: 'orange' | 'red' | 'amber' | 'blue' };

export default function DashboardPage() {
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const posts = usePostStore((s) => s.posts);
  const postStatus = usePostStore((s) => s.status);
  const fetchPosts = usePostStore((s) => s.fetchPosts);
  const accounts = useAccountStore((s) => s.accounts);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);
  const [briefing, setBriefing] = useState<Briefing | null>(null);

  useEffect(() => {
    if (!activeBrand) return;
    void fetchPosts(activeBrand.id);
    void fetchAccounts(activeBrand.id);
  }, [activeBrand?.id, fetchAccounts, fetchPosts]);

  useEffect(() => {
    let mounted = true;
    void api.get<Briefing | undefined>('/agent/briefings/latest').then((data) => { if (mounted && data) setBriefing(data); }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const published = posts.filter((post) => post.status === 'Published').length;
  const scheduled = posts.filter((post) => post.status === 'Scheduled').length;
  const drafts = posts.filter((post) => post.status === 'Draft').length;
  const failed = posts.filter((post) => post.status === 'Failed').length;
  const connected = accounts.filter((account) => account.status === 'Active').length;
  const disconnected = accounts.filter((account) => account.status !== 'Active').length;
  const loading = postStatus === 'loading' || postStatus === 'idle';
  const upcoming = useMemo(() => posts.filter((post) => post.status === 'Scheduled' && post.scheduledAt).sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime()).slice(0, 3), [posts]);
  const focusItems = [
    !connected ? { title: 'Connect a social account', detail: 'Publish and schedule directly from Relay.', href: '/accounts', icon: <Link2 size={15} />, tone: 'orange' } : null,
    failed ? { title: `Fix ${failed} failed post${failed === 1 ? '' : 's'}`, detail: 'Review the publishing error and retry only the failed destinations.', href: `/posts/${posts.find((post) => post.status === 'Failed')?.id}/edit?recovery=1`, icon: <CircleAlert size={15} />, tone: 'red' } : null,
    drafts ? { title: `Review ${drafts} draft${drafts === 1 ? '' : 's'}`, detail: 'Finish your content and schedule it when ready.', href: '/queue', icon: <FileText size={15} />, tone: 'amber' } : null,
    !scheduled && connected ? { title: 'Plan your next post', detail: 'Keep your calendar moving with a scheduled post.', href: '/posts/new', icon: <Calendar size={15} />, tone: 'blue' } : null,
  ].filter(Boolean) as FocusItem[];
  const stats = [
    { label: 'Posts Published', value: loading ? '—' : String(published), change: activeBrand ? `for ${activeBrand.name}` : 'Select a brand', changeType: 'neutral' as const, icon: <FileText size={15} className="text-orange-600" />, iconBg: 'bg-orange-50', href: '/queue' },
    { label: 'Scheduled Posts', value: loading ? '—' : String(scheduled), change: scheduled > 0 ? 'ready to publish' : 'nothing queued', changeType: (scheduled > 0 ? 'positive' : 'neutral') as 'positive' | 'neutral', icon: <Calendar size={15} className="text-amber-600" />, iconBg: 'bg-amber-50', href: '/calendar' },
    { label: 'Drafts', value: loading ? '—' : String(drafts + failed), change: failed ? `${failed} need immediate attention` : drafts ? 'ready to review' : 'all clear', changeType: 'neutral' as const, icon: <Layers size={15} className="text-gray-500" />, iconBg: 'bg-gray-100', href: '/queue' },
    { label: 'Connected Accounts', value: String(connected), change: disconnected ? `${disconnected} need reconnecting` : connected ? 'ready to post' : 'connect a platform', changeType: (connected > 0 ? 'positive' : 'neutral') as 'positive' | 'neutral', icon: <Wifi size={15} className="text-orange-600" />, iconBg: 'bg-orange-50', href: '/accounts' },
  ];
  const operationalChecks = [
    {
      label: 'Connections',
      value: disconnected ? `${disconnected} need attention` : connected ? `${connected} ready` : 'Not connected',
      detail: disconnected ? 'Reconnect before your next scheduled publish.' : connected ? 'All connected accounts are ready to post.' : 'Connect an account to start publishing.',
      href: '/accounts',
      tone: disconnected ? 'amber' : connected ? 'emerald' : 'gray',
    },
    {
      label: 'Publishing',
      value: failed ? `${failed} failed` : scheduled ? `${scheduled} scheduled` : 'All clear',
      detail: failed ? 'Retry only the destinations that did not publish.' : scheduled ? 'Relay will publish these at their scheduled times.' : 'No publishing work needs attention.',
      href: failed ? `/posts/${posts.find((post) => post.status === 'Failed')?.id}/edit?recovery=1` : '/calendar',
      tone: failed ? 'red' : scheduled ? 'blue' : 'emerald',
    },
    {
      label: 'Next step',
      value: failed || disconnected ? 'Resolve blockers' : drafts ? 'Review drafts' : 'Plan ahead',
      detail: failed || disconnected ? 'Clear known issues before creating more work.' : drafts ? 'Turn ready ideas into scheduled posts.' : 'Keep your publishing rhythm consistent.',
      href: failed || disconnected ? (failed ? `/posts/${posts.find((post) => post.status === 'Failed')?.id}/edit?recovery=1` : '/accounts') : drafts ? '/queue' : '/posts/new',
      tone: failed || disconnected ? 'orange' : 'gray',
    },
  ];

  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 pb-8">
    <section className="relative overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 px-5 py-5 sm:px-6"><div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-200/25 blur-2xl" /><div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Your workspace</p><h1 className="text-2xl font-bold tracking-tight text-gray-900">Good to see you{activeBrand ? `, ${activeBrand.name}` : ''}.</h1><p className="mt-1 text-sm text-gray-500">Here’s the clearest next step for your content today.</p></div><div className="flex flex-wrap gap-2"><Link href="/agent" className="btn-clay-secondary inline-flex h-9 items-center gap-1.5 px-3.5 text-xs font-semibold"><Sparkles size={14} className="text-orange-500" /> Ask Relay</Link><Link href="/posts/new" className="btn-clay-primary inline-flex h-9 items-center gap-1.5 px-3.5 text-xs font-semibold"><FilePlus2 size={14} /> Create post</Link></div></div></section>
    {!activeBrand ? <section className="rounded-2xl border border-dashed border-orange-300 bg-orange-50/40 px-6 py-10 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600"><Sparkles size={19} /></div><h2 className="mt-3 text-base font-bold text-gray-900">Start with a brand workspace</h2><p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500">Create a brand to keep accounts, posts, preferences, and agent context in one place.</p><Link href="/onboarding" className="btn-clay-primary mt-4 inline-flex h-8 items-center gap-1.5 px-3 text-xs font-semibold">Set up your brand <ArrowRight size={13} /></Link></section> : <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</div>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><ShieldCheck size={15} /></span><div><h2 className="text-sm font-bold text-gray-900">Operational health</h2><p className="mt-0.5 text-[11px] text-gray-500">A quick check before your next publish.</p></div></div><span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wide text-gray-400">Live workspace status</span></div>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">{operationalChecks.map((check) => <Link key={check.label} href={check.href} className="group rounded-xl border border-gray-100 bg-gray-50/50 p-3 transition-colors hover:border-orange-200 hover:bg-orange-50/30"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{check.label}</p><span className={`h-2 w-2 rounded-full ${check.tone === 'red' ? 'bg-red-500' : check.tone === 'amber' ? 'bg-amber-500' : check.tone === 'blue' ? 'bg-blue-500' : check.tone === 'emerald' ? 'bg-emerald-500' : 'bg-gray-400'}`} /></div><p className="mt-2 text-xs font-bold text-gray-800">{check.value}</p><p className="mt-1 text-[11px] leading-relaxed text-gray-500">{check.detail}</p></Link>)}</div>
      </section>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]"><section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:p-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-bold text-gray-900">Today’s focus</h2><p className="mt-0.5 text-xs text-gray-500">The tasks that will keep your workspace moving.</p></div><span className="rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-600">Priority</span></div>{focusItems.length ? <div className="space-y-2">{focusItems.slice(0, 3).map((item) => <Link key={item.title} href={item.href} className="group flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition-colors hover:border-orange-200 hover:bg-orange-50/30"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.tone === 'red' ? 'bg-red-50 text-red-600' : item.tone === 'amber' ? 'bg-amber-50 text-amber-600' : item.tone === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{item.icon}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-gray-800">{item.title}</span><span className="mt-0.5 block text-[11px] text-gray-500">{item.detail}</span></span><ArrowRight size={15} className="text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500" /></Link>)}</div> : <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4"><CheckCircle2 size={19} className="shrink-0 text-emerald-600" /><div><p className="text-xs font-bold text-emerald-800">You’re in great shape.</p><p className="mt-0.5 text-[11px] text-emerald-700">Your accounts and content queue do not need attention right now.</p></div></div>}</section><section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:p-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-bold text-gray-900">Up next</h2><p className="mt-0.5 text-xs text-gray-500">Your next scheduled posts.</p></div><Link href="/calendar" className="text-xs font-semibold text-orange-600 hover:text-orange-700">Calendar</Link></div>{upcoming.length ? <div className="space-y-2">{upcoming.map((post) => <Link key={post.id} href={`/posts/${post.id}/edit`} className="block rounded-xl border border-gray-100 p-3 transition-colors hover:border-orange-200 hover:bg-orange-50/30"><p className="truncate text-xs font-semibold text-gray-800">{post.title}</p><p className="mt-1 text-[11px] font-medium text-amber-700">{formatScheduledAt(post.scheduledAt)}</p></Link>)}</div> : <div className="rounded-xl border border-dashed border-gray-200 px-3 py-5 text-center"><Calendar size={17} className="mx-auto text-gray-300" /><p className="mt-2 text-xs font-semibold text-gray-600">Nothing scheduled yet</p><Link href="/posts/new" className="mt-1 inline-block text-[11px] font-semibold text-orange-600 hover:underline">Schedule a post</Link></div>}</section></div>
      {briefing && briefing.items.length > 0 && <section className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4 shadow-2xs sm:p-5"><div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600"><Sparkles size={15} /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-gray-900">Relay briefing</h2><p className="mt-0.5 text-xs text-gray-500">A quick agent check of your workspace.</p></div><Link href="/agent" className="text-xs font-semibold text-orange-600 hover:text-orange-700">Open agent</Link></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{briefing.items.slice(0, 2).map((item, index) => <Link key={`${item.kind}-${index}`} href={item.href} className="rounded-xl border border-orange-100 bg-white px-3 py-2.5 transition-colors hover:border-orange-300"><p className="text-xs font-semibold text-gray-800">{item.title}</p><p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500">{item.detail}</p></Link>)}</div></div></div></section>}
      <PostTable />
    </>}
  </div>;
}
