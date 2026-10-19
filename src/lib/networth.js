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

// Least-squares trend through dated values, projected forward `months` from the last point.
// The projection starts at the latest actual value so the dashed line continues the real one.
export function trendForecast(points, months, stepDays = 7) {
  const pts = points.filter(p => Number.isFinite(p.value));
  if (pts.length < 2) return null;
  const day = d => Date.parse(`${d}T00:00:00Z`) / 86400000;
  const xs = pts.map(p => day(p.date));
  const span = xs[xs.length - 1] - xs[0];
  if (span < 7) return null; // need at least a week of history for a meaningful pace
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = pts.reduce((a, p) => a + p.value, 0) / pts.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (pts[i].value - my); den += (x - mx) ** 2; });
  const slopePerDay = den ? num / den : 0;
  const last = pts[pts.length - 1];
  const lastDay = xs[xs.length - 1];
  const endDay = day(addMonthsISO(last.date, months));
  const rows = [];
  for (let d = lastDay + stepDays; d < endDay; d += stepDays) rows.push({ day: d, value: last.value + slopePerDay * (d - lastDay) });
  rows.push({ day: endDay, value: last.value + slopePerDay * (endDay - lastDay) });
  const iso = d => new Date(d * 86400000).toISOString().slice(0, 10);
  return {
    slopePerDay,
    perMonth: slopePerDay * 30.44,
    end: { date: iso(endDay), value: rows[rows.length - 1].value },
    rows: rows.map(r => ({ date: iso(r.day), value: r.value })),
  };
}

function addMonthsISO(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const dim = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(Math.min(d, dim)).padStart(2, '0')}`;
}
