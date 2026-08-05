import { AnalyticsView } from '@/components/analytics/AnalyticsView';

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Analytics</h1>
        <p className="text-[14px] text-gray-500 mt-0.5">
          Track reach, impressions, and engagement across all your connected platforms.
        </p>
      </div>

      <AnalyticsView />
    </div>
  );
}
