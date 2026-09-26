import { useMemo, useState } from 'react';
import { ArrowUpTrayIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, ClipboardDocumentListIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, SubNav, Card, Segmented, Modal, Confirm, Empty, Spinner, Delta } from '../../components/ui';
import { money, num, toneClass } from '../../lib/format';
import { formatDate, todayISO } from '../../lib/dates';
import { api } from '../../lib/api';
import { quoteSymbol, sortTrades } from '../../lib/portfolio';
import { parseTrades } from '../../lib/tradeImport';
import { download, toCSV } from '../../lib/csv';
import { INVEST_NAV } from '../../lib/nav';

const blank = () => ({ side: 'buy', ticker: '', name: '', market: 'ASX', date: todayISO(), price: '', quantity: '', brokerage: '', note: '' });

export default function Trades() {
  const { trades, portfolio, remove, restore } = useData();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [sideFilter, setSideFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [importing, setImporting] = useState(false);
  const [limit, setLimit] = useState(30);

  const { totals, positions } = portfolio;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortTrades(trades).reverse().filter(t =>
      (sideFilter === 'all' || t.side === sideFilter) && (!q || `${t.ticker} ${t.name} ${t.note}`.toLowerCase().includes(q))
    );
  }, [trades, query, sideFilter]);

  const stockRows = useMemo(
    () => [...positions].sort((a, b) => Number(a.open) - Number(b.open) || b.realised - a.realised),
    [positions]
  );

  const del = async t => {
    try {
      const removed = await remove('trades', t.id);
      toast(`Trade deleted`, { action: { label: 'Undo', onClick: () => restore('trades', removed) } });
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  };

  const exportCSV = () => {
    download(`trades-${todayISO()}.csv`, toCSV(sortTrades(trades), [
      { label: 'Type', value: t => (t.side === 'buy' ? 'Buy' : 'Sell') },
      { label: 'Date', value: t => t.date },
      { label: 'Stock', value: t => t.name },
      { label: 'Ticker', value: t => t.ticker },
      { label: 'Market', value: t => t.market },
      { label: 'Price', value: t => t.price },
      { label: 'Quantity', value: t => t.quantity },
      { label: 'Brokerage', value: t => t.brokerage },
      { label: 'Total', value: t => (t.price * t.quantity + (t.side === 'buy' ? t.brokerage : -t.brokerage)).toFixed(2) },
    ]));
  };

  return (
    <>
      <PageHeader
        eyebrow="Investing"
        title="Trades"
        subtitle="Record buys and sells — profit is calculated per stock using average cost."
        actions={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => setImporting(true)}><ArrowUpTrayIcon className="h-4 w-4" /> Paste from spreadsheet</button>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV} disabled={!trades.length}><ArrowDownTrayIcon className="h-4 w-4" /> Export</button>
          </>
        }
      />
      <SubNav items={INVEST_NAV} />

      <div className="grid gap-4 md:gap-5 xl:grid-cols-[minmax(0,1fr)_340px] items-start mb-5">
        <TradeForm key="new" />
        <Card title="Totals">
          <dl className="divide-y divide-line text-sm">
            {[
              ['Brokerage paid', money(totals.brokerage)],
              ['Unique stocks', totals.uniqueStocks],
              ['Buy orders', totals.buyCount],
              ['Sell orders', totals.sellCount],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5">
                <dt className="text-ink-soft">{k}</dt>
                <dd className="num font-semibold">{v}</dd>
              </div>
            ))}
            <div className="flex justify-between py-2.5">
              <dt className="text-ink-soft">Profit on closed positions</dt>
              <dd className={`num font-semibold ${toneClass(totals.realised)}`}>{money(totals.realised, { sign: true })}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="font-semibold text-forest-900">Total investing profit</dt>
              <dd className={`num font-bold text-base ${toneClass(totals.net)}`}>{money(totals.net, { sign: true })}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {stockRows.length > 0 && (
        <Card title="Profit by stock" pad={false} className="mb-5">
          <div className="overflow-x-auto mt-2">
            <table className="table">
              <thead>
                <tr>
                  <th className="!pl-5">Stock</th>
                  <th className="text-right">Realised P/L</th>
                  <th className="text-right hidden sm:table-cell">Total costs</th>
                  <th className="text-right hidden sm:table-cell">Total sales</th>
                  <th className="text-right">Held</th>
                  <th className="text-right !pr-5">Status</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map(p => (
                  <tr key={p.ticker}>
                    <td className="!pl-5">
                      <div className="font-semibold truncate max-w-[200px]">{p.name}</div>
                      <div className="text-xs text-muted">{p.ticker} · {p.buys} buy{p.buys === 1 ? '' : 's'}, {p.sells} sell{p.sells === 1 ? '' : 's'}</div>
                    </td>
                    <td className="text-right">{p.sells ? <Delta value={p.realised} /> : <span className="text-muted">—</span>}</td>
                    <td className="text-right num hidden sm:table-cell">{money(p.totalBought)}</td>
                    <td className="text-right num hidden sm:table-cell">{money(p.totalSold)}</td>
                    <td className="text-right num">{num(p.shares)}</td>
                    <td className="text-right !pr-5">
                      {p.open
                        ? <span className="badge badge-gain">Open{p.hasPrice ? ` · ${money(p.unrealised, { sign: true })}` : ''}</span>
                        : <span className="badge badge-neutral">Closed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Trade history" pad={false}>
        <div className="flex flex-col sm:flex-row gap-2 px-4 md:px-5 pt-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-5 w-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="search" className="input !pl-10" placeholder="Search ticker or name" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <Segmented value={sideFilter} onChange={setSideFilter} options={[{ value: 'all', label: 'All' }, { value: 'buy', label: 'Buys' }, { value: 'sell', label: 'Sells' }]} />
        </div>
        {list.length === 0 ? (
          <Empty icon={ClipboardDocumentListIcon} title={trades.length ? 'No matching trades' : 'No trades yet'}>
            {trades.length ? 'Try a different search.' : 'Use the form above, or paste rows straight from your existing spreadsheet.'}
          </Empty>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="table">
              <thead>
                <tr>
                  <th className="!pl-5">Type</th>
                  <th>Date</th>
                  <th>Stock</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right hidden md:table-cell">Brokerage</th>
                  <th className="text-right">Total</th>
                  <th className="!pr-5" />
                </tr>
              </thead>
              <tbody>
                {list.slice(0, limit).map(t => (
                  <tr key={t.id}>
                    <td className="!pl-5"><span className={`badge ${t.side === 'buy' ? 'badge-gain' : 'badge-loss'}`}>{t.side === 'buy' ? 'Buy' : 'Sell'}</span></td>
                    <td className="text-ink-soft">{formatDate(t.date)}</td>
                    <td>
                      <div className="font-semibold truncate max-w-[180px]">{t.name}</div>
                      <div className="text-xs text-muted">{t.ticker}</div>
                    </td>
                    <td className="text-right num">{money(t.price)}</td>
                    <td className="text-right num">{num(t.quantity)}</td>
                    <td className="text-right num hidden md:table-cell">{money(t.brokerage)}</td>
                    <td className="text-right num font-semibold">{money(t.price * t.quantity + (t.side === 'buy' ? t.brokerage : -t.brokerage))}</td>
                    <td className="!pr-5 text-right">
                      <div className="inline-flex gap-1">
                        <button className="btn btn-ghost btn-icon" aria-label="Edit trade" onClick={() => setEditing(t)}><PencilIcon className="h-4 w-4" /></button>
                        <button className="btn btn-ghost btn-icon !text-loss" aria-label="Delete trade" onClick={() => setDeleting(t)}><TrashIcon className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length > limit && (
              <div className="p-4 text-center border-t border-line">
                <button className="btn btn-secondary" onClick={() => setLimit(l => l + 60)}>Show more ({list.length - limit} remaining)</button>
              </div>
            )}
          </div>
        )}
      </Card>

      {editing && (
        <Modal open onClose={() => setEditing(null)} title="Edit trade">
          <TradeForm trade={editing} onDone={() => setEditing(null)} embedded />
        </Modal>
      )}
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => del(deleting)} title="Delete trade?">
        {deleting && `${deleting.side === 'buy' ? 'Buy' : 'Sell'} of ${num(deleting.quantity)} ${deleting.ticker} on ${formatDate(deleting.date)} will be removed and your profit recalculated.`}
      </Confirm>
      {importing && <ImportTrades onClose={() => setImporting(false)} />}
    </>
  );
}

function TradeForm({ trade, onDone, embedded = false }) {
  const { add, update, portfolio } = useData();
  const toast = useToast();
  const [form, setForm] = useState(() => (trade ? { ...trade, price: String(trade.price), quantity: String(trade.quantity), brokerage: String(trade.brokerage || '') } : blank()));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const known = useMemo(() => {
    const m = new Map();
    portfolio.positions.forEach(p => m.set(p.ticker, p));
    return m;
  }, [portfolio.positions]);

  const position = known.get(form.ticker.toUpperCase());
  const price = parseFloat(form.price) || 0;
  const qty = parseFloat(form.quantity) || 0;
  const brokerage = parseFloat(form.brokerage) || 0;
  const total = price * qty + (form.side === 'buy' ? brokerage : -brokerage);
  const estRealised = form.side === 'sell' && position?.shares > 0 && !trade
    ? price * Math.min(qty, position.shares) - brokerage - position.avgPrice * Math.min(qty, position.shares)
    : null;

  const onTicker = value => {
    const t = value.toUpperCase().replace(/[^A-Z0-9.]/g, '');
    const p = known.get(t);
    setForm(f => ({ ...f, ticker: t, ...(p ? { name: p.name, market: p.market } : {}) }));
  };

  const lookup = async () => {
    const t = form.ticker.trim();
    if (!t || known.has(t) || form.name) return;
    setLookingUp(true);
    try {
      const sym = quoteSymbol(t, form.market);
      const q = await api(`/market/quotes?symbols=${encodeURIComponent(sym)}`);
      const r = q[sym];
      if (r?.name) {
        setForm(f => (f.ticker === t && !f.name ? { ...f, name: r.name, price: f.price || (r.price ? String(r.price) : '') } : f));
      }
    } catch { /* lookup is best-effort */ } finally {
      setLookingUp(false);
    }
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (!form.ticker) return setError('Enter a ticker');
    if (!(price > 0)) return setError('Enter the price per share');
    if (!(qty > 0)) return setError('Enter the quantity');
    if (form.side === 'sell' && !trade && (!position || qty - position.shares > 1e-9)) {
      return setError(position ? `You only hold ${num(position.shares)} ${form.ticker}` : `You don’t hold any ${form.ticker}`);
    }
    setSaving(true);
    const payload = { ...form, name: form.name || form.ticker, price, quantity: qty, brokerage };
    try {
      if (trade) {
        await update('trades', trade.id, payload);
        toast('Trade updated');
        onDone?.();
      } else {
        await add('trades', payload);
        toast(`${form.side === 'buy' ? 'Bought' : 'Sold'} ${num(qty)} ${form.ticker}${estRealised != null ? ` · ${money(estRealised, { sign: true })} realised` : ''}`);
        setForm(f => ({ ...blank(), side: f.side, date: f.date }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <form onSubmit={submit} className="space-y-4">
      <Segmented value={form.side} onChange={v => set('side', v)} size="lg" className="w-full"
        options={[{ value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }]} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="label" htmlFor="t-ticker">Ticker</label>
          <input id="t-ticker" className="input uppercase" list="t-tickers" autoComplete="off" autoCapitalize="characters" placeholder="IVV"
            value={form.ticker} onChange={e => onTicker(e.target.value)} onBlur={lookup} />
          <datalist id="t-tickers">
            {[...known.values()].filter(p => form.side === 'buy' || p.open).map(p => <option key={p.ticker} value={p.ticker}>{p.name}</option>)}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="t-market">Market</label>
          <select id="t-market" className="input" value={form.market} onChange={e => set('market', e.target.value)}>
            <option value="ASX">ASX</option>
            <option value="US">US</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="label" htmlFor="t-name">Stock name {lookingUp && <Spinner className="inline h-3 w-3 ml-1" />}</label>
          <input id="t-name" className="input" placeholder="Auto-filled from ticker" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="label" htmlFor="t-date">Date</label>
          <input id="t-date" type="date" className="input" value={form.date} onChange={e => e.target.value && set('date', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="t-price">Price</label>
          <input id="t-price" className="input num" inputMode="decimal" placeholder="0.00" value={form.price} onChange={e => set('price', e.target.value.replace(/[^0-9.]/g, ''))} />
        </div>
        <div>
          <label className="label" htmlFor="t-qty">Quantity</label>
          <input id="t-qty" className="input num" inputMode="decimal" placeholder="0" value={form.quantity} onChange={e => set('quantity', e.target.value.replace(/[^0-9.]/g, ''))} />
          {form.side === 'sell' && position?.shares > 0 && !trade && (
            <button type="button" className="text-xs text-forest-700 font-semibold mt-1" onClick={() => set('quantity', String(position.shares))}>Sell all {num(position.shares)}</button>
          )}
        </div>
        <div>
          <label className="label" htmlFor="t-brok">Brokerage</label>
          <input id="t-brok" className="input num" inputMode="decimal" placeholder="0.00" value={form.brokerage} onChange={e => set('brokerage', e.target.value.replace(/[^0-9.]/g, ''))} />
        </div>
      </div>
      <div className="rounded-xl bg-cream-100 border border-line px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-ink-soft">{form.side === 'buy' ? 'Total cost' : 'Net proceeds'} <b className="num text-ink text-base ml-1">{money(total)}</b></span>
        {position?.open && (
          <span className="text-ink-soft">Holding {num(position.shares)} @ {money(position.avgPrice)} avg</span>
        )}
        {estRealised != null && qty > 0 && price > 0 && (
          <span className="text-ink-soft">Est. realised <b className={`num ${toneClass(estRealised)}`}>{money(estRealised, { sign: true })}</b></span>
        )}
      </div>
      {error && <div className="rounded-xl bg-loss-bg text-loss text-sm px-3.5 py-2.5">{error}</div>}
      <div className="flex gap-2 justify-end">
        {embedded && <button type="button" className="btn btn-secondary" onClick={onDone}>Cancel</button>}
        <button className={`btn ${form.side === 'buy' ? 'btn-primary' : 'btn-gold'} ${embedded ? '' : 'w-full sm:w-auto sm:min-w-[180px]'}`} disabled={saving}>
          {saving && <Spinner className="h-4 w-4" />}
          {trade ? 'Save changes' : form.side === 'buy' ? 'Record buy' : 'Record sell'}
        </button>
      </div>
    </form>
  );

  return embedded ? body : <Card title="New trade">{body}</Card>;
}

function ImportTrades({ onClose }) {
  const { addMany } = useData();
  const toast = useToast();
  const [text, setText] = useState('');
  const [market, setMarket] = useState('ASX');
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => parseTrades(text, market), [text, market]);

  const doImport = async () => {
    setBusy(true);
    try {
      await addMany('trades', parsed.rows);
      toast(`Imported ${parsed.rows.length} trades`);
      onClose();
    } catch (err) {
      toast(err.message, { tone: 'error' });
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} wide title="Paste trades"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!parsed.rows.length || busy} onClick={doImport}>{busy && <Spinner className="h-4 w-4" />} Import {parsed.rows.length || ''} trades</button></>}>
      <p className="text-sm text-ink-soft mb-3">
        Copy rows from Google Sheets or Excel and paste below. Columns are read in the order
        <b className="text-ink"> Type, Date, Stock, Ticker, Price, Quantity, Brokerage</b> — or include a header row and they’ll be matched by name.
      </p>
      <textarea className="input font-mono !text-[13px] min-h-[160px]" placeholder={'Buy\t23-Sep-2026\tBetashares Asia Technology ETF\tASIA\t$21.52\t45\t$0.00'} value={text} onChange={e => setText(e.target.value)} />
      <div className="flex items-center gap-3 mt-3 text-sm">
        <span className="text-ink-soft">Market for rows without one</span>
        <Segmented value={market} onChange={setMarket} options={[{ value: 'ASX', label: 'ASX' }, { value: 'US', label: 'US' }]} />
      </div>
      {parsed.errors.length > 0 && (
        <div className="mt-3 rounded-xl bg-loss-bg text-loss text-sm px-3.5 py-2.5 max-h-28 overflow-y-auto">
          {parsed.errors.slice(0, 20).map(e => <div key={e}>{e}</div>)}
        </div>
      )}
      {parsed.rows.length > 0 && (
        <div className="mt-4 border border-line rounded-xl overflow-auto max-h-64">
          <table className="table">
            <thead><tr><th>Type</th><th>Date</th><th>Ticker</th><th>Stock</th><th className="text-right">Price</th><th className="text-right">Qty</th><th className="text-right">Brok.</th></tr></thead>
            <tbody>
              {parsed.rows.slice(0, 200).map((r, i) => (
                <tr key={i}>
                  <td><span className={`badge ${r.side === 'buy' ? 'badge-gain' : 'badge-loss'}`}>{r.side}</span></td>
                  <td>{formatDate(r.date)}</td>
                  <td className="font-semibold">{r.ticker}</td>
                  <td className="truncate max-w-[160px]">{r.name}</td>
                  <td className="text-right num">{money(r.price)}</td>
                  <td className="text-right num">{num(r.quantity)}</td>
                  <td className="text-right num">{money(r.brokerage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
