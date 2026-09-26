import Logo from '../components/Logo';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.05fr_1fr]">
      <div className="hidden lg:flex flex-col justify-between bg-forest-900 text-cream-50 p-12 relative overflow-hidden">
        <Logo />
        <div className="relative z-10 max-w-md">
          <h2 className="font-serif text-4xl font-semibold leading-tight">Every dollar, accounted for.</h2>
          <p className="text-cream-200/75 mt-4 text-lg">Track spending, grow your portfolio and watch your net worth climb — from your desk or your phone.</p>
        </div>
        <div className="text-sm text-cream-200/50">Your data stays on your own server.</div>
        <svg className="absolute -right-24 -bottom-16 w-[520px] opacity-[0.08]" viewBox="0 0 400 300" aria-hidden="true">
          <path d="M0 260 L80 200 L140 220 L220 120 L290 150 L400 30" fill="none" stroke="#f5efe2" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex flex-col">
        <div className="lg:hidden bg-forest-900 safe-top">
          <div className="px-6 py-6"><Logo /></div>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="text-ink-soft mt-1.5 mb-7">{subtitle}</p>}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
