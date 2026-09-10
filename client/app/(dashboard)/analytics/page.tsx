import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import { CompetitorAnalysis } from '@/components/analytics/CompetitorAnalysis';
import { LinkedInAdLibrary } from '@/components/analytics/LinkedInAdLibrary';
import { ConversionsPanel } from '@/components/analytics/ConversionsPanel';

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-[22px] font-bold text-gray-900 tracking-tight">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Track reach, impressions, and engagement across all your connected platforms.
        </p>
      </div>

      <AnalyticsView />
      <CompetitorAnalysis />
      <LinkedInAdLibrary />
      <ConversionsPanel />
    </div>
  );
}
