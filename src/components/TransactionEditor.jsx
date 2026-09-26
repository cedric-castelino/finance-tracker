import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Modal, Segmented, Confirm } from './ui';

export default function TransactionEditor({ transaction, onClose }) {
  const { settings, update, remove, restore } = useData();
  const toast = useToast();
  const [form, setForm] = useState(() => ({ ...transaction, amount: String(transaction.amount) }));
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const categories = settings?.categories?.[form.type] || [];
  const categoryOptions = categories.some(c => c.name === form.category) || !form.category
    ? categories
    : [...categories, { name: form.category }];

  const save = async () => {
    const amount = parseFloat(form.amount);
    if (!(amount > 0)) return setError('Enter an amount greater than $0');
    if (!form.title.trim()) return setError('Description is required');
    try {
      await update('transactions', transaction.id, { ...form, amount });
      toast('Transaction updated');
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
          <button className="btn btn-primary" onClick={save}>Save</button>
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
        <div className="grid grid-cols-2 gap-3">
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
        <div className="grid grid-cols-2 gap-3">
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
        {error && <div className="rounded-xl bg-loss-bg text-loss text-sm px-3.5 py-2.5">{error}</div>}
      </div>
      <Confirm open={confirm} onClose={() => setConfirm(false)} onConfirm={del} title="Delete transaction?">
        This removes “{transaction.title}” permanently.
      </Confirm>
    </Modal>
  );
}
