import { TemplatesView } from '@/components/templates/TemplatesView';

export default function TemplatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-[22px] font-bold text-gray-900 tracking-tight">Templates</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Save your best-performing post formats and reuse them with one click.
        </p>
      </div>

      <TemplatesView />
    </div>
  );
}
