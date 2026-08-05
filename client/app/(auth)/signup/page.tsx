import Link from 'next/link';
import { PasswordInput } from '@/components/auth/PasswordInput';

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4 bg-[#F8F9FA]">
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

        {/* Google OAuth */}
        <button
          type="button"
          className="btn-clay-secondary w-full h-9 text-xs gap-2 mb-4 font-semibold"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.59 2.41v2h2.58c1.51-1.39 2.39-3.44 2.39-5.87z" fill="#4285F4" />
            <path d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.58-2a4.8 4.8 0 01-7.15-2.52H.96v2.06A8 8 0 008 16z" fill="#34A853" />
            <path d="M3.56 9.54A4.84 4.84 0 013.3 8c0-.54.09-1.06.26-1.54V4.4H.96A8 8 0 000 8c0 1.29.31 2.51.96 3.6l2.6-2.06z" fill="#FBBC05" />
            <path d="M8 3.18c1.22 0 2.31.42 3.17 1.24l2.37-2.37A8 8 0 00.96 4.4l2.6 2.06A4.77 4.77 0 018 3.18z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Form */}
        <form className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-xs font-semibold text-gray-700">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Alex Johnson"
              className="h-8.5 bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 font-medium outline-none focus:bg-white focus:border-orange-500"
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
              placeholder="you@example.com"
              className="h-8.5 bg-gray-50 border border-gray-200 rounded-lg text-xs px-3 font-medium outline-none focus:bg-white focus:border-orange-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-semibold text-gray-700">
              Password
            </label>
            <PasswordInput id="password" name="password" placeholder="Min. 8 characters" />
          </div>

          <button
            type="submit"
            formAction="/onboarding"
            className="btn-clay-primary w-full h-9 text-xs mt-1 font-semibold"
          >
            Create account
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
