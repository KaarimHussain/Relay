export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f8fb]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.82fr)]">
        <aside className="relative hidden overflow-hidden bg-[#17121b] px-10 py-10 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(132deg, #12151f 0%, #251229 31%, #8b2b3b 61%, #f07824 100%)' }} />
          <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'linear-gradient(42deg, transparent 0%, rgba(168,85,247,0.34) 37%, transparent 58%), linear-gradient(156deg, transparent 18%, rgba(251,191,36,0.26) 62%, transparent 78%)' }} />
          <div className="relative flex items-center gap-2"><svg width="31" height="31" viewBox="0 0 256 256" fill="none" aria-hidden="true"><path d="M 128 256 L 64 256 L 64 192 L 128 192 Z M 256 256 L 192 256 L 192 192 L 256 192 Z M 64 192 L 0 192 L 0 128 L 64 128 Z M 192 192 L 128 192 L 128 128 L 192 128 Z M 128 128 L 64 128 L 64 64 L 128 64 Z M 256 128 L 192 128 L 192 64 L 256 64 Z M 64 64 L 0 64 L 0 0 L 64 0 Z M 192 64 L 128 64 L 128 0 L 192 0 Z" fill="#FFFFFF" /></svg><span className="text-xl font-bold tracking-tight">Relay</span></div>
          <div className="relative my-auto max-w-md"><span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-orange-100">AI SOCIAL WORKSPACE</span><h2 className="mt-5 text-4xl font-bold leading-[1.12] tracking-tight">Your content operation, finally in one place.</h2><p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-300">Plan, create, schedule, and improve your social content with a workspace that keeps your brand in context.</p><div className="mt-8 space-y-3">{['Create and schedule content in minutes', 'Keep every brand and channel organized', 'Use Relay Agent for your next best move'].map((item, index) => <div key={item} className="flex items-center gap-3 text-sm text-gray-100"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold">{index + 1}</span>{item}</div>)}</div></div>
          <p className="relative text-xs text-gray-400">Built for focused social teams.</p>
        </aside>
        <main className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-8" style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #fff8f2 45%, #f8f4ff 100%)' }}><div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/70 to-transparent" /><div className="relative w-full">{children}</div></main>
      </div>
    </div>
  );
}
