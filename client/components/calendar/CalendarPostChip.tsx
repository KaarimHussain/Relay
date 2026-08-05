import { cn } from '@/lib/utils';
import {
  InstagramIcon, XIcon, LinkedInIcon, FacebookIcon, TikTokIcon,
} from '@/components/ui/platform-icons';

export type CalendarPost = {
  id: string;
  title: string;
  platform: 'instagram' | 'x' | 'linkedin' | 'facebook' | 'tiktok';
  status: 'scheduled' | 'published' | 'draft';
  time: string;
};

const PLATFORM_META: Record<
  CalendarPost['platform'],
  { Icon: React.ComponentType<{ className?: string }>; iconCls: string; bg: string; border: string; text: string; label: string }
> = {
  instagram: { Icon: InstagramIcon, iconCls: 'text-pink-600',  bg: 'bg-pink-50',   border: 'border-pink-200/60',  text: 'text-pink-900',  label: 'Instagram' },
  x:         { Icon: XIcon,         iconCls: 'text-gray-800',  bg: 'bg-gray-100',  border: 'border-gray-300/60',  text: 'text-gray-900',  label: 'X'         },
  linkedin:  { Icon: LinkedInIcon,  iconCls: 'text-blue-600',  bg: 'bg-blue-50',   border: 'border-blue-200/60',  text: 'text-blue-900',  label: 'LinkedIn'  },
  facebook:  { Icon: FacebookIcon,  iconCls: 'text-blue-700',  bg: 'bg-blue-50',   border: 'border-blue-200/60',  text: 'text-blue-900',  label: 'Facebook'  },
  tiktok:    { Icon: TikTokIcon,    iconCls: 'text-gray-900',  bg: 'bg-gray-100',  border: 'border-gray-300/60',  text: 'text-gray-900',  label: 'TikTok'    },
};

const STATUS_STRIP: Record<CalendarPost['status'], string> = {
  scheduled: 'bg-amber-400',
  published: 'bg-emerald-500',
  draft:     'bg-gray-300',
};

interface CalendarPostChipProps {
  post: CalendarPost;
  onClick?: () => void;
  compact?: boolean; // mobile: icon-only mode
}

export function CalendarPostChip({ post, onClick, compact = false }: CalendarPostChipProps) {
  const { Icon, iconCls, bg, border, text } = PLATFORM_META[post.platform];
  const strip = STATUS_STRIP[post.status];

  if (compact) {
    // Mobile: just icon pill, no text
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        className={cn(
          'flex items-center justify-center w-5 h-5 rounded-md border shadow-2xs transition-transform hover:scale-110 active:scale-95',
          bg, border
        )}
        title={`${post.platform} · ${post.title}`}
      >
        <Icon className={cn('w-3 h-3', iconCls)} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cn(
        'w-full flex items-center gap-1.5 rounded-lg border overflow-hidden text-left transition-all duration-150',
        'hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:shadow-none shadow-2xs',
        bg, border
      )}
    >
      {/* Status strip */}
      <span className={cn('w-1 self-stretch shrink-0', strip)} />

      {/* Icon */}
      <Icon className={cn('w-3 h-3 shrink-0 my-1', iconCls)} />

      {/* Text */}
      <div className="flex-1 min-w-0 py-[3px] pr-1.5">
        {post.time !== '—' && (
          <p className="text-[9px] font-semibold text-gray-400 leading-none mb-0.5 tabular-nums">{post.time}</p>
        )}
        <p className={cn('text-[10px] font-semibold truncate leading-tight', text)}>{post.title}</p>
      </div>
    </button>
  );
}
