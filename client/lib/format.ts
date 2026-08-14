export function formatScheduledAt(iso: string | null | undefined): string {
  if (!iso) return 'Not scheduled';
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const postDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (postDay.getTime() === today.getTime()) return `Today · ${time}`;
  if (postDay.getTime() === tomorrow.getTime()) return `Tomorrow · ${time}`;
  const day = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${day} · ${time}`;
}

export function sortDate(iso: string | null | undefined): number {
  if (!iso) return 0;
  return new Date(iso).getTime();
}

// Compact relative time, e.g. "just now", "5m ago", "3h ago", "2d ago".
export function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 45_000) return 'just now';
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(diff / 3_600_000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(diff / 86_400_000);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
