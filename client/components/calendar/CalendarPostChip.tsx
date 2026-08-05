import { cn } from '@/lib/utils';

export type CalendarPost = {
  id: number;
  title: string;
  platform: 'instagram' | 'x' | 'linkedin' | 'facebook' | 'tiktok';
  status: 'scheduled' | 'published' | 'draft';
  time: string;
};

const PLATFORM_STYLES: Record<CalendarPost['platform'], { dot: string; bg: string; text: string; border: string }> = {
  instagram: { dot: 'bg-pink-500',   bg: 'bg-pink-50/90',   text: 'text-pink-700', border: 'border-pink-200/80' },
  x:         { dot: 'bg-gray-800',   bg: 'bg-gray-100/90',  text: 'text-gray-800', border: 'border-gray-300/80' },
  linkedin:  { dot: 'bg-blue-600',   bg: 'bg-blue-50/90',   text: 'text-blue-700', border: 'border-blue-200/80' },
  facebook:  { dot: 'bg-blue-700',   bg: 'bg-blue-50/90',   text: 'text-blue-800', border: 'border-blue-200/80' },
  tiktok:    { dot: 'bg-gray-900',   bg: 'bg-gray-100/90',  text: 'text-gray-900', border: 'border-gray-300/80' },
};

interface CalendarPostChipProps {
  post: CalendarPost;
  onClick?: () => void;
}

export function CalendarPostChip({ post, onClick }: CalendarPostChipProps) {
  const style = PLATFORM_STYLES[post.platform];

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cn(
        'w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-left transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 shadow-2xs border font-medium cursor-pointer',
        style.bg,
        style.border
      )}
    >
      <span className={cn('w-2 h-2 rounded-full shrink-0 shadow-2xs', style.dot)} />
      <span className={cn('text-[11px] font-bold truncate leading-snug', style.text)}>
        {post.time} · {post.title}
      </span>
    </button>
  );
}
