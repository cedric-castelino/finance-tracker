// Expense categories flagged "excluded" (e.g. Investing) are money moved, not money spent:
// they appear in cash flow but not in spending totals or breakdowns.
export function excludedCategories(settings) {
  return new Set((settings?.categories?.expense || []).filter(c => c.excluded).map(c => c.name));
}

export function kindOf(t, excluded) {
  if (t.type === 'income') return 'income';
  return excluded.has(t.category) ? 'invested' : 'expense';
}
