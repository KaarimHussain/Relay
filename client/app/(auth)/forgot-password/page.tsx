'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email }, false);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Unable to connect. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
        {sent ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <Mail size={22} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-gray-900">Check your inbox</p>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                If <span className="font-semibold text-gray-700">{email}</span> is registered, we've sent a
                password reset link. It expires in 1 hour.
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Didn't receive it? Check your spam folder or{' '}
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="text-orange-600 font-semibold hover:underline"
              >
                try again
              </button>
              .
            </p>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <div className="mb-5">
              <p className="text-xl font-bold text-gray-900 tracking-tight mb-0.5">Forgot password?</p>
              <p className="text-xs text-gray-500">Enter your email and we'll send you a reset link.</p>
            </div>

            {error && (
              <div className="mb-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-medium text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-xs font-semibold text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-8.5 bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 font-medium outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !email}
                className="btn-clay-primary w-full h-9 text-xs mt-1 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
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
