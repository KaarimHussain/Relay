import { Suspense } from 'react';
import { CreatePostView } from '@/components/posts/CreatePostView';

export default function NewPostPage() {
  return (
    <Suspense>
      <CreatePostView />
    </Suspense>
  );
}
