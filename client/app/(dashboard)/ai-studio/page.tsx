import { AIStudioView } from '@/components/ai/AIStudioView';

export default function AIStudioPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl sm:text-[22px] font-bold text-gray-900 tracking-tight">AI Studio</h1>
          <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
            Beta
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Generate captions, content ideas, and hashtags with AI — tailored to your brand voice.
        </p>
      </div>

      <AIStudioView />
    </div>
  );
}
