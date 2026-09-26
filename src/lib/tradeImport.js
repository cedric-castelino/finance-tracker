import { parseLooseDate } from './dates';

const HEADER_ALIASES = {
  side: ['type', 'side', 'action', 'buy/sell', 'order'],
  date: ['date', 'trade date'],
  name: ['stock', 'name', 'company', 'security', 'description'],
  ticker: ['ticker', 'code', 'symbol', 'asx code'],
  price: ['price', 'unit price', 'avg price', 'average price'],
  quantity: ['quantity', 'qty', 'units', 'shares', 'volume'],
  brokerage: ['brokerage', 'fee', 'fees', 'commission'],
  market: ['market', 'exchange'],
};
const DEFAULT_ORDER = ['side', 'date', 'name', 'ticker', 'price', 'quantity', 'brokerage'];

const splitLine = (line, delim) => {
  if (delim === '\t') return line.split('\t');
  const out = [];
  let cur = '', q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
};

const money = v => parseFloat(String(v || '').replace(/[$,\s]/g, '').replace(/^\((.*)\)$/, '-$1'));

export function parseTrades(text, defaultMarket = 'ASX') {
  const lines = text.split(/\r?\n/).map(l => l.trimEnd()).filter(l => l.trim());
  if (!lines.length) return { rows: [], errors: [] };
  const delim = lines[0].includes('\t') ? '\t' : ',';
  let cells = lines.map(l => splitLine(l, delim).map(c => c.trim()));

  let order = DEFAULT_ORDER;
  const header = cells[0].map(c => c.toLowerCase());
  const mapped = header.map(h => Object.keys(HEADER_ALIASES).find(k => HEADER_ALIASES[k].includes(h)) || null);
  if (mapped.filter(Boolean).length >= 3) {
    order = mapped;
    cells = cells.slice(1);
  }

  const rows = [];
  const errors = [];
  cells.forEach((c, i) => {
    const rec = {};
    order.forEach((key, idx) => { if (key) rec[key] = c[idx]; });
    const side = String(rec.side || '').toLowerCase().startsWith('s') ? 'sell' : String(rec.side || '').toLowerCase().startsWith('b') ? 'buy' : null;
    const date = parseLooseDate(rec.date);
    const price = money(rec.price);
    const quantity = money(rec.quantity);
    const brokerage = money(rec.brokerage) || 0;
    const ticker = String(rec.ticker || '').toUpperCase().replace(/\.AX$/, '');
    const market = /us|nasdaq|nyse/i.test(rec.market || '') ? 'US' : rec.market ? (/asx/i.test(rec.market) ? 'ASX' : 'OTHER') : defaultMarket;
    const problems = [];
    if (!side) problems.push('type');
    if (!date) problems.push('date');
    if (!ticker) problems.push('ticker');
    if (!(price > 0)) problems.push('price');
    if (!(quantity > 0)) problems.push('quantity');
    if (problems.length) {
      errors.push(`Row ${i + 1}: couldn’t read ${problems.join(', ')}`);
      return;
    }
    rows.push({ side, date, name: rec.name || ticker, ticker, market, price, quantity, brokerage, note: '' });
  });

  // Spreadsheets are often newest-first; store oldest-first so same-day order is preserved.
  if (rows.length > 1 && rows[0].date > rows[rows.length - 1].date) rows.reverse();
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return { rows, errors };
}
