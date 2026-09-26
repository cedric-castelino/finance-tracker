const currencyFmt = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactFmt = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', notation: 'compact', maximumFractionDigits: 1 });
const numberFmt = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 4 });

export function money(value, { sign = false } = {}) {
  const v = Number(value) || 0;
  const s = currencyFmt.format(Math.abs(v));
  if (v < 0) return `-${s}`;
  if (sign && v > 0) return `+${s}`;
  return s;
}

export function moneyCompact(value) {
  const v = Number(value) || 0;
  if (Math.abs(v) < 1000) return money(v).replace(/\.00$/, '');
  return compactFmt.format(v);
}

export function num(value) {
  return numberFmt.format(Number(value) || 0);
}

export function pct(value, { sign = false, digits = 2 } = {}) {
  const v = Number(value) || 0;
  if (!Number.isFinite(v)) return '—';
  const s = `${Math.abs(v * 100).toFixed(digits)}%`;
  if (v < 0) return `-${s}`;
  if (sign && v > 0) return `+${s}`;
  return s;
}

export const toneClass = v => (v > 0.004 ? 'text-gain' : v < -0.004 ? 'text-loss' : 'text-ink-soft');
