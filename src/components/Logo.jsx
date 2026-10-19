export default function Logo({ compact = false, dark = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 512 512" className={compact ? 'h-8 w-8' : 'h-9 w-9'} aria-hidden="true">
        <rect width="512" height="512" rx="112" fill={dark ? '#1f4d3a' : '#2a5f48'} />
        <rect x="112" y="300" width="60" height="100" rx="12" fill="#a3c6b2" />
        <rect x="226" y="228" width="60" height="172" rx="12" fill="#fdfaf3" />
        <rect x="340" y="140" width="60" height="260" rx="12" fill="#fdfaf3" />
        <path d="M120 250 L240 170 L300 200 L400 110" fill="none" stroke="#e4efe7" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="leading-none">
        <div className={`font-serif font-semibold tracking-tight ${compact ? 'text-xl' : 'text-[22px]'} ${dark ? 'text-forest-800' : 'text-cream-50'}`}>Ledger</div>
        {!compact && <div className={`text-[11px] uppercase tracking-[0.18em] mt-1 ${dark ? 'text-ink-soft' : 'text-cream-200/70'}`}>Personal Finance</div>}
      </div>
    </div>
  );
}
