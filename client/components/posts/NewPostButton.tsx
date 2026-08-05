import Link from 'next/link';
import { Plus } from 'lucide-react';

export function NewPostButton() {
  return (
    <Link
      href="/posts/new"
      className="btn-clay-primary h-7.5 px-3 text-xs gap-1 font-semibold inline-flex items-center"
    >
      <Plus size={13} strokeWidth={2.5} />
      New post
    </Link>
  );
}
