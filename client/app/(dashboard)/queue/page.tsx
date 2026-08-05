import { QueueView } from '@/components/queue/QueueView';

export default function QueuePage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Post Queue</h1>
          <p className="text-[14px] text-gray-500 mt-0.5">
            Manage all your scheduled, published, and draft posts in one place.
          </p>
        </div>
      </div>

      <QueueView />
    </div>
  );
}
