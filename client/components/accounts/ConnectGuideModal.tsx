'use client';

import { useEffect } from 'react';
import { X, ArrowRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlatformDef } from './PlatformCard';

interface ConnectGuideModalProps {
  open: boolean;
  platform: PlatformDef;
  onClose: () => void;
  onContinue: () => void;
}

export function ConnectGuideModal({ open, platform, onClose, onContinue }: ConnectGuideModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const steps = platform.guideSteps ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-4 border-b border-gray-100">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', platform.color)}>
            {platform.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">
              Before you connect {platform.name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              A few quick things to check first — takes about 2 minutes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors -mt-1 -mr-1 p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {platform.guideIntro && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 bg-orange-50 border border-orange-100 rounded-lg">
              <Info size={14} className="text-orange-500 mt-0.5 shrink-0" />
              <p className="text-[12.5px] text-orange-700 leading-relaxed">{platform.guideIntro}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-900 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">{step.title}</p>
                  <p className="text-[12.5px] text-gray-500 leading-relaxed mt-0.5">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-gray-50 border-t border-gray-100 sticky bottom-0">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            Not yet, cancel
          </button>
          <button
            onClick={onContinue}
            className="btn-clay-primary h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            I've done this, continue <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
