import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowPathRoundedSquareIcon, UserPlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { PageHeader, Segmented, Spinner } from '../components/ui';
import { CategoryIcon } from '../lib/icons';
import { money } from '../lib/format';
import { excludedCategories } from '../lib/categories';
import SplitSection from '../components/SplitSection';
import { emptySplitRow, splitOwedTotal, validSplits } from '../lib/split';
import { addDays, relativeDay, todayISO, startOfMonth } from '../lib/dates';

const blank = (type, account = '') => ({ type, amount: '', title: '', category: '', account, date: todayISO(), note: '' });

export default function AddTransaction() {
  const { settings, transactions, debts, add, addMany } = useData();
  const toast = useToast();
  const defaultAccount = type => {
    const id = settings?.preferences?.[type === 'income' ? 'defaultIncomeAccount' : 'defaultExpenseAccount'];
    return (settings?.accounts || []).find(a => a.id === id)?.name || '';
  };
  const [form, setForm] = useState(() => blank('expense', defaultAccount('expense')));
  const [showNote, setShowNote] = useState(false);
  const [split, setSplit] = useState(false);
  const [splitRows, setSplitRows] = useState([emptySplitRow()]);
  const [myShareOnly, setMyShareOnly] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const amountRef = useRef(null);
  const categoryTouched = useRef(false);

  const categories = settings?.categories?.[form.type] || [];
  const excluded = useMemo(() => excludedCategories(settings), [settings]);
  const accounts = settings?.accounts || [];
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Most-used titles, most recent first, with the category/account last used.
  const titleMemory = useMemo(() => {
    const map = new Map();
    [...transactions].sort((a, b) => a.date.localeCompare(b.date)).forEach(t => {
      const key = t.title.toLowerCase();
      const cur = map.get(key) || { title: t.title, count: 0 };
      map.set(key, { ...cur, count: cur.count + 1, category: t.category, account: t.account, type: t.type, last: t.date });
    });
    return [...map.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));
  }, [transactions]);

  const people = useMemo(() => [...new Set(debts.map(d => d.person))].sort(), [debts]);

  const recent = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 6),
    [transactions]
  );

  const monthStats = useMemo(() => {
    const from = startOfMonth(todayISO());
    let spent = 0, earned = 0;
    transactions.forEach(t => {
      if (t.date < from) return;
      if (t.type === 'income') earned += t.amount;
      else if (!excluded.has(t.category)) spent += t.amount;
    });
    return { spent, earned };
  }, [transactions, excluded]);

  const amountNum = parseFloat(form.amount) || 0;
  const owedTotal = split ? splitOwedTotal(splitRows) : 0;
  const recorded = split && myShareOnly ? amountNum - owedTotal : amountNum;

  const onTitle = value => {
    set('title', value);
    const match = titleMemory.find(m => m.title.toLowerCase() === value.trim().toLowerCase());
    if (match && match.type === form.type) {
      setForm(f => ({
        ...f,
        title: value,
        category: categoryTouched.current && f.category ? f.category : match.category,
        account: f.account || match.account || '',
      }));
    }
  };

  const switchType = type => {
    categoryTouched.current = false;
    // Swap to the other type's default account unless the user picked one themselves.
    setForm(f => ({ ...f, type, category: '', account: f.account === defaultAccount(f.type) ? defaultAccount(type) : f.account }));
    if (type === 'income') setSplit(false);
  };

  const reuse = t => {
    categoryTouched.current = true;
    setForm({ type: t.type, amount: String(t.amount), title: t.title, category: t.category, account: t.account || '', date: todayISO(), note: '' });
    setSplit(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    amountRef.current?.focus();
  };



  const submit = async e => {
    e.preventDefault();
    setError('');
    if (!(amountNum > 0)) return setError('Enter an amount greater than $0');
    if (!form.title.trim()) return setError('Add a short description');
    if (!form.category) return setError('Pick a category');
    const splits = split ? validSplits(splitRows) : [];
    if (split && myShareOnly && owedTotal >= amountNum) return setError('Amounts owed can’t exceed the total');

    setSaving(true);
    try {
      const saved = await add('transactions', { ...form, title: form.title.trim(), amount: Math.round(recorded * 100) / 100 });
      if (splits.length) {
        await addMany('debts', splits.map(r => ({ person: r.person.trim(), amount: parseFloat(r.amount), reason: form.title.trim(), date: form.date, transactionId: saved.id })));
      }
      toast(`${form.type === 'expense' ? 'Expense' : 'Income'} of ${money(recorded)} saved${splits.length ? ` · ${splits.length} IOU${splits.length > 1 ? 's' : ''} added` : ''}`);
      categoryTouched.current = false;
      setForm(blank(form.type, defaultAccount(form.type)));
      setSplit(false);
      setSplitRows([emptySplitRow()]);
      setShowNote(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isExpense = form.type === 'expense';
  const today = todayISO();

  return (
    <>
      <PageHeader eyebrow="Record" title="New transaction" subtitle="Log spending and income in a few taps." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <form onSubmit={submit} className="card overflow-hidden">
          <div className={`px-4 md:px-6 pt-5 pb-6 transition-colors ${isExpense ? 'bg-forest-900' : 'bg-forest-700'}`}>
            <Segmented
              value={form.type}
              onChange={switchType}
              size="lg"
              className="w-full !bg-white/10 !border-white/10 [&>button]:!text-cream-100 [&>button[aria-pressed=true]]:!text-forest-900"
              options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
            />
            <label htmlFor="amount" className="block text-center text-[12px] uppercase tracking-[0.14em] text-cream-200/70 mt-6">Amount</label>
            <div className="flex items-center justify-center mt-1">
              <span className="text-4xl md:text-5xl font-semibold text-gold-500 mr-1">$</span>
              <input
                id="amount"
                ref={amountRef}
                className="num bg-transparent text-cream-50 font-semibold tracking-tight outline-none max-w-[260px] placeholder:text-cream-50/30 !text-[44px] md:!text-[56px]"
                style={{ width: `${Math.max(4, form.amount.length || 4) * 0.62 + 0.3}em` }}
                inputMode="decimal"
                enterKeyHint="next"
                placeholder="0.00"
                autoComplete="off"
                value={form.amount}
                onChange={e => set('amount', e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
              />
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-5">
            <div>
              <label className="label" htmlFor="title">Description</label>
              <input
                id="title"
                className="input"
                list="title-suggestions"
                placeholder={isExpense ? 'e.g. Coles, Uber, Netflix' : 'e.g. Pay, Centrelink'}
                autoComplete="off"
                enterKeyHint="done"
                value={form.title}
                onChange={e => onTitle(e.target.value)}
              />
              <datalist id="title-suggestions">
                {titleMemory.filter(m => m.type === form.type).slice(0, 40).map(m => <option key={m.title} value={m.title} />)}
              </datalist>
            </div>

            <div>
              <div className="label">Category</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2">
                {categories.map(c => {
                  const active = form.category === c.name;
                  return (
                    <button
                      type="button"
                      key={c.name}
                      onClick={() => { categoryTouched.current = true; set('category', c.name); }}
                      aria-pressed={active}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-[12px] font-semibold transition active:scale-[0.97] ${
                        active ? 'border-forest-800 bg-forest-800 text-cream-50 shadow' : 'border-line bg-white text-ink-soft hover:border-forest-400'
                      }`}
                    >
                      <CategoryIcon icon={c.icon} className={`h-5 w-5 ${active ? 'text-gold-500' : 'text-forest-600'}`} />
                      <span className="truncate max-w-full">{c.name}</span>
                    </button>
                  );
                })}
              </div>
              <Link to="/settings" className="inline-block text-xs text-muted mt-2 hover:text-forest-700">Edit categories →</Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <div>
                <div className="label">Date</div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={`chip ${form.date === today ? 'chip-active' : ''}`} onClick={() => set('date', today)}>Today</button>
                  <button type="button" className={`chip ${form.date === addDays(today, -1) ? 'chip-active' : ''}`} onClick={() => set('date', addDays(today, -1))}>Yesterday</button>
                  <input type="date" aria-label="Pick a date" className="input !h-9 flex-1 min-w-[150px] !w-auto" value={form.date} max={addDays(today, 365)} onChange={e => e.target.value && set('date', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="account">{isExpense ? 'Paid from' : 'Paid into'} <span className="text-muted font-normal">(optional)</span></label>
                <select id="account" className="input" value={form.account} onChange={e => set('account', e.target.value)}>
                  <option value="">No account</option>
                  {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              </div>
            </div>

            {showNote ? (
              <div>
                <label className="label" htmlFor="note">Note</label>
                <textarea id="note" rows={2} className="input" value={form.note} onChange={e => set('note', e.target.value)} placeholder="Anything worth remembering" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowNote(true)}>
                  <PencilSquareIcon className="h-4 w-4" /> Add note
                </button>
                {isExpense && !split && (
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSplit(true)}>
                    <UserPlusIcon className="h-4 w-4" /> Split / someone owes me
                  </button>
                )}
              </div>
            )}
            {showNote && isExpense && !split && (
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSplit(true)}>
                <UserPlusIcon className="h-4 w-4" /> Split / someone owes me
              </button>
            )}

            {split && (
              <SplitSection
                rows={splitRows}
                setRows={setSplitRows}
                total={amountNum}
                myShareOnly={myShareOnly}
                setMyShareOnly={setMyShareOnly}
                people={people}
                onRemove={() => setSplit(false)}
              />
            )}

            {error && <div className="rounded-xl bg-loss-bg text-loss text-sm px-3.5 py-2.5">{error}</div>}

            <button className="btn btn-primary w-full !h-12 text-base" disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />}
              Save {isExpense ? 'expense' : 'income'}{amountNum > 0 ? ` · ${money(recorded)}` : ''}
            </button>
          </div>
        </form>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="card card-pad">
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Spent this month</div>
              <div className="num text-xl font-semibold text-forest-900 mt-1.5">{money(monthStats.spent)}</div>
            </div>
            <div className="card card-pad">
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Earned this month</div>
              <div className="num text-xl font-semibold text-gain mt-1.5">{money(monthStats.earned)}</div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between px-4 md:px-5 pt-4">
              <h2 className="card-title">Recent</h2>
              <Link to="/transactions" className="text-sm font-semibold text-forest-700 hover:underline">View all</Link>
            </div>
            {recent.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-soft">Your latest transactions will appear here. Tap one to log it again.</p>
            ) : (
              <ul className="p-2">
                {recent.map(t => {
                  const cat = (settings?.categories?.[t.type] || []).find(c => c.name === t.category);
                  return (
                    <li key={t.id}>
                      <button type="button" onClick={() => reuse(t)} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-cream-100 group">
                        <span className="h-9 w-9 rounded-xl bg-forest-100 text-forest-700 grid place-items-center shrink-0">
                          <CategoryIcon icon={cat?.icon} className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink truncate">{t.title}</span>
                          <span className="block text-xs text-muted">{relativeDay(t.date)} · {t.category}</span>
                        </span>
                        <span className={`num text-sm font-semibold ${t.type === 'income' ? 'text-gain' : 'text-ink'}`}>
                          {t.type === 'income' ? '+' : '-'}{money(t.amount)}
                        </span>
                        <ArrowPathRoundedSquareIcon className="h-4 w-4 text-muted opacity-60 group-hover:opacity-100" title="Log again" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
