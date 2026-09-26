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
