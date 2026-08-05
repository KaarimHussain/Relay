import { CalendarView } from '@/components/calendar/CalendarView';

export default function CalendarPage() {
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Content Calendar</h1>
        <p className="text-[14px] text-gray-500 mt-0.5">
          Plan and schedule your posts across all connected platforms.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <CalendarView />
      </div>
    </div>
  );
}
