export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center relative overflow-hidden">
      {/* Soft indigo glow — decorative */}
      <div className="absolute w-[640px] h-[480px] bg-indigo-500/[0.05] rounded-full blur-[120px] pointer-events-none" />
      <div className="relative z-10 w-full px-4 py-12">{children}</div>
    </div>
  );
}
