export const emptySplitRow = () => ({ person: '', amount: '' });
export const splitOwedTotal = rows => rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
export const validSplits = rows => rows.filter(r => r.person.trim() && parseFloat(r.amount) > 0);
