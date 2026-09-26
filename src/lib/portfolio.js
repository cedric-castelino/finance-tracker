// Portfolio maths. Uses the average-cost method: brokerage on buys is added to
// the cost base; on a sell, realised P/L = net proceeds - (average cost x qty).

export function quoteSymbol(ticker, market) {
  const t = String(ticker || '').toUpperCase();
  if (/[.=^]/.test(t)) return t;
  return market === 'ASX' ? `${t}.AX` : t;
}

export const fxKey = currency => `${currency}AUD=X`;

export function sortTrades(trades) {
  return [...trades].sort((a, b) =>
    a.date === b.date ? String(a.createdAt || '').localeCompare(String(b.createdAt || '')) : a.date.localeCompare(b.date)
  );
}

// Converts a quoted price into AUD when the preference is on and a rate is known.
export function toBase(price, currency, prices, preferences) {
  if (!currency || currency === 'AUD' || !preferences?.convertForeign) return price;
  const rate = prices?.[fxKey(currency)]?.price;
  return rate ? price * rate : price;
}

export function computePortfolio(trades, prices = {}, preferences = {}) {
  const map = new Map();
  let buyCount = 0;
  let sellCount = 0;
  let brokerage = 0;
  const warnings = [];

  for (const t of sortTrades(trades)) {
    const key = t.ticker;
    if (!map.has(key)) {
      map.set(key, {
        ticker: key, name: t.name || key, market: t.market || 'ASX',
        shares: 0, costBasis: 0, realised: 0, totalBought: 0, totalSold: 0,
        brokerage: 0, buys: 0, sells: 0, firstDate: t.date, lastDate: t.date,
      });
    }
    const p = map.get(key);
    if (t.name) p.name = t.name;
    if (t.market) p.market = t.market;
    p.lastDate = t.date;
    p.brokerage += t.brokerage;
    brokerage += t.brokerage;
    const gross = t.price * t.quantity;

    if (t.side === 'buy') {
      buyCount++;
      p.buys++;
      p.shares += t.quantity;
      p.costBasis += gross + t.brokerage;
      p.totalBought += gross + t.brokerage;
    } else {
      sellCount++;
      p.sells++;
      const qty = Math.min(t.quantity, p.shares);
      if (t.quantity - p.shares > 1e-9) {
        warnings.push(`${key}: sold ${t.quantity} on ${t.date} but only held ${round(p.shares)}`);
      }
      const avg = p.shares > 0 ? p.costBasis / p.shares : 0;
      const costOut = avg * qty;
      const proceeds = gross - t.brokerage;
      p.realised += proceeds - costOut;
      p.totalSold += proceeds;
      p.costBasis -= costOut;
      p.shares -= qty;
      if (p.shares < 1e-9) {
        p.shares = 0;
        p.costBasis = 0;
      }
    }
  }

  const positions = [];
  for (const p of map.values()) {
    const q = prices[p.ticker];
    const hasPrice = !!(q && q.price > 0);
    const price = hasPrice ? toBase(q.price, q.currency, prices, preferences) : null;
    const prev = hasPrice && q.prevClose > 0 ? toBase(q.prevClose, q.currency, prices, preferences) : null;
    const avgPrice = p.shares > 0 ? p.costBasis / p.shares : 0;
    const value = p.shares > 0 ? (hasPrice ? price * p.shares : p.costBasis) : 0;
    const unrealised = p.shares > 0 && hasPrice ? value - p.costBasis : 0;
    positions.push({
      ...p,
      open: p.shares > 0,
      avgPrice,
      price,
      hasPrice,
      priceUpdatedAt: q?.updatedAt,
      manualPrice: !!q?.manual,
      value,
      unrealised,
      unrealisedPct: p.costBasis > 0 ? unrealised / p.costBasis : 0,
      dayChange: p.shares > 0 && prev ? (price - prev) * p.shares : 0,
      dayChangePct: prev ? (price - prev) / prev : 0,
    });
  }

  const open = positions.filter(p => p.open).sort((a, b) => b.value - a.value);
  const closed = positions.filter(p => !p.open).sort((a, b) => b.realised - a.realised);
  const cost = sum(open, 'costBasis');
  const value = sum(open, 'value');
  const unrealised = sum(open, 'unrealised');
  const realised = sum(positions, 'realised');

  return {
    positions,
    open,
    closed,
    warnings,
    totals: {
      cost,
      value,
      unrealised,
      unrealisedPct: cost > 0 ? unrealised / cost : 0,
      realised,
      net: unrealised + realised,
      dayChange: sum(open, 'dayChange'),
      brokerage,
      buyCount,
      sellCount,
      uniqueStocks: map.size,
      missingPrices: open.filter(p => !p.hasPrice).map(p => p.ticker),
    },
  };
}

// Shares held and cost base for each ticker at the end of each given date.
export function holdingsTimeline(trades, dates) {
  const sorted = sortTrades(trades);
  const state = new Map();
  let i = 0;
  return dates.map(date => {
    while (i < sorted.length && sorted[i].date <= date) {
      const t = sorted[i++];
      const s = state.get(t.ticker) || { shares: 0, cost: 0 };
      if (t.side === 'buy') {
        s.shares += t.quantity;
        s.cost += t.price * t.quantity + t.brokerage;
      } else {
        const qty = Math.min(t.quantity, s.shares);
        const avg = s.shares > 0 ? s.cost / s.shares : 0;
        s.cost -= avg * qty;
        s.shares -= qty;
        if (s.shares < 1e-9) { s.shares = 0; s.cost = 0; }
      }
      state.set(t.ticker, s);
    }
    const snap = {};
    let cost = 0;
    for (const [k, v] of state) {
      snap[k] = v.shares;
      cost += v.cost;
    }
    return { date, shares: snap, cost };
  });
}

// Combines weekly/daily closes with the trade history into a value-vs-cost series.
export function buildValueHistory(trades, history, positions, prices, preferences) {
  const symbolFor = new Map(positions.map(p => [p.ticker, quoteSymbol(p.ticker, p.market)]));
  const dateSet = new Set();
  for (const h of Object.values(history)) (h.points || []).forEach(([d]) => dateSet.add(d));
  const dates = [...dateSet].sort();
  if (!dates.length) return [];

  const lookups = {};
  for (const [ticker, sym] of symbolFor) {
    const h = history[sym];
    if (h?.points?.length) lookups[ticker] = { points: h.points, currency: h.currency, idx: 0, last: null };
  }

  const timeline = holdingsTimeline(trades, dates);
  return timeline.map(({ date, shares, cost }) => {
    let value = 0;
    for (const [ticker, qty] of Object.entries(shares)) {
      if (!qty) continue;
      const l = lookups[ticker];
      if (!l) continue;
      while (l.idx < l.points.length && l.points[l.idx][0] <= date) l.last = l.points[l.idx++][1];
      if (l.last != null) value += toBase(l.last, l.currency, prices, preferences) * qty;
    }
    return { date, value: round(value), cost: round(cost) };
  }).filter(p => p.cost > 0 || p.value > 0);
}

const sum = (arr, key) => arr.reduce((s, x) => s + (x[key] || 0), 0);
const round = v => Math.round(v * 100) / 100;
