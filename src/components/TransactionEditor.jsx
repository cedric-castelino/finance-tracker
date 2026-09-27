import { useMemo, useState } from 'react';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Modal, Segmented, Confirm } from './ui';
import SplitSection from './SplitSection';
import { emptySplitRow, splitOwedTotal, validSplits } from '../lib/split';
import { money } from '../lib/format';

export default function TransactionEditor({ transaction, onClose }) {
  const { settings, debts, update, remove, restore, addMany } = useData();
  const toast = useToast();
  const [form, setForm] = useState(() => ({ ...transaction, amount: String(transaction.amount) }));
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [split, setSplit] = useState(false);
  const [splitRows, setSplitRows] = useState([emptySplitRow()]);
  const [myShareOnly, setMyShareOnly] = useState(true);
  const people = useMemo(() => [...new Set(debts.map(d => d.person))].sort(), [debts]);
  const linked = debts.filter(d => d.transactionId === transaction.id);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const categories = settings?.categories?.[form.type] || [];
  const categoryOptions = categories.some(c => c.name === form.category) || !form.category
    ? categories
    : [...categories, { name: form.category }];

  const amountNum = parseFloat(form.amount) || 0;
  const splitting = split && form.type === 'expense';

  const save = async () => {
    const amount = amountNum;
    if (!(amount > 0)) return setError('Enter an amount greater than $0');
    if (!form.title.trim()) return setError('Description is required');
    const splits = splitting ? validSplits(splitRows) : [];
    const owed = splitOwedTotal(splits);
    if (splitting && !splits.length) return setError('Add a name and amount for who owes you');
    if (splitting && myShareOnly && owed >= amount) return setError('Amounts owed can’t exceed the total');
    const saveAmount = splitting && myShareOnly ? Math.round((amount - owed) * 100) / 100 : amount;
    try {
      await update('transactions', transaction.id, { ...form, title: form.title.trim(), amount: saveAmount });
      if (splits.length) {
        await addMany('debts', splits.map(r => ({
          person: r.person.trim(), amount: parseFloat(r.amount), reason: form.title.trim(), date: form.date, transactionId: transaction.id,
        })));
      }
      toast(splits.length ? `Split saved · ${money(owed)} added to Money Owed` : 'Transaction updated');
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const del = async () => {
    try {
      const removed = await remove('transactions', transaction.id);
      onClose();
      toast('Transaction deleted', { action: { label: 'Undo', onClick: () => restore('transactions', removed) } });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit transaction"
      footer={
        <>
          <button className="btn btn-ghost !text-loss mr-auto" onClick={() => setConfirm(true)}>Delete</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>{splitting && myShareOnly && amountNum > 0 ? `Save · ${money(Math.max(amountNum - splitOwedTotal(splitRows), 0))}` : 'Save'}</button>
        </>
      }
    >
      <div className="space-y-4">
        <Segmented
          value={form.type}
          onChange={v => setForm(f => ({ ...f, type: v, category: '' }))}
          className="w-full"
          size="lg"
          options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
        />
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <div>
            <label className="label" htmlFor="e-amount">Amount</label>
            <input id="e-amount" className="input num" inputMode="decimal" value={form.amount} onChange={e => set('amount', e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          <div>
            <label className="label" htmlFor="e-date">Date</label>
            <input id="e-date" type="date" className="input" value={form.date} onChange={e => e.target.value && set('date', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="e-title">Description</label>
          <input id="e-title" className="input" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <div>
            <label className="label" htmlFor="e-cat">Category</label>
            <select id="e-cat" className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="" disabled>Select…</option>
              {categoryOptions.map(c => <option key={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="e-acc">Account</label>
            <select id="e-acc" className="input" value={form.account} onChange={e => set('account', e.target.value)}>
              <option value="">No account</option>
              {(settings?.accounts || []).map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              {form.account && !(settings?.accounts || []).some(a => a.name === form.account) && <option value={form.account}>{form.account}</option>}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="e-note">Note</label>
          <textarea id="e-note" rows={2} className="input" value={form.note} onChange={e => set('note', e.target.value)} />
        </div>
        {linked.length > 0 && (
          <div className="rounded-xl border border-line bg-cream-50 px-3.5 py-3">
            <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted mb-1.5">Already split</div>
            <ul className="space-y-1 text-sm">
              {linked.map(d => (
                <li key={d.id} className="flex justify-between gap-3">
                  <span className="truncate">{d.person}{d.settled && <span className="text-muted"> · repaid</span>}</span>
                  <span className="num font-semibold">{money(d.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {form.type === 'expense' && (split ? (
          <SplitSection
            rows={splitRows}
            setRows={setSplitRows}
            total={amountNum}
            myShareOnly={myShareOnly}
            setMyShareOnly={setMyShareOnly}
            people={people}
            onRemove={() => { setSplit(false); setSplitRows([emptySplitRow()]); }}
          />
        ) : (
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSplit(true)}>
            <UserPlusIcon className="h-4 w-4" /> {linked.length ? 'Split with someone else' : 'Split / someone owes me'}
          </button>
        ))}
        {error && <div className="rounded-xl bg-loss-bg text-loss text-sm px-3.5 py-2.5">{error}</div>}
      </div>
      <Confirm open={confirm} onClose={() => setConfirm(false)} onConfirm={del} title="Delete transaction?">
        This removes “{transaction.title}” permanently.
      </Confirm>
    </Modal>
  );
}
