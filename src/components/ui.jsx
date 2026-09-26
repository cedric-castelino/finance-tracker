import { useEffect, useId } from 'react';
import { NavLink } from 'react-router-dom';
import { XMarkIcon, ArrowUpRightIcon, ArrowDownRightIcon } from '@heroicons/react/24/outline';
import { money, pct } from '../lib/format';

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-5 md:mb-7">
      <div>
        {eyebrow && <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-gold-600 mb-1">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="text-ink-soft mt-1 text-[15px]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SubNav({ items }) {
  return (
    <div className="seg mb-5 md:mb-6 w-full sm:w-auto">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex-1 sm:flex-none text-center h-9 px-4 leading-9 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              isActive ? 'bg-white text-forest-900 shadow-sm' : 'text-ink-soft hover:text-forest-900'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

export function Segmented({ value, onChange, options, className = '', size }) {
  return (
    <div className={`seg ${className}`} role="group">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`${size === 'lg' ? '!h-10 flex-1' : ''} ${o.className || ''}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub, tone, icon: Icon, emphasis = false, className = '' }) {
  return (
    <div className={`card card-pad ${emphasis ? '!bg-forest-900 !border-forest-900 text-cream-50' : ''} ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className={`text-[12px] font-semibold uppercase tracking-[0.08em] ${emphasis ? 'text-cream-200/70' : 'text-muted'}`}>{label}</div>
        {Icon && <Icon className={`h-5 w-5 ${emphasis ? 'text-gold-500' : 'text-forest-400'}`} />}
      </div>
      <div className={`num mt-2 text-[22px] md:text-[26px] font-semibold tracking-tight ${emphasis ? 'text-white' : tone || 'text-forest-900'}`}>{value}</div>
      {sub && <div className={`mt-1 text-[13px] ${emphasis ? 'text-cream-200/70' : 'text-ink-soft'}`}>{sub}</div>}
    </div>
  );
}

export function Delta({ value, percent, className = '' }) {
  const up = value > 0.004;
  const down = value < -0.004;
  const Icon = up ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span className={`badge num ${up ? 'badge-gain' : down ? 'badge-loss' : 'badge-neutral'} ${className}`}>
      {(up || down) && <Icon className="h-3 w-3" strokeWidth={2.5} />}
      {money(value, { sign: true })}
      {percent != null && <span className="opacity-80">({pct(percent, { sign: true })})</span>}
    </span>
  );
}

export function Card({ title, action, children, className = '', pad = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 md:px-5 pt-4 md:pt-5">
          {title && <h2 className="card-title">{title}</h2>}
          {action}
        </div>
      )}
      <div className={pad ? 'card-pad' : ''}>{children}</div>
    </section>
  );
}

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      {Icon && (
        <div className="h-12 w-12 rounded-2xl bg-forest-100 text-forest-700 grid place-items-center mb-3">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="font-semibold text-forest-900">{title}</div>
      {children && <p className="text-sm text-ink-soft mt-1 max-w-sm">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children, className = '' }) {
  const id = useId();
  return (
    <div className={className}>
      {label && <label className="label" htmlFor={id}>{label}</label>}
      {typeof children === 'function' ? children(id) : children}
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}

// Bottom sheet on phones, centred dialog on larger screens.
export function Modal({ open, onClose, title, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-forest-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`animate-sheet relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92dvh] flex flex-col bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl`}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
          <h3 className="font-serif text-xl font-semibold text-forest-900">{title}</h3>
          <button className="btn btn-ghost btn-icon -mr-2" onClick={onClose} aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 border-t border-line flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ open, onClose, onConfirm, title, children, confirmLabel = 'Delete', danger = confirmLabel === 'Delete' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </>
      }
    >
      <p className="text-ink-soft">{children}</p>
    </Modal>
  );
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter = money }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white border border-line shadow-lg px-3 py-2.5 text-sm min-w-[160px]">
      {label != null && <div className="font-semibold text-forest-900 mb-1.5">{labelFormatter ? labelFormatter(label) : label}</div>}
      {payload.map(p => (
        <div key={p.dataKey || p.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-2 text-ink-soft">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color || p.payload?.fill }} />
            {p.name}
          </span>
          <span className="num font-semibold text-ink">{valueFormatter(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-soft">
      {items.map(i => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className={i.line ? 'h-[3px] w-4 rounded-full' : 'h-2.5 w-2.5 rounded-sm'} style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
