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
