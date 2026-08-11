'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { api, ApiError } from '@/lib/api';
import { ArrowLeft, CheckCircle } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= 8 && password === confirm && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password }, false);
      setDone(true);
      setTimeout(() => router.replace('/login'), 3000);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Unable to connect. Please try again.');
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center py-2">
        <p className="text-sm font-semibold text-gray-700">Invalid reset link</p>
        <p className="text-xs text-gray-400 mt-1">
          This link is missing a token.{' '}
          <Link href="/forgot-password" className="text-orange-600 font-semibold hover:underline">
            Request a new one
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      {done ? (
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle size={22} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-gray-900">Password updated!</p>
            <p className="text-xs text-gray-500 mt-1.5">Redirecting you to sign in…</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5">
            <p className="text-xl font-bold text-gray-900 tracking-tight mb-0.5">Set new password</p>
            <p className="text-xs text-gray-500">Must be at least 8 characters.</p>
          </div>

          {error && (
            <div className="mb-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-medium text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs font-semibold text-gray-700">
                New password
              </label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="confirm" className="text-xs font-semibold text-gray-700">
                Confirm password
              </label>
              <PasswordInput
                id="confirm"
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {mismatch && (
                <p className="text-[11px] text-red-500 font-medium mt-0.5">Passwords don't match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-clay-primary w-full h-9 text-xs mt-1 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4 bg-[#F8F9FA]">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-6">
        <svg width="30" height="30" viewBox="0 0 256 256" fill="none">
          <path d="M 128 256 L 64 256 L 64 192 L 128 192 Z M 256 256 L 192 256 L 192 192 L 256 192 Z M 64 192 L 0 192 L 0 128 L 64 128 Z M 192 192 L 128 192 L 128 128 L 192 128 Z M 128 128 L 64 128 L 64 64 L 128 64 Z M 256 128 L 192 128 L 192 64 L 256 64 Z M 64 64 L 0 64 L 0 0 L 64 0 Z M 192 64 L 128 64 L 128 0 L 192 0 Z" fill="#1A1A1A"/>
        </svg>
        <span className="text-lg font-bold text-gray-900 tracking-tight">Relay</span>
      </div>

      <div className="w-full max-w-[380px] bg-white border border-gray-200 rounded-xl p-6 shadow-2xs">
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>

      <Link
        href="/login"
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={13} /> Back to sign in
      </Link>
    </div>
  );
}
