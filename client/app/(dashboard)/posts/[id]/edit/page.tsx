import { use } from 'react';
import { EditPostView } from '@/components/posts/EditPostView';

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EditPostView postId={id} />;
}
