import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import { CompetitorAnalysis } from '@/components/analytics/CompetitorAnalysis';
import { LinkedInAdLibrary } from '@/components/analytics/LinkedInAdLibrary';
import { ConversionsPanel } from '@/components/analytics/ConversionsPanel';

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-600">Performance workspace</p>
          <h1 className="mt-1 text-xl sm:text-[22px] font-bold text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track reach, impressions, and engagement across all your connected platforms.
          </p>
        </div>
        <Link href="/posts/new" className="btn-clay-primary h-9 shrink-0 px-3.5 text-xs inline-flex items-center gap-1.5">
          <Plus size={14} /> Create post
        </Link>
      </div>

      <AnalyticsView />
      <CompetitorAnalysis />
      <LinkedInAdLibrary />
      <ConversionsPanel />
    </div>
  );
}
import Link from 'next/link';
import { Plus } from 'lucide-react';
