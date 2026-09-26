import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ArrowPathIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, SubNav, Stat, Card, Empty, ChartTooltip, Segmented, Modal, Spinner, Delta, Legend } from '../../components/ui';
import { money, moneyCompact, num, pct, toneClass } from '../../lib/format';
import { formatDate } from '../../lib/dates';
import { api } from '../../lib/api';
import { buildValueHistory, quoteSymbol } from '../../lib/portfolio';
import { SERIES, OTHER, CHART } from '../../lib/colors';
import { INVEST_NAV } from '../../lib/nav';

const STALE_MS = 15 * 60 * 1000;

function timeAgo(iso) {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return formatDate(iso.slice(0, 10));
}

export default function Portfolio() {
  const { portfolio, trades, settings, refreshPrices, saveSettings } = useData();
  const toast = useToast();
  const { open, closed, totals, warnings } = portfolio;
  const [refreshing, setRefreshing] = useState(false);
  const [editPrice, setEditPrice] = useState(null);
  const autoRefreshed = useRef(false);

  const lastUpdated = useMemo(() => {
    const times = open.map(p => p.priceUpdatedAt).filter(Boolean).sort();
    return times[0];
  }, [open]);

  const doRefresh = async (silent = false) => {
    setRefreshing(true);
    try {
      const r = await refreshPrices();
      if (!silent) toast(r.failed.length ? `Updated ${r.updated} prices · couldn’t find ${r.failed.join(', ')}` : `Prices updated`, { tone: r.failed.length ? 'error' : 'success' });
    } catch (err) {
      if (!silent) toast(err.message, { tone: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (autoRefreshed.current || !open.length) return;
    autoRefreshed.current = true;
    const stale = open.some(p => !p.manualPrice && (!p.priceUpdatedAt || Date.now() - Date.parse(p.priceUpdatedAt) > STALE_MS));
    if (stale) doRefresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open.length]);

  // Stable colour per holding: order of first purchase.
  const colorOf = useMemo(() => {
    const order = [...open].sort((a, b) => a.firstDate.localeCompare(b.firstDate));
    const map = {};
    order.forEach((p, i) => { map[p.ticker] = i < SERIES.length - 1 ? SERIES[i] : OTHER; });
    return t => map[t] || OTHER;
  }, [open]);

  const allocation = useMemo(() => {
    const named = [];
    let other = 0;
    open.forEach(p => {
      if (colorOf(p.ticker) === OTHER) other += p.value;
      else named.push({ name: p.name, ticker: p.ticker, value: p.value });
    });
    if (other > 0) named.push({ name: 'Other', ticker: 'Other', value: other });
    return named;
  }, [open, colorOf]);

  if (!trades.length) {
    return (
      <>
        <PageHeader eyebrow="Investing" title="Portfolio" />
        <SubNav items={INVEST_NAV} />
        <div className="card">
          <Empty icon={ArrowTrendingUpIcon} title="No trades recorded" action={<Link to="/investing/trades" className="btn btn-primary">Record a trade</Link>}>
            Add your buys and sells (or paste them straight from your spreadsheet) and your holdings, profit and allocation will be calculated automatically.
          </Empty>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Investing"
        title="Portfolio"
        subtitle={<>Prices updated {timeAgo(lastUpdated)}{totals.missingPrices.length > 0 && <span className="text-loss"> · no price for {totals.missingPrices.join(', ')}</span>}</>}
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => doRefresh()} disabled={refreshing || !open.length}>
            {refreshing ? <Spinner className="h-4 w-4" /> : <ArrowPathIcon className="h-4 w-4" />} Refresh prices
          </button>
        }
      />
      <SubNav items={INVEST_NAV} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-5">
        <Stat emphasis className="col-span-2 lg:col-span-1" label="Total value" value={money(totals.value)}
          sub={totals.dayChange ? <span>Today <span className={totals.dayChange >= 0 ? 'text-forest-300' : 'text-[#f0a49d]'}>{money(totals.dayChange, { sign: true })}</span></span> : `${open.length} holdings`} />
        <Stat label="Total cost" value={money(totals.cost)} sub={`${totals.uniqueStocks} stocks traded`} />
        <Stat label="Unrealised" value={money(totals.unrealised, { sign: true })} tone={toneClass(totals.unrealised)} sub={pct(totals.unrealisedPct, { sign: true })} />
        <Stat label="Realised" value={money(totals.realised, { sign: true })} tone={toneClass(totals.realised)} sub={`${closed.length} closed · after brokerage`} />
        <Stat label="Net profit" value={money(totals.net, { sign: true })} tone={toneClass(totals.net)} sub="Unrealised + realised" />
      </div>

      {warnings.length > 0 && (
        <div className="card border-gold-500/50 bg-cream-100 px-4 py-3 mb-5 flex gap-3 text-sm">
          <ExclamationTriangleIcon className="h-5 w-5 text-gold-600 shrink-0" />
          <div>
            <div className="font-semibold text-forest-900">Check these trades</div>
            <ul className="text-ink-soft mt-0.5">{warnings.map(w => <li key={w}>{w}</li>)}</ul>
          </div>
        </div>
      )}

      <Card title="Holdings" className="mb-5" pad={false}>
          {open.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-soft">You have no open positions.</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto mt-2">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="!pl-5">Stock</th>
                      <th className="text-right">Shares</th>
                      <th className="text-right">Avg price</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Cost</th>
                      <th className="text-right">Value</th>
                      <th className="text-right !pr-5">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {open.map(p => (
                      <tr key={p.ticker}>
                        <td className="!pl-5">
                          <div className="flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: colorOf(p.ticker) }} />
                            <div className="min-w-0">
                              <div className="font-semibold text-ink truncate max-w-[220px]">{p.name}</div>
                              <div className="text-xs text-muted">{p.ticker} · {p.market} · {pct(totals.value ? p.value / totals.value : 0, { digits: 1 })}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right num">{num(p.shares)}</td>
                        <td className="text-right num">{money(p.avgPrice)}</td>
                        <td className="text-right num">
                          <button className="inline-flex items-center gap-1 hover:text-forest-700 group" onClick={() => setEditPrice(p)} title="Set price manually">
                            {p.hasPrice ? money(p.price) : <span className="text-loss">Set</span>}
                            {p.manualPrice && <span className="badge badge-neutral !px-1.5 !py-0 text-[10px]">M</span>}
                            <PencilIcon className="h-3 w-3 opacity-0 group-hover:opacity-60" />
                          </button>
                          {p.dayChangePct !== 0 && <div className={`text-[11px] ${toneClass(p.dayChangePct)}`}>{pct(p.dayChangePct, { sign: true })}</div>}
                        </td>
                        <td className="text-right num">{money(p.costBasis)}</td>
                        <td className="text-right num font-semibold">{money(p.value)}</td>
                        <td className="text-right !pr-5">
                          <div className={`num font-semibold ${toneClass(p.unrealised)}`}>{money(p.unrealised, { sign: true })}</div>
                          <span className={`badge num mt-0.5 ${p.unrealised > 0 ? 'badge-gain' : p.unrealised < 0 ? 'badge-loss' : 'badge-neutral'}`}>{pct(p.unrealisedPct, { sign: true })}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-cream-100/70 font-semibold">
                      <td className="!pl-5 px-3 py-3">Total</td>
                      <td /><td /><td />
                      <td className="text-right num px-3">{money(totals.cost)}</td>
                      <td className="text-right num px-3">{money(totals.value)}</td>
                      <td className={`text-right num !pr-5 px-3 ${toneClass(totals.unrealised)}`}>{money(totals.unrealised, { sign: true })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <ul className="md:hidden mt-2">
                {open.map(p => (
                  <li key={p.ticker} className="px-4 py-3.5 border-t border-line/70 first:border-t-0">
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: colorOf(p.ticker) }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-3">
                          <div className="font-semibold truncate">{p.name}</div>
                          <div className="num font-semibold">{money(p.value)}</div>
                        </div>
                        <div className="flex justify-between gap-3 text-[13px] text-muted mt-0.5">
                          <span>{p.ticker} · {num(p.shares)} @ {money(p.avgPrice)}</span>
                          <span className={`num font-semibold ${toneClass(p.unrealised)}`}>{money(p.unrealised, { sign: true })} ({pct(p.unrealisedPct, { sign: true })})</span>
                        </div>
                        <div className="flex justify-between gap-3 text-[13px] text-muted mt-0.5">
                          <span>Cost {money(p.costBasis)}</span>
                          <button className="underline decoration-dotted underline-offset-2" onClick={() => setEditPrice(p)}>
                            {p.hasPrice ? `Price ${money(p.price)}` : 'Set price'}{p.manualPrice ? ' (manual)' : ''}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
      </Card>

      <div className="grid gap-4 md:gap-5 xl:grid-cols-3 mb-5">
        <Card title="Allocation">
          {allocation.length === 0 ? <p className="text-sm text-ink-soft">No open positions.</p> : (
            <>
              <div className="relative h-[220px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={allocation} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="92%" stroke={CHART.surface} strokeWidth={2} isAnimationActive={false}>
                      {allocation.map(a => <Cell key={a.ticker} fill={colorOf(a.ticker)} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.1em] text-muted font-semibold">Value</div>
                    <div className="num text-lg font-semibold text-forest-900">{moneyCompact(totals.value)}</div>
                  </div>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {allocation.map(a => (
                  <li key={a.ticker} className="flex items-center gap-2.5 text-sm">
                    <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: colorOf(a.ticker) }} />
                    <span className="flex-1 truncate text-ink-soft">{a.name}</span>
                    <span className="num font-semibold">{pct(totals.value ? a.value / totals.value : 0, { digits: 1 })}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
        <div className="xl:col-span-2"><PerformanceChart /></div>
      </div>

      {closed.length > 0 && (
        <Card title="Closed positions" pad={false} className="mt-5">
          <div className="overflow-x-auto mt-2">
            <table className="table">
              <thead>
                <tr>
                  <th className="!pl-5">Stock</th>
                  <th className="text-right hidden sm:table-cell">Total bought</th>
                  <th className="text-right hidden sm:table-cell">Total sold</th>
                  <th className="text-right hidden sm:table-cell">Held</th>
                  <th className="text-right !pr-5">Realised</th>
                </tr>
              </thead>
              <tbody>
                {closed.map(p => (
                  <tr key={p.ticker}>
                    <td className="!pl-5">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-muted">{p.ticker}</div>
                    </td>
                    <td className="text-right num hidden sm:table-cell">{money(p.totalBought)}</td>
                    <td className="text-right num hidden sm:table-cell">{money(p.totalSold)}</td>
                    <td className="text-right text-xs text-muted hidden sm:table-cell">{formatDate(p.firstDate)} – {formatDate(p.lastDate)}</td>
                    <td className="text-right !pr-5"><Delta value={p.realised} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editPrice && (
        <PriceEditor
          position={editPrice}
          onClose={() => setEditPrice(null)}
          onSave={async price => {
            const prices = { ...(settings.prices || {}) };
            prices[editPrice.ticker] = { price, prevClose: 0, currency: 'AUD', updatedAt: new Date().toISOString(), manual: true };
            await saveSettings({ prices });
            toast(`${editPrice.ticker} price set to ${money(price)}`);
            setEditPrice(null);
          }}
        />
      )}
    </>
  );
}

function PriceEditor({ position, onClose, onSave }) {
  const [value, setValue] = useState(position.price ? position.price.toFixed(3) : '');
  return (
    <Modal open onClose={onClose} title={`Set price · ${position.ticker}`}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => parseFloat(value) > 0 && onSave(parseFloat(value))}>Save price</button></>}>
      <p className="text-sm text-ink-soft mb-4">Use this if live prices aren’t available for {position.name}. It’s replaced the next time you refresh prices.</p>
      <label className="label" htmlFor="mp">Price per share (AUD)</label>
      <input id="mp" className="input num" inputMode="decimal" autoFocus value={value} onChange={e => setValue(e.target.value.replace(/[^0-9.]/g, ''))} />
    </Modal>
  );
}

const PERF_RANGES = [
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '2y', label: '2Y' },
  { value: 'max', label: 'All' },
];

function PerformanceChart() {
  const { trades, portfolio, settings } = useData();
  const [range, setRange] = useState('1y');
  const [history, setHistory] = useState(null);
  const [state, setState] = useState('idle');

  const symbols = useMemo(
    () => [...new Set(portfolio.positions.map(p => quoteSymbol(p.ticker, p.market)))].sort().join(','),
    [portfolio.positions]
  );

  useEffect(() => {
    if (!symbols) return;
    let cancelled = false;
    setState('loading');
    api(`/market/history?range=${range}&symbols=${encodeURIComponent(symbols)}`)
      .then(h => { if (!cancelled) { setHistory(h); setState('ok'); } })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [symbols, range]);

  const data = useMemo(() => {
    if (!history) return [];
    const series = buildValueHistory(trades, history, portfolio.positions, settings?.prices, settings?.preferences);
    // Pin the latest point to live values so the chart ends where the KPIs are.
    if (series.length) series[series.length - 1] = { ...series[series.length - 1], value: Math.round(portfolio.totals.value * 100) / 100 };
    return series;
  }, [history, trades, portfolio, settings]);

  const first = data[0];
  const last = data[data.length - 1];

  return (
    <Card
      title="Value vs amount invested"
      action={<Segmented value={range} onChange={setRange} options={PERF_RANGES} />}
    >
      {first && last && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-3">
          <Legend items={[{ label: 'Market value', color: SERIES[0] }, { label: 'Amount invested', color: SERIES[1], line: true }]} />
          <span className="text-sm text-ink-soft">Gap today <b className={`num ${toneClass(last.value - last.cost)}`}>{money(last.value - last.cost, { sign: true })}</b></span>
        </div>
      )}
      <div className="h-[300px] xl:h-[420px] -ml-2 relative">
        {state === 'loading' && !data.length && <div className="absolute inset-0 grid place-items-center text-forest-700"><Spinner /></div>}
        {state === 'error' && <div className="absolute inset-0 grid place-items-center text-sm text-ink-soft">Historical prices are unavailable right now.</div>}
        {data.length > 0 && (
          <ResponsiveContainer>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="date" tickFormatter={d => formatDate(d, { year: false })} stroke={CHART.axis} fontSize={12} tickLine={false} axisLine={false} minTickGap={40} />
              <YAxis tickFormatter={moneyCompact} stroke={CHART.axis} fontSize={12} tickLine={false} axisLine={false} width={60} domain={['auto', 'auto']} />
              <Tooltip content={<ChartTooltip labelFormatter={d => formatDate(d)} />} />
              <Area type="monotone" dataKey="value" name="Market value" stroke={SERIES[0]} strokeWidth={2} fill="url(#valueFill)" activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2 }} />
              <Area type="stepAfter" dataKey="cost" name="Amount invested" stroke={SERIES[1]} strokeWidth={2} strokeDasharray="5 4" fill="none" activeDot={{ r: 4, stroke: CHART.surface, strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
