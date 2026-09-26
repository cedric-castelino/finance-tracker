const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = n => String(n).padStart(2, '0');

export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO() {
  return toISO(new Date());
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(iso, n) {
  const d = parseISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
}

export function monthKey(iso) {
  return iso.slice(0, 7);
}

export function monthLabel(key, { year = true } = {}) {
  const [y, m] = key.split('-').map(Number);
  return year ? `${MONTHS[m - 1]} ${String(y).slice(2)}` : MONTHS[m - 1];
}

export function startOfMonth(iso) {
  return iso.slice(0, 8) + '01';
}

export function endOfMonth(iso) {
  const d = parseISO(startOfMonth(iso));
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function monthsBetween(fromIso, toIso) {
  const out = [];
  let cur = startOfMonth(fromIso);
  const end = startOfMonth(toIso);
  while (cur <= end && out.length < 600) {
    out.push(monthKey(cur));
    cur = addMonths(cur, 1);
  }
  return out;
}

export function daysBetween(fromIso, toIso) {
  return Math.round((parseISO(toIso) - parseISO(fromIso)) / 86400000);
}

export function formatDate(iso, { weekday = false, year = true } = {}) {
  if (!iso) return '';
  const d = parseISO(iso);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}${year ? ` ${d.getFullYear()}` : ''}`;
  return weekday ? `${DAYS[d.getDay()]}, ${base}` : base;
}

export function relativeDay(iso) {
  const t = todayISO();
  if (iso === t) return 'Today';
  if (iso === addDays(t, -1)) return 'Yesterday';
  return formatDate(iso, { weekday: true, year: iso.slice(0, 4) !== t.slice(0, 4) });
}

export function weekdayIndex(iso) {
  return (parseISO(iso).getDay() + 6) % 7; // Mon = 0
}
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Accepts 2026-09-23, 23/09/2026, 23-Sep-2026, 23 Sep 2026, 23-Sep-26
export function parseLooseDate(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${pad(m[2])}-${pad(m[1])}`;
  }
  m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3,})[\s-](\d{2,4})$/);
  if (m) {
    const idx = MONTHS.findIndex(x => x.toLowerCase() === m[2].slice(0, 3).toLowerCase());
    if (idx >= 0) {
      const y = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${y}-${pad(idx + 1)}-${pad(m[1])}`;
    }
  }
  return null;
}
