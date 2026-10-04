export function computeNetWorth(accounts = [], investments = 0, owed = 0) {
  const cash = accounts.filter(a => a.type === 'bank').reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const credit = accounts.filter(a => a.type === 'credit').reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const otherAssets = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const liquid = cash - credit;
  const netWorth = liquid + investments + otherAssets;
  return {
    cash,
    credit,
    otherAssets,
    investments,
    owed,
    liquid,
    liquidPlusOwed: liquid + owed,
    netWorth,
    netWorthPlusOwed: netWorth + owed,
  };
}

export const outstandingOwed = debts => debts.filter(d => !d.settled).reduce((s, d) => s + d.amount, 0);

// Suggested balance for each account: its balance in the latest snapshot, adjusted by every
// transaction logged against it afterwards. For credit cards `balance` is the amount owing.
// Split expenses count in full (your share + the IOUs), since that's what left the account.
export function suggestBalances(snapshot, accounts = [], transactions = [], debts = []) {
  if (!snapshot) return null;
  const snapBalance = new Map((snapshot.accounts || []).map(a => [a.name.trim().toLowerCase(), a.balance]));
  const isAfter = t => t.date > snapshot.date
    || (t.date === snapshot.date && String(t.createdAt || '') > String(snapshot.createdAt || ''));
  const owedByTx = new Map();
  for (const d of debts) {
    if (d.transactionId) owedByTx.set(d.transactionId, (owedByTx.get(d.transactionId) || 0) + d.amount);
  }

  const after = transactions.filter(isAfter);
  const byId = {};
  for (const a of accounts) {
    const key = a.name.trim().toLowerCase();
    if (!snapBalance.has(key)) continue; // account added after the snapshot
    let balance = Number(snapBalance.get(key)) || 0;
    let count = 0;
    for (const t of after) {
      if ((t.account || '').trim().toLowerCase() !== key) continue;
      const amount = t.type === 'expense' ? t.amount + (owedByTx.get(t.id) || 0) : t.amount;
      const inflow = t.type === 'income' ? amount : -amount;
      balance += a.type === 'credit' ? -inflow : inflow;
      count++;
    }
    byId[a.id] = { balance: Math.round(balance * 100) / 100, count };
  }
  const known = new Set(accounts.map(a => a.name.trim().toLowerCase()));
  return {
    since: snapshot.date,
    byId,
    unassigned: after.filter(t => !known.has((t.account || '').trim().toLowerCase())).length,
  };
}
