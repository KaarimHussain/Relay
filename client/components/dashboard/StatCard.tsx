import { cn } from '@/lib/utils';
import Link from 'next/link';

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'neutral';
  icon: React.ReactNode;
  iconBg: string;
  href?: string;
}

export function StatCard({ label, value, change, changeType, icon, iconBg, href }: StatCardProps) {
  const content = (
    <>
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
    </>
  );

  const classes = 'bg-white border border-gray-200 rounded-xl p-3.5 flex flex-col gap-1.5 shadow-2xs transition-all';
  return href
    ? <Link href={href} className={`${classes} hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}>{content}</Link>
    : <div className={classes}>{content}</div>;
}
