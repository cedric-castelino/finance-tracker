import Logo from '../components/Logo';
import { Waves, Dots } from '../components/Decor';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.05fr_1fr]">
      <div className="hidden lg:flex flex-col bg-cream-100 border-r border-line p-12 relative overflow-hidden">
        <Logo dark />
        <div className="relative z-10 max-w-md mt-24">
          <Dots count={4} className="mb-5" />
          <h2 className="font-serif text-4xl font-semibold leading-tight text-forest-800">Every dollar, accounted for.</h2>
          <p className="text-ink-soft mt-4 text-lg">Track spending, grow your portfolio and watch your net worth climb — from your desk or your phone.</p>
          <p className="text-sm text-muted mt-6">Your data stays on your own server.</p>
        </div>
        <Waves corner="br" className="w-full h-[42%]" />
      </div>
      <div className="flex flex-col">
        <div className="lg:hidden relative overflow-hidden bg-cream-100 border-b border-line safe-top">
          <div className="relative px-6 py-6"><Logo dark /></div>
          <Waves corner="br" className="w-40 h-16" />
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
