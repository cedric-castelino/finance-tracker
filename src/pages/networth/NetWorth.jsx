import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CameraIcon, Cog6ToothIcon, TrashIcon, PlusIcon, ArrowRightIcon, BuildingLibraryIcon, CheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, SubNav, Stat, Card, Empty, ChartTooltip, Modal, Confirm, Spinner, Delta, Segmented } from '../../components/ui';
import { money, moneyCompact, toneClass } from '../../lib/format';
import { addMonths, formatDate, todayISO } from '../../lib/dates';
import { computeNetWorth, suggestBalances } from '../../lib/networth';
import { SERIES, CHART } from '../../lib/colors';
import { NETWORTH_NAV } from '../../lib/nav';

const SERIES_DEFS = [
  { key: 'netWorth', label: 'Net worth', color: SERIES[0] },
  { key: 'liquid', label: 'Liquid', color: SERIES[1] },
  { key: 'investments', label: 'Investments', color: SERIES[2] },
  { key: 'netWorthPlusOwed', label: 'Net worth + owed', color: SERIES[3] },
];

const RANGES = [
  { value: '3', label: '3M' },
  { value: '6', label: '6M' },
  { value: '12', label: '1Y' },
  { value: 'all', label: 'All' },
];

const round2 = v => Math.round(v * 100) / 100;

function inputValue(a) {
  if (a.type === 'credit') return a.limit > 0 ? String(round2(a.limit - (a.balance || 0))) : '';
  return String(a.balance ?? '');
}

function balanceFromInput(a, raw) {
  const v = parseFloat(raw);
  if (a.type === 'credit') {
    if (!(a.limit > 0)) return a.balance || 0;
    return round2(a.limit - (Number.isNaN(v) ? a.limit - (a.balance || 0) : v));
  }
  return Number.isNaN(v) ? 0 : v;
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

export default function NetWorth() {
  const { settings, snapshots, transactions, debts, portfolio, owedTotal, saveSettings, add, remove } = useData();
  const toast = useToast();
  const savedAccounts = useMemo(() => settings?.accounts || [], [settings?.accounts]);
  // Cash/asset inputs hold the balance; credit card inputs hold the *available* amount,
  // and the amount owing is worked out as limit - available.
  const [draft, setDraft] = useState(() => Object.fromEntries(savedAccounts.map(a => [a.id, inputValue(a)])));
  const touched = useRef(new Set());
  const [saving, setSaving] = useState(false);
  const [managing, setManaging] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [visible, setVisible] = useState(['netWorth', 'liquid']);
  const [range, setRange] = useState('all');

  useEffect(() => {
    setDraft(d => {
      const next = {};
      savedAccounts.forEach(a => { next[a.id] = touched.current.has(a.id) && a.id in d ? d[a.id] : inputValue(a); });
      return next;
    });
  }, [savedAccounts]);

  const accounts = savedAccounts.map(a => ({ ...a, balance: balanceFromInput(a, draft[a.id]) }));
  const dirty = accounts.some((a, i) => Math.abs(a.balance - (savedAccounts[i].balance || 0)) > 0.004);
  const investments = portfolio.totals.value;
  const nw = computeNetWorth(accounts, investments, owedTotal);

  const sortedSnaps = useMemo(() => [...snapshots].sort((a, b) => a.date.localeCompare(b.date) || String(a.createdAt).localeCompare(String(b.createdAt))), [snapshots]);
  const last = sortedSnaps[sortedSnaps.length - 1];
  const suggestions = useMemo(() => suggestBalances(last, savedAccounts, transactions, debts), [last, savedAccounts, transactions, debts]);

  const chartData = useMemo(() => {
    const from = range === 'all' ? '0000' : addMonths(todayISO(), -Number(range));
    return sortedSnaps.filter(s => s.date >= from);
  }, [sortedSnaps, range]);

  const saveBalances = async () => {
    await saveSettings({ accounts: accounts.map(({ id, name, type, balance, limit }) => ({ id, name, type, balance, limit })) });
    touched.current.clear();
  };

  const onSaveBalances = async () => {
    setSaving(true);
    try {
      await saveBalances();
      toast('Balances saved');
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const snapshot = async () => {
    setSaving(true);
    try {
      if (dirty) await saveBalances();
      await add('snapshots', {
        date: todayISO(),
        accounts: accounts.map(a => ({ name: a.name, type: a.type, balance: a.balance })),
        ...nw,
      });
      toast(`Snapshot saved · net worth ${money(nw.netWorth)}`);
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const since = key => (last ? nw[key] - last[key] : null);
  const sinceText = key => {
    const d = since(key);
    if (d == null) return 'No snapshots yet';
    return <span><span className={`num font-semibold ${toneClass(d)}`}>{money(d, { sign: true })}</span> <span className="text-muted">since {formatDate(last.date, { year: false })}</span></span>;
  };

  // Suggested value in the same terms as the input box (available amount for credit cards).
  const suggestedInput = a => {
    const sg = suggestions?.byId[a.id];
    if (!sg) return null;
    if (a.type === 'credit') return a.limit > 0 ? round2(a.limit - sg.balance) : null;
    return sg.balance;
  };

  const suggestionLine = a => {
    const sug = suggestedInput(a);
    if (sug == null) return null;
    const { count } = suggestions.byId[a.id];
    const actual = parseFloat(draft[a.id]);
    const diff = Number.isNaN(actual) ? null : round2(actual - sug);
    return (
      <div className="flex items-center justify-between gap-2 mt-1 text-xs">
        <button
          type="button"
          className="inline-flex items-center gap-1 min-w-0 rounded-md px-1.5 py-0.5 -ml-1.5 text-forest-700 hover:bg-forest-100"
          title={`${count} transaction${count === 1 ? '' : 's'} since your ${formatDate(suggestions.since)} snapshot`}
          aria-label={`Use suggested ${a.type === 'credit' ? 'available balance' : 'balance'} ${money(sug)} for ${a.name}`}
          onClick={() => { touched.current.add(a.id); setDraft(d => ({ ...d, [a.id]: String(sug) })); }}
        >
          <SparklesIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Suggested <b className="num">{money(sug)}</b>{count > 0 && <span className="text-muted font-normal"> · {count} txn{count === 1 ? '' : 's'}</span>}</span>
        </button>
        {diff != null && (Math.abs(diff) < 0.005
          ? <span className="inline-flex items-center gap-1 text-gain shrink-0"><CheckIcon className="h-3.5 w-3.5" />Matches</span>
          : <span className="num font-semibold text-gold-600 shrink-0">{money(diff, { sign: true })} vs suggested</span>)}
      </div>
    );
  };

  const banks = accounts.filter(a => a.type === 'bank');
  const others = accounts.filter(a => a.type === 'asset');
  const credits = accounts.filter(a => a.type === 'credit');

  const balanceInput = (a, label = 'balance') => (
    <div className="relative w-36 shrink-0">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
      <input
        className="input num text-right !h-10 !pl-6"
        inputMode="decimal"
        aria-label={`${a.name} ${label}`}
        value={draft[a.id] ?? ''}
        onChange={e => { touched.current.add(a.id); setDraft(d => ({ ...d, [a.id]: e.target.value.replace(/[^0-9.-]/g, '') })); }}
        onFocus={e => e.target.select()}
      />
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="Wealth"
        title="Net worth"
        subtitle="Update your balances, then save a snapshot to track progress over time."
        actions={
          <button className="btn btn-primary btn-sm" onClick={snapshot} disabled={saving}>
            {saving ? <Spinner className="h-4 w-4" /> : <CameraIcon className="h-4 w-4" />} Save snapshot
          </button>
        }
      />
      <SubNav items={NETWORTH_NAV} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-5">
        <Stat emphasis label="Net worth" value={money(nw.netWorth)} className="col-span-2 xl:col-span-1"
          sub={last ? <span><span className={since('netWorth') >= 0 ? 'text-forest-300' : 'text-[#f0a49d]'}>{money(since('netWorth'), { sign: true })}</span> since {formatDate(last.date, { year: false })}</span> : 'Cash + investments − credit'} />
        <Stat label="Liquid net worth" value={money(nw.liquid)} tone={toneClass(nw.liquid) === 'text-loss' ? 'text-loss' : undefined} sub={sinceText('liquid')} />
        <Stat label="Liquid + owed" value={money(nw.liquidPlusOwed)} sub={<Link to="/net-worth/owed" className="hover:underline">{money(owedTotal)} owed to you</Link>} />
        <Stat label="Net worth + owed" value={money(nw.netWorthPlusOwed)} sub={sinceText('netWorthPlusOwed')} className="col-span-2 xl:col-span-1" />
      </div>

      <div className="grid gap-4 md:gap-5 xl:grid-cols-[420px_minmax(0,1fr)] items-start mb-5">
        <Card
          title="Balances"
          action={<button className="btn btn-ghost btn-sm" onClick={() => setManaging(true)}><Cog6ToothIcon className="h-4 w-4" /> Accounts</button>}
        >
          <div className="space-y-5">
            <p className="text-xs text-muted -mt-1">
              {suggestions
                ? <>Suggestions start from your <b className="text-ink-soft">{formatDate(suggestions.since)}</b> snapshot and add the transactions logged to each account since. Tap one to use it.</>
                : <>Save a snapshot and next time you’ll see a suggested balance for each account, based on the transactions you’ve logged since.</>}
              {suggestions?.unassigned > 0 && <span className="block mt-1 text-gold-600">{suggestions.unassigned} transaction{suggestions.unassigned === 1 ? '' : 's'} since then {suggestions.unassigned === 1 ? 'has' : 'have'} no account, so {suggestions.unassigned === 1 ? 'it isn’t' : 'they aren’t'} included.</span>}
            </p>
            <section>
              <div className="flex justify-between text-[12px] font-semibold uppercase tracking-[0.08em] text-muted mb-2">
                <span>Cash accounts</span><span className="num">{money(nw.cash)}</span>
              </div>
              <ul className="space-y-3">
                {banks.map(a => (
                  <li key={a.id}>
                    <div className="flex items-center gap-3">
                      <span className="flex-1 min-w-0 truncate text-sm font-medium">{a.name}</span>
                      {balanceInput(a)}
                    </div>
                    {suggestionLine(a)}
                  </li>
                ))}
                {!banks.length && <li className="text-sm text-muted">No cash accounts — add one under Accounts.</li>}
              </ul>
            </section>

            <section>
              <div className="flex justify-between text-[12px] font-semibold uppercase tracking-[0.08em] text-muted mb-2">
                <span>Investments</span><span className="num">{money(investments)}</span>
              </div>
              <Link to="/investing/portfolio" className="flex items-center justify-between rounded-xl bg-cream-100 border border-line px-3.5 py-2.5 text-sm hover:border-forest-400">
                <span className="font-medium">Share portfolio <span className="text-muted font-normal">· live value</span></span>
                <span className="flex items-center gap-1.5 num font-semibold">{money(investments)} <ArrowRightIcon className="h-3.5 w-3.5 text-muted" /></span>
              </Link>
              {others.length > 0 && (
                <ul className="space-y-3 mt-2">
                  {others.map(a => (
                    <li key={a.id}>
                      <div className="flex items-center gap-3">
                        <span className="flex-1 min-w-0 truncate text-sm font-medium">{a.name} <span className="text-muted font-normal">· non-liquid</span></span>
                        {balanceInput(a)}
                      </div>
                      {suggestionLine(a)}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <div className="flex justify-between text-[12px] font-semibold uppercase tracking-[0.08em] text-muted mb-2">
                <span>Credit cards · enter available</span><span className="num text-loss">{money(-nw.credit)}</span>
              </div>
              <ul className="space-y-2.5">
                {credits.map(a => (
                  <li key={a.id}>
                    <div className="flex items-center gap-3">
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-sm font-medium">{a.name}</span>
                      {a.limit > 0 ? (
                        <span className="block text-xs text-muted num">
                          Owing <span className={a.balance > 0 ? 'text-loss font-semibold' : 'font-semibold'}>{money(a.balance)}</span> of {money(a.limit)} limit
                        </span>
                      ) : (
                        <button className="block text-xs text-loss font-semibold underline underline-offset-2" onClick={() => setManaging(true)}>Set a credit limit first</button>
                      )}
                    </span>
                    {a.limit > 0 ? (
                      <div className="shrink-0 text-right">
                        {balanceInput(a, 'available balance')}
                        <span className="block text-[11px] text-muted mt-0.5 pr-1">available</span>
                      </div>
                    ) : (
                      <div className="w-36 shrink-0 text-right text-sm text-muted">—</div>
                    )}
                    </div>
                    {suggestionLine(a)}
                  </li>
                ))}
                {!credits.length && <li className="text-sm text-muted">No credit cards.</li>}
              </ul>
            </section>

            <div className="flex gap-2 pt-1">
              <button className="btn btn-secondary flex-1" onClick={onSaveBalances} disabled={!dirty || saving}>Save balances</button>
              <button className="btn btn-primary flex-1" onClick={snapshot} disabled={saving}><CameraIcon className="h-4 w-4" /> Save snapshot</button>
            </div>
            {dirty && <p className="text-xs text-gold-600 -mt-2">Unsaved balance changes.</p>}
          </div>
        </Card>

        <Card title="Net worth over time" action={<Segmented value={range} onChange={setRange} options={RANGES} />}>
          <div className="flex flex-wrap gap-2 mb-3">
            {SERIES_DEFS.map(s => {
              const on = visible.includes(s.key);
              return (
                <button key={s.key} className={`chip !h-8 ${on ? '!border-forest-800 !text-forest-900 !bg-forest-50' : 'opacity-70'}`} aria-pressed={on}
                  onClick={() => setVisible(v => (on ? (v.length > 1 ? v.filter(k => k !== s.key) : v) : [...SERIES_DEFS.map(d => d.key).filter(k => v.includes(k) || k === s.key)]))}>
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: on ? s.color : '#c9b891' }} />
                  {s.label}
                </button>
              );
            })}
          </div>
          {chartData.length < 2 ? (
            <Empty icon={BuildingLibraryIcon} title={chartData.length ? 'One snapshot so far' : 'No snapshots yet'}>
              Press <b>Save snapshot</b> whenever you update your balances — weekly or monthly works well. Your chart builds from there.
            </Empty>
          ) : (
            <div className="h-[300px] -ml-2">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="date" tickFormatter={d => formatDate(d, { year: false })} stroke={CHART.axis} fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis tickFormatter={moneyCompact} stroke={CHART.axis} fontSize={12} tickLine={false} axisLine={false} width={60} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip labelFormatter={d => formatDate(d)} />} />
                  {SERIES_DEFS.filter(s => visible.includes(s.key)).map(s => (
                    <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.25}
                      dot={chartData.length < 30 ? { r: 3.5, fill: s.color, stroke: CHART.surface, strokeWidth: 2 } : false}
                      activeDot={{ r: 5, stroke: CHART.surface, strokeWidth: 2 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {sortedSnaps.length > 0 && (
        <Card title="Snapshot history" pad={false}>
          <div className="overflow-x-auto mt-2">
            <table className="table">
              <thead>
                <tr>
                  <th className="!pl-5">Date</th>
                  <th className="text-right hidden sm:table-cell">Liquid</th>
                  <th className="text-right hidden md:table-cell">Investments</th>
                  <th className="text-right hidden md:table-cell">Owed</th>
                  <th className="text-right">Net worth</th>
                  <th className="text-right">Change</th>
                  <th className="!pr-5" />
                </tr>
              </thead>
              <tbody>
                {[...sortedSnaps].reverse().map((s, i, arr) => {
                  const prev = arr[i + 1];
                  return (
                    <tr key={s.id}>
                      <td className="!pl-5 font-medium">{formatDate(s.date)}</td>
                      <td className="text-right num hidden sm:table-cell">{money(s.liquid)}</td>
                      <td className="text-right num hidden md:table-cell">{money(s.investments)}</td>
                      <td className="text-right num hidden md:table-cell">{money(s.owed)}</td>
                      <td className="text-right num font-semibold">{money(s.netWorth)}</td>
                      <td className="text-right">{prev ? <Delta value={s.netWorth - prev.netWorth} /> : <span className="text-muted text-xs">First</span>}</td>
                      <td className="!pr-5 text-right">
                        <button className="btn btn-ghost btn-icon !text-loss" aria-label="Delete snapshot" onClick={() => setDeleting(s)}><TrashIcon className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {managing && <ManageAccounts onClose={() => setManaging(false)} />}
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} title="Delete snapshot?"
        onConfirm={() => remove('snapshots', deleting.id).catch(err => toast(err.message, { tone: 'error' }))}>
        {deleting && `The snapshot from ${formatDate(deleting.date)} will be removed from your history.`}
      </Confirm>
    </>
  );
}

function ManageAccounts({ onClose }) {
  const { settings, saveSettings } = useData();
  const toast = useToast();
  const [rows, setRows] = useState(() => (settings?.accounts || []).map(a => ({ ...a, limit: a.limit ? String(a.limit) : '' })));
  const set = (i, k, v) => setRows(r => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const save = async () => {
    const clean = rows.filter(r => r.name.trim()).map(r => ({ ...r, name: r.name.trim(), limit: parseFloat(r.limit) || 0 }));
    const names = clean.map(r => r.name.toLowerCase());
    if (new Set(names).size !== names.length) return toast('Account names must be unique', { tone: 'error' });
    try {
      await saveSettings({ accounts: clean });
      toast('Accounts updated');
      onClose();
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  };

  return (
    <Modal open onClose={onClose} wide title="Accounts"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save accounts</button></>}>
      <p className="text-sm text-ink-soft mb-4">
        <b>Cash</b> accounts and <b>credit cards</b> make up your liquid net worth. <b>Other assets</b> (e.g. super, a car) count toward net worth only. Credit cards need a limit — on the Net Worth page you type the card’s available balance and the amount owing is worked out from the limit.
      </p>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_150px_120px_auto] gap-2 items-center rounded-xl border border-line p-2.5 sm:p-2 sm:border-0">
            <input className="input" placeholder="Account name" value={r.name} onChange={e => set(i, 'name', e.target.value)} />
            <button className="btn btn-ghost btn-icon !text-loss sm:order-last" aria-label="Remove account" onClick={() => setRows(x => x.filter((_, j) => j !== i))}><TrashIcon className="h-4 w-4" /></button>
            <select className="input" value={r.type} onChange={e => set(i, 'type', e.target.value)} aria-label="Account type">
              <option value="bank">Cash account</option>
              <option value="credit">Credit card</option>
              <option value="asset">Other asset</option>
            </select>
            {r.type === 'credit'
              ? <input className="input num" inputMode="decimal" placeholder="Limit" value={r.limit} onChange={e => set(i, 'limit', e.target.value.replace(/[^0-9.]/g, ''))} aria-label="Credit limit" />
              : <span className="hidden sm:block" />}
          </div>
        ))}
      </div>
      <button className="btn btn-secondary btn-sm mt-4" onClick={() => setRows(r => [...r, { id: newId(), name: '', type: 'bank', balance: 0, limit: '' }])}>
        <PlusIcon className="h-4 w-4" /> Add account
      </button>
    </Modal>
  );
}
