import { addDays, addMonths } from './dates';

export const FREQUENCIES = [
  { value: 'daily', label: 'Daily', noun: 'day' },
  { value: 'weekly', label: 'Weekly', noun: 'week' },
  { value: 'fortnightly', label: 'Fortnightly', noun: 'fortnight' },
  { value: 'monthly', label: 'Monthly', noun: 'month' },
  { value: 'yearly', label: 'Yearly', noun: 'year' },
];
export const frequencyLabel = f => FREQUENCIES.find(x => x.value === f)?.label || f;

// Mirrors server/recurring.cjs: occurrences always count from the start date so months don't drift.
function occurrence(start, frequency, n) {
  switch (frequency) {
    case 'daily': return addDays(start, n);
    case 'weekly': return addDays(start, 7 * n);
    case 'fortnightly': return addDays(start, 14 * n);
    case 'yearly': return addMonths(start, 12 * n);
    default: return addMonths(start, n);
  }
}

export function nextOccurrence(r, after = r.lastDate || '') {
  for (let n = 0; n < 50000; n++) {
    const date = occurrence(r.startDate, r.frequency, n);
    if (date > after) return (!r.endDate || date <= r.endDate) ? date : null;
  }
  return null;
}

// Rough monthly cost, for the summary line.
export function monthlyEquivalent(r) {
  const perYear = { daily: 365, weekly: 52, fortnightly: 26, monthly: 12, yearly: 1 }[r.frequency] || 12;
  return (r.amount * perYear) / 12;
}
