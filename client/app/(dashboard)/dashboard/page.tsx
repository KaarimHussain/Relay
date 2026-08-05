'use client';

import { useEffect } from 'react';
import { FileText, Calendar, Layers, Wifi } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { PostTable } from '@/components/dashboard/PostTable';
import { useBrandStore } from '@/store/brand';
import { usePostStore } from '@/store/post';
import { useAccountStore } from '@/store/account';

export default function DashboardPage() {
  const activeBrand = useBrandStore((s) => s.activeBrand());
  const posts = usePostStore((s) => s.posts);
  const postStatus = usePostStore((s) => s.status);
  const fetchPosts = usePostStore((s) => s.fetchPosts);
  const accounts = useAccountStore((s) => s.accounts);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);

  useEffect(() => {
    if (!activeBrand) return;
    fetchPosts(activeBrand.id);
    fetchAccounts(activeBrand.id);
  }, [activeBrand?.id]);

  const published  = posts.filter((p) => p.status === 'Published').length;
  const scheduled  = posts.filter((p) => p.status === 'Scheduled').length;
  const drafts     = posts.filter((p) => p.status === 'Draft' || p.status === 'Failed').length;
  const connected  = accounts.filter((a) => a.status === 'Active').length;
  const loading    = postStatus === 'loading' || postStatus === 'idle';

  const stats = [
    {
      label: 'Posts Published',
      value: loading ? '—' : String(published),
      change: activeBrand ? `for ${activeBrand.name}` : 'Select a brand',
      changeType: 'neutral' as const,
      icon: <FileText size={15} className="text-orange-600" />,
      iconBg: 'bg-orange-50',
    },
    {
      label: 'Scheduled Posts',
      value: loading ? '—' : String(scheduled),
      change: scheduled > 0 ? 'ready to publish' : 'nothing queued',
      changeType: (scheduled > 0 ? 'positive' : 'neutral') as 'positive' | 'neutral',
      icon: <Calendar size={15} className="text-amber-600" />,
      iconBg: 'bg-amber-50',
    },
    {
      label: 'Drafts',
      value: loading ? '—' : String(drafts),
      change: drafts > 0 ? 'need attention' : 'all clear',
      changeType: 'neutral' as const,
      icon: <Layers size={15} className="text-gray-500" />,
      iconBg: 'bg-gray-100',
    },
    {
      label: 'Connected Accounts',
      value: String(connected),
      change: connected > 0 ? `${accounts.length - connected} disconnected` : 'connect a platform',
      changeType: (connected > 0 ? 'positive' : 'neutral') as 'positive' | 'neutral',
      icon: <Wifi size={15} className="text-orange-600" />,
      iconBg: 'bg-orange-50',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeBrand
              ? `Here's what's happening with ${activeBrand.name}.`
              : "Select a brand from the sidebar to get started."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <PostTable />
    </div>
  );
}
