'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useAuthStore } from '@/store/auth';
import { ApiError } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const { register, status } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/onboarding');
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(name.trim(), email, password);
      router.replace('/onboarding');
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
    <div className="flex flex-col items-center justify-center min-h-[50vh] py-8 px-4 bg-[#F8F9FA]">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-6">
        <svg width="30" height="30" viewBox="0 0 256 256" fill="none">
          <path d="M 128 256 L 64 256 L 64 192 L 128 192 Z M 256 256 L 192 256 L 192 192 L 256 192 Z M 64 192 L 0 192 L 0 128 L 64 128 Z M 192 192 L 128 192 L 128 128 L 192 128 Z M 128 128 L 64 128 L 64 64 L 128 64 Z M 256 128 L 192 128 L 192 64 L 256 64 Z M 64 64 L 0 64 L 0 0 L 64 0 Z M 192 64 L 128 64 L 128 0 L 192 0 Z" fill="#1A1A1A"/>
        </svg>
        <span className="text-lg font-bold text-gray-900 tracking-tight">Relay</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-[380px] bg-white border border-gray-200 rounded-xl p-6 shadow-2xs">
        <div className="mb-5 text-center">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-0.5">Create your account</h1>
          <p className="text-xs text-gray-500 font-normal">Start scheduling smarter with AI</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-xs font-semibold text-gray-700">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Johnson"
              className="h-8.5 bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 font-medium outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
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
              className="h-8.5 bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 font-medium outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-semibold text-gray-700">
              Password
            </label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !email || !password}
            className="btn-clay-primary w-full h-9 text-xs mt-1 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="mt-4 text-xs text-gray-500 font-medium">
        Already have an account?{' '}
        <Link href="/login" className="text-orange-600 font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
