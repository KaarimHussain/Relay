'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Info } from 'lucide-react';
import { useAccountStore, Platform, ConnectAccountPayload } from '@/store/account';
import { ApiError } from '@/lib/api';

interface ConnectAccountModalProps {
  brandId: string;
  platform: Platform;
  platformName: string;
  onClose: () => void;
  onConnected?: () => void;
}

export function ConnectAccountModal({
  brandId,
  platform,
  platformName,
  onClose,
  onConnected,
}: ConnectAccountModalProps) {
  const connectAccount = useAccountStore((s) => s.connectAccount);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [platformUserId, setPlatformUserId] = useState('');
  const [platformHandle, setPlatformHandle] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const payload: ConnectAccountPayload = {
        platform,
        platformUserId: platformUserId.trim(),
        platformHandle: platformHandle.trim(),
        accessToken: accessToken.trim(),
      };
      await connectAccount(brandId, payload);
      onConnected?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to connect account');
      setIsSubmitting(false);
    }
  };

  const canSubmit = platformUserId.trim() && platformHandle.trim() && accessToken.trim();

  const modal = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-[440px] bg-white rounded-xl border border-gray-200 shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Connect {platformName}</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">
              Link your {platformName} account to this brand.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 flex flex-col gap-4">
            {/* Dev-mode notice */}
            <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Info size={13} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-700 leading-relaxed">
                In production this will be an OAuth redirect flow. For now, paste the credentials directly to wire the API.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-medium text-red-700">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-gray-700">
                Platform User ID
              </label>
              <input
                type="text"
                required
                value={platformUserId}
                onChange={(e) => setPlatformUserId(e.target.value)}
                placeholder="e.g. 123456789"
                className="w-full h-[38px] px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-gray-700">
                Handle / Username
              </label>
              <input
                type="text"
                required
                value={platformHandle}
                onChange={(e) => setPlatformHandle(e.target.value)}
                placeholder="e.g. @yourbrand"
                className="w-full h-[38px] px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-gray-700">
                Access Token
              </label>
              <input
                type="password"
                required
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Paste access token"
                className="w-full h-[38px] px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors font-mono"
              />
              <p className="text-[11px] text-gray-400">
                Stored encrypted at rest — never exposed after save.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-clay-secondary h-[34px] px-4 text-[13px] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="btn-clay-primary h-[34px] px-4 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isSubmitting && <Loader2 size={13} className="animate-spin" />}
              {isSubmitting ? 'Connecting…' : 'Connect account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
