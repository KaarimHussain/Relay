import { TrendsView } from '@/components/trends/TrendsView';

export default function TrendsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-[22px] font-bold text-gray-900 tracking-tight">Trends</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Trending hashtags and audio to inspire your next post — Relay surfaces them, you decide what to use.
        </p>
      </div>

      <TrendsView />
    </div>
  );
}
