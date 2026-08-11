import { ABTestingView } from '@/components/ab-testing/ABTestingView';

export default function ABTestingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-[22px] font-bold text-gray-900 tracking-tight">A/B Testing</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Test two captions or send times against each other and see which one wins.
        </p>
      </div>

      <ABTestingView />
    </div>
  );
}
