import { useMemo, useState } from 'react';
import { ArrowPathIcon, PauseIcon, PlayIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Card, Modal, Segmented, Confirm, Spinner } from './ui';
import { CategoryIcon } from '../lib/icons';
import { money } from '../lib/format';
import { formatDate, todayISO } from '../lib/dates';
import { FREQUENCIES, frequencyLabel, monthlyEquivalent, nextOccurrence } from '../lib/recurring';

export default function RecurringSettings() {
  const { recurring, settings, transactions, update, remove, reload } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState(null); // null | 'new' | item
  const [deleting, setDeleting] = useState(null);

  const items = useMemo(
    () => [...recurring].sort((a, b) => Number(b.active) - Number(a.active) || a.title.localeCompare(b.title)),
    [recurring]
  );
  const monthlySubs = recurring
    .filter(r => r.active && r.type === 'expense' && r.category.trim().toLowerCase() === 'subscriptions')
    .reduce((s, r) => s + monthlyEquivalent(r), 0);
  const iconFor = (type, cat) => (settings?.categories?.[type] || []).find(c => c.name === cat)?.icon;
  const countFor = id => transactions.filter(t => t.recurringId === id).length;

  const toggle = async r => {
    try {
      await update('recurring', r.id, { active: !r.active });
      if (!r.active) await reload(); // resuming may add anything that fell due while paused
      toast(r.active ? `${r.title} paused` : `${r.title} resumed`);
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  };

  const del = async r => {
    try {
      await remove('recurring', r.id);
      toast(`${r.title} stopped · past transactions kept`);
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  };

  return (
    <Card
      title="Repeat transactions"
      action={<button className="btn btn-secondary btn-sm" onClick={() => setEditing('new')}><PlusIcon className="h-4 w-4" /> Add</button>}
    >
      <p className="text-sm text-ink-soft mb-4">
        Subscriptions, rent, pay and other regular payments are added to your transactions automatically on each due date.
        {monthlySubs > 0 && <> About <b className="num text-ink">{money(monthlySubs)}</b> a month goes on subscriptions.</>}
      </p>
      {items.length === 0 ? (
        <button className="w-full rounded-xl border border-dashed border-cream-300 px-4 py-6 text-sm text-muted hover:border-forest-400 hover:text-forest-700" onClick={() => setEditing('new')}>
          <ArrowPathIcon className="h-6 w-6 mx-auto mb-1.5" />
          Add your first repeat transaction, e.g. Netflix $18.99 monthly
        </button>
      ) : (
        <ul className="divide-y divide-line border border-line rounded-xl overflow-hidden">
          {items.map(r => {
            const next = r.active ? nextOccurrence(r) : null;
            return (
              <li key={r.id} className={`flex items-center gap-3 px-3 py-2.5 bg-white ${r.active ? '' : 'opacity-60'}`}>
                <span className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${r.type === 'income' ? 'bg-gain-bg text-gain' : 'bg-forest-100 text-forest-700'}`}>
                  <CategoryIcon icon={iconFor(r.type, r.category)} className="h-[18px] w-[18px]" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-sm truncate">{r.title}</span>
                    <span className={`num text-sm font-semibold shrink-0 ${r.type === 'income' ? 'text-gain' : ''}`}>{r.type === 'income' ? '+' : '-'}{money(r.amount)}</span>
                  </div>
                  <div className="text-xs text-muted truncate">
                    {frequencyLabel(r.frequency)} · {!r.active ? 'Paused' : next ? `Next ${formatDate(next, { year: next.slice(0, 4) !== todayISO().slice(0, 4) })}` : 'Ended'} · {r.category}
                  </div>
                </div>
                <div className="flex shrink-0">
                  <button className="btn btn-ghost btn-icon" aria-label={`Edit ${r.title}`} onClick={() => setEditing(r)}><PencilIcon className="h-4 w-4" /></button>
                  <button className="btn btn-ghost btn-icon" aria-label={r.active ? `Pause ${r.title}` : `Resume ${r.title}`} onClick={() => toggle(r)}>
                    {r.active ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                  </button>
                  <button className="btn btn-ghost btn-icon !text-loss" aria-label={`Delete ${r.title}`} onClick={() => setDeleting(r)}><TrashIcon className="h-4 w-4" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && <RecurringForm item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => del(deleting)} title="Delete repeat transaction?">
        {deleting && `“${deleting.title}” won’t be added again. The ${countFor(deleting.id)} transaction${countFor(deleting.id) === 1 ? '' : 's'} it already created stay in your history.`}
      </Confirm>
    </Card>
  );
}

function RecurringForm({ item, onClose }) {
  const { settings, add, update, reload } = useData();
  const toast = useToast();
  const defaultAccount = type => {
    const id = settings?.preferences?.[type === 'income' ? 'defaultIncomeAccount' : 'defaultExpenseAccount'];
    return (settings?.accounts || []).find(a => a.id === id)?.name || '';
  };
  const [form, setForm] = useState(() => (item
    ? { ...item, amount: String(item.amount) }
    : { type: 'expense', amount: '', title: '', category: 'Subscriptions', account: defaultAccount('expense'), startDate: todayISO(), frequency: 'monthly', endDate: '', active: true }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const categories = settings?.categories?.[form.type] || [];
  const today = todayISO();

  // How many past occurrences a new item will back-fill (helps catch a wrong start date).
  const backfill = useMemo(() => {
    if (item || !form.startDate || form.startDate > today) return 0;
    let n = 0;
    let d = nextOccurrence({ ...form, lastDate: '' });
    while (d && d <= today && n < 1000) { n++; d = nextOccurrence({ ...form, lastDate: '' }, d); }
    return n;
  }, [form, item, today]);

  const save = async () => {
    setError('');
    const amount = parseFloat(form.amount);
    if (!(amount > 0)) return setError('Enter an amount greater than $0');
    if (!form.title.trim()) return setError('Give it a name, e.g. Netflix');
    if (!form.category) return setError('Pick a category');
    if (form.endDate && form.endDate < form.startDate) return setError('End date must be after the start date');
    setSaving(true);
    const payload = { type: form.type, amount, title: form.title.trim(), category: form.category, account: form.account, startDate: form.startDate, frequency: form.frequency, endDate: form.endDate, active: form.active };
    try {
      if (item) await update('recurring', item.id, payload);
      else await add('recurring', payload);
      await reload(); // picks up any transactions that are already due
      toast(item ? 'Repeat transaction updated' : backfill ? `${payload.title} scheduled · ${backfill} past transaction${backfill === 1 ? '' : 's'} added` : `${payload.title} scheduled`);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? 'Edit repeat transaction' : 'New repeat transaction'}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving && <Spinner className="h-4 w-4" />} Save</button>
        </>
      }
    >
      <div className="space-y-4">
        <Segmented
          value={form.type}
          onChange={v => setForm(f => ({ ...f, type: v, category: '', account: f.account === defaultAccount(f.type) ? defaultAccount(v) : f.account }))}
          className="w-full"
          size="lg"
          options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
        />
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <div>
            <label className="label" htmlFor="r-amount">Amount</label>
            <input id="r-amount" className="input num" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="label" htmlFor="r-freq">Repeats</label>
            <select id="r-freq" className="input" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
              {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="r-title">Name</label>
          <input id="r-title" className="input" placeholder={form.type === 'income' ? 'e.g. Pay' : 'e.g. Netflix'} value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <div>
            <label className="label" htmlFor="r-cat">Category</label>
            <select id="r-cat" className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="" disabled>Select…</option>
              {categories.map(c => <option key={c.name}>{c.name}</option>)}
              {form.category && !categories.some(c => c.name === form.category) && <option>{form.category}</option>}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="r-acc">Account</label>
            <select id="r-acc" className="input" value={form.account} onChange={e => set('account', e.target.value)}>
              <option value="">No account</option>
              {(settings?.accounts || []).map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <div>
            <label className="label" htmlFor="r-start">{item ? 'Schedule starts' : 'First payment'}</label>
            <input id="r-start" type="date" className="input" value={form.startDate} onChange={e => e.target.value && set('startDate', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="r-end">Ends <span className="text-muted font-normal">(optional)</span></label>
            <input id="r-end" type="date" className="input" value={form.endDate} min={form.startDate} onChange={e => set('endDate', e.target.value)} />
          </div>
        </div>
        {backfill > 0 && (
          <p className="text-sm rounded-xl bg-cream-100 border border-line px-3.5 py-2.5 text-ink-soft">
            The first date is in the past, so <b className="text-ink">{backfill}</b> earlier payment{backfill === 1 ? '' : 's'} will be added to your transactions too.
          </p>
        )}
        {item && <p className="text-xs text-muted">Changes apply to future payments. Transactions already added aren’t changed.</p>}
        {error && <div className="rounded-xl bg-loss-bg text-loss text-sm px-3.5 py-2.5">{error}</div>}
      </div>
    </Modal>
  );
}
