import { MediaLibraryView } from '@/components/media/MediaLibraryView';

export default function MediaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Media Library</h1>
        <p className="text-[14px] text-gray-500 mt-0.5">
          Manage your images, videos, and GIFs. Reuse assets across posts and campaigns.
        </p>
      </div>

      <MediaLibraryView />
    </div>
  );
}
