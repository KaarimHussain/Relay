import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'neutral';
  icon: React.ReactNode;
  iconBg: string;
}

export function StatCard({ label, value, change, changeType, icon, iconBg }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col gap-1.5 shadow-2xs">
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className={cn('flex items-center justify-center w-7 h-7 rounded-lg shrink-0', iconBg)}>
          {icon}
        </div>
      </div>

      <div className="text-xl font-bold text-gray-900 tracking-tight leading-none">
        {value}
      </div>

      <div className="flex items-center gap-1 mt-0.5">
        <span
          className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold',
            changeType === 'positive'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-gray-100 text-gray-600'
          )}
        >
          {change}
        </span>
      </div>
    </div>
  );
}
