import { StatCard } from '@/components/dashboard/StatCard';
import { PostTable } from '@/components/dashboard/PostTable';
import { FileText, Calendar, TrendingUp, Users, Sparkles } from 'lucide-react';

const stats = [
  {
    label: 'Posts Published',
    value: '142',
    change: '+12 this week',
    changeType: 'positive' as const,
    icon: <FileText size={15} className="text-indigo-600" />,
    iconBg: 'bg-indigo-50',
  },
  {
    label: 'Scheduled Posts',
    value: '38',
    change: '+5 today',
    changeType: 'positive' as const,
    icon: <Calendar size={15} className="text-amber-600" />,
    iconBg: 'bg-amber-50',
  },
  {
    label: 'Avg. Engagement',
    value: '4.7%',
    change: 'Same as last week',
    changeType: 'neutral' as const,
    icon: <TrendingUp size={15} className="text-emerald-600" />,
    iconBg: 'bg-emerald-50',
  },
  {
    label: 'Total Followers',
    value: '24.3K',
    change: '+310 this month',
    changeType: 'positive' as const,
    icon: <Users size={15} className="text-violet-600" />,
    iconBg: 'bg-violet-50',
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-xs text-gray-500 mt-0.5">Here&apos;s what&apos;s happening with your connected brands today.</p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50/80 text-indigo-700 rounded-md border border-indigo-100 text-xs font-semibold">
          <Sparkles size={13} className="text-indigo-600" />
          <span>Auto-Scheduler Active</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Post queue table */}
      <PostTable />
    </div>
  );
}
