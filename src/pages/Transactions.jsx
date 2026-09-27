import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowPathIcon, MagnifyingGlassIcon, AdjustmentsHorizontalIcon, ArrowDownTrayIcon, XMarkIcon, ListBulletIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useData } from '../context/DataContext';
import { PageHeader, Segmented, Empty } from '../components/ui';
import TransactionEditor from '../components/TransactionEditor';
import { CategoryIcon } from '../lib/icons';
import { money, toneClass } from '../lib/format';
import { addMonths, endOfMonth, relativeDay, startOfMonth, todayISO } from '../lib/dates';
import { download, toCSV } from '../lib/csv';
import { excludedCategories } from '../lib/categories';

const PERIODS = [
  { value: 'all', label: 'All time' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: '3m', label: 'Last 3 months' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

function periodRange(period, custom) {
  const t = todayISO();
  switch (period) {
    case 'this-month': return [startOfMonth(t), endOfMonth(t)];
    case 'last-month': { const m = addMonths(startOfMonth(t), -1); return [m, endOfMonth(m)]; }
    case '3m': return [addMonths(startOfMonth(t), -2), endOfMonth(t)];
    case 'year': return [`${t.slice(0, 4)}-01-01`, `${t.slice(0, 4)}-12-31`];
    case 'custom': return [custom.from || '0000-01-01', custom.to || '9999-12-31'];
    default: return ['0000-01-01', '9999-12-31'];
  }
}

const PAGE = 60;

export default function Transactions() {
  const { transactions, settings } = useData();
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query);
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('');
  const [account, setAccount] = useState('');
  const [period, setPeriod] = useState('all');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState(null);
  const [limit, setLimit] = useState(PAGE);

  const excluded = useMemo(() => excludedCategories(settings), [settings]);

  const iconFor = useMemo(() => {
    const map = {};
    for (const t of ['expense', 'income']) (settings?.categories?.[t] || []).forEach(c => { map[`${t}:${c.name}`] = c.icon; });
    return map;
  }, [settings]);

  const allCategories = useMemo(() => [...new Set(transactions.map(t => t.category).concat(
    (settings?.categories?.expense || []).map(c => c.name), (settings?.categories?.income || []).map(c => c.name)
  ))].filter(Boolean).sort(), [transactions, settings]);
  const allAccounts = useMemo(() => [...new Set(transactions.map(t => t.account).filter(Boolean))].sort(), [transactions]);

  const filtered = useMemo(() => {
    const [from, to] = periodRange(period, custom);
    const needle = q.trim().toLowerCase();
    const amountNeedle = parseFloat(needle.replace(/[$,]/g, ''));
    let list = transactions.filter(t => {
      if (type !== 'all' && t.type !== type) return false;
      if (category && t.category !== category) return false;
      if (account && t.account !== account) return false;
      if (t.date < from || t.date > to) return false;
      if (needle) {
        const hay = `${t.title} ${t.category} ${t.note} ${t.account}`.toLowerCase();
        const amountMatch = !Number.isNaN(amountNeedle) && Math.abs(t.amount - amountNeedle) < 0.005;
        if (!hay.includes(needle) && !amountMatch && !t.amount.toFixed(2).startsWith(needle)) return false;
      }
      return true;
    });
    const cmp = {
      newest: (a, b) => b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt)),
      oldest: (a, b) => a.date.localeCompare(b.date) || String(a.createdAt).localeCompare(String(b.createdAt)),
      largest: (a, b) => b.amount - a.amount,
      smallest: (a, b) => a.amount - b.amount,
    }[sort];
    return list.sort(cmp);
  }, [transactions, q, type, category, account, period, custom, sort]);

  const totals = useMemo(() => {
    let income = 0, expense = 0;
    filtered.forEach(t => { if (t.type === 'income') income += t.amount; else expense += t.amount; });
    return { income, expense, net: income - expense };
  }, [filtered]);

  const byDate = sort === 'newest' || sort === 'oldest';
  const groups = useMemo(() => {
    const shown = filtered.slice(0, limit);
    if (!byDate) return [{ key: 'all', items: shown }];
    const out = [];
    for (const t of shown) {
      const last = out[out.length - 1];
      if (last && last.key === t.date) last.items.push(t);
      else out.push({ key: t.date, items: [t] });
    }
    return out;
  }, [filtered, limit, byDate]);

  const activeFilters = [type !== 'all', category, account, period !== 'all'].filter(Boolean).length;
  const clearFilters = () => { setType('all'); setCategory(''); setAccount(''); setPeriod('all'); setCustom({ from: '', to: '' }); };

  const exportCSV = () => {
    const csv = toCSV(filtered, [
      { label: 'Date', value: t => t.date },
      { label: 'Type', value: t => t.type },
      { label: 'Description', value: t => t.title },
      { label: 'Category', value: t => t.category },
      { label: 'Account', value: t => t.account },
      { label: 'Amount', value: t => (t.type === 'expense' ? -t.amount : t.amount).toFixed(2) },
      { label: 'Note', value: t => t.note },
    ]);
    download(`transactions-${todayISO()}.csv`, csv);
  };

  return (
    <>
      <PageHeader
        eyebrow="Activity"
        title="Transactions"
        subtitle={`${transactions.length.toLocaleString()} recorded`}
        actions={
          <>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV} disabled={!filtered.length}><ArrowDownTrayIcon className="h-4 w-4" /> Export CSV</button>
            <Link to="/add" className="btn btn-primary btn-sm hidden lg:inline-flex"><PlusIcon className="h-4 w-4" /> New</Link>
          </>
        }
      />

      <div className="card p-3 md:p-4 mb-4 space-y-3 sticky top-[calc(56px+env(safe-area-inset-top))] lg:top-4 z-20">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-5 w-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              className="input !pl-10"
              placeholder="Search description, category, note or amount"
              value={query}
              onChange={e => { setQuery(e.target.value); setLimit(PAGE); }}
            />
          </div>
          <button className={`btn btn-secondary relative ${showFilters ? '!bg-forest-100' : ''}`} onClick={() => setShowFilters(s => !s)} aria-expanded={showFilters}>
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters > 0 && <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-gold-500 text-forest-950 text-[11px] font-bold grid place-items-center">{activeFilters}</span>}
          </button>
        </div>
        {showFilters && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 pt-1">
            <Segmented value={type} onChange={setType} className="sm:col-span-2 lg:col-span-1 [&>button]:flex-1" options={[{ value: 'all', label: 'All' }, { value: 'expense', label: 'Out' }, { value: 'income', label: 'In' }]} />
            <select className="input" value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
              <option value="">All categories</option>
              {allCategories.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="input" value={account} onChange={e => setAccount(e.target.value)} aria-label="Account">
              <option value="">All accounts</option>
              {allAccounts.map(a => <option key={a}>{a}</option>)}
            </select>
            <select className="input" value={period} onChange={e => setPeriod(e.target.value)} aria-label="Period">
              {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select className="input" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="largest">Largest amount</option>
              <option value="smallest">Smallest amount</option>
            </select>
            {period === 'custom' && (
              <div className="sm:col-span-2 lg:col-span-5 grid grid-cols-2 gap-3 [&>*]:min-w-0">
                <input type="date" className="input" aria-label="From" value={custom.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} />
                <input type="date" className="input" aria-label="To" value={custom.to} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} />
              </div>
            )}
            {activeFilters > 0 && (
              <button className="btn btn-ghost btn-sm justify-self-start" onClick={clearFilters}><XMarkIcon className="h-4 w-4" /> Clear filters</button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
        <div className="card px-3 py-3 md:px-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Money in</div>
          <div className="num font-semibold text-gain mt-1 text-[15px] md:text-lg">{money(totals.income)}</div>
        </div>
        <div className="card px-3 py-3 md:px-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Money out</div>
          <div className="num font-semibold text-ink mt-1 text-[15px] md:text-lg">{money(totals.expense)}</div>
        </div>
        <div className="card px-3 py-3 md:px-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Net · {filtered.length}</div>
          <div className={`num font-semibold mt-1 text-[15px] md:text-lg ${toneClass(totals.net)}`}>{money(totals.net, { sign: true })}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          transactions.length === 0 ? (
            <Empty icon={ListBulletIcon} title="No transactions yet" action={<Link to="/add" className="btn btn-primary">Add your first</Link>}>
              Everything you record will be listed and searchable here.
            </Empty>
          ) : (
            <Empty icon={MagnifyingGlassIcon} title="No matches">Try a different search or clear your filters.</Empty>
          )
        ) : (
          <>
            {groups.map(g => {
              const dayNet = g.items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
              return (
                <div key={g.key}>
                  {byDate && (
                    <div className="flex items-center justify-between px-4 md:px-5 py-2 bg-cream-100/70 border-b border-line text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-soft">
                      <span>{relativeDay(g.key)}</span>
                      <span className={`num ${toneClass(dayNet)}`}>{money(dayNet, { sign: true })}</span>
                    </div>
                  )}
                  <ul>
                    {g.items.map(t => (
                      <li key={t.id} className="border-b border-line/70 last:border-b-0">
                        <button onClick={() => setEditing(t)} className="w-full flex items-center gap-3 px-4 md:px-5 py-3 text-left hover:bg-cream-50 transition">
                          <span className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${t.type === 'income' ? 'bg-gain-bg text-gain' : 'bg-forest-100 text-forest-700'}`}>
                            <CategoryIcon icon={iconFor[`${t.type}:${t.category}`]} className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="font-semibold text-ink truncate">{t.title}</span>
                              {t.type === 'expense' && excluded.has(t.category) && <span className="badge bg-cream-200 text-gold-600 shrink-0">Not spending</span>}
                              {t.recurringId && <span className="badge badge-neutral shrink-0" title="Added by a repeat transaction"><ArrowPathIcon className="h-3 w-3" />Repeat</span>}
                            </span>
                            <span className="block text-[13px] text-muted truncate">
                              {t.category}{t.account ? ` · ${t.account}` : ''}{!byDate ? ` · ${relativeDay(t.date)}` : ''}{t.note ? ` · ${t.note}` : ''}
                            </span>
                          </span>
                          <span className={`num font-semibold ${t.type === 'income' ? 'text-gain' : 'text-ink'}`}>
                            {t.type === 'income' ? '+' : '-'}{money(t.amount)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {filtered.length > limit && (
              <div className="p-4 text-center border-t border-line">
                <button className="btn btn-secondary" onClick={() => setLimit(l => l + PAGE * 2)}>Show more ({filtered.length - limit} remaining)</button>
              </div>
            )}
          </>
        )}
      </div>

      {editing && <TransactionEditor transaction={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
