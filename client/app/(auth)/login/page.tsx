'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useAuthStore } from '@/store/auth';
import { ApiError } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, status } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, go to dashboard immediately
  useEffect(() => {
    if (status === 'authenticated') {
      const from = searchParams.get('from') ?? '/dashboard';
      router.replace(from);
    }
  }, [status, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      const from = searchParams.get('from') ?? '/dashboard';
      router.replace(from);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to connect. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center py-8">
      {/* Logo */}
      <div className="mb-7 flex items-center gap-2 lg:hidden">
        <svg width="30" height="30" viewBox="0 0 256 256" fill="none">
          <path d="M 128 256 L 64 256 L 64 192 L 128 192 Z M 256 256 L 192 256 L 192 192 L 256 192 Z M 64 192 L 0 192 L 0 128 L 64 128 Z M 192 192 L 128 192 L 128 128 L 192 128 Z M 128 128 L 64 128 L 64 64 L 128 64 Z M 256 128 L 192 128 L 192 64 L 256 64 Z M 64 64 L 0 64 L 0 0 L 64 0 Z M 192 64 L 128 64 L 128 0 L 192 0 Z" fill="#1A1A1A" />
        </svg>
        <span className="text-lg font-bold text-gray-900 tracking-tight">Relay</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-[420px] rounded-2xl border border-gray-200/90 bg-white p-6 shadow-xl shadow-gray-200/55 sm:p-8">
        <div className="mb-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
            <svg width="21" height="21" viewBox="0 0 256 256" fill="none" aria-label="Relay">
              <path d="M 128 256 L 64 256 L 64 192 L 128 192 Z M 256 256 L 192 256 L 192 192 L 256 192 Z M 64 192 L 0 192 L 0 128 L 64 128 Z M 192 192 L 128 192 L 128 128 L 192 128 Z M 128 128 L 64 128 L 64 64 L 128 64 Z M 256 128 L 192 128 L 192 64 L 256 64 Z M 64 64 L 0 64 L 0 0 L 64 0 Z M 192 64 L 128 64 L 128 0 L 192 0 Z" fill="#F97316" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to continue to your Relay workspace.</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-10 bg-gray-50 border border-gray-200 rounded-xl text-[13px] px-3 font-medium outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-semibold text-gray-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-orange-600 font-semibold hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !email || !password}
            className="btn-clay-primary w-full h-10 text-[13px] mt-1 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="mt-5 text-xs text-gray-500 font-medium">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-orange-600 font-semibold hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
