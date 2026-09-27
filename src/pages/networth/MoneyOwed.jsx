import { useMemo, useState } from 'react';
import { CheckIcon, ArrowUturnLeftIcon, TrashIcon, UserGroupIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, SubNav, Stat, Card, Empty, Spinner, Confirm } from '../../components/ui';
import { money } from '../../lib/format';
import { formatDate, todayISO } from '../../lib/dates';
import { computeNetWorth } from '../../lib/networth';
import { NETWORTH_NAV } from '../../lib/nav';

export default function MoneyOwed() {
  const { debts, add, update, remove, restore, owedTotal, settings, portfolio } = useData();
  const toast = useToast();
  const [form, setForm] = useState({ person: '', amount: '', reason: '', date: todayISO() });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSettled, setShowSettled] = useState(false);
  const [settlePerson, setSettlePerson] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const people = useMemo(() => {
    const map = new Map();
    debts.forEach(d => {
      const key = d.person.trim().toLowerCase();
      const p = map.get(key) || { name: d.person, outstanding: 0, open: [], settled: [] };
      if (d.settled) p.settled.push(d);
      else { p.open.push(d); p.outstanding += d.amount; }
      map.set(key, p);
    });
    const list = [...map.values()];
    list.forEach(p => {
      p.open.sort((a, b) => b.date.localeCompare(a.date));
      p.settled.sort((a, b) => (b.settledDate || b.date).localeCompare(a.settledDate || a.date));
    });
    return list.sort((a, b) => b.outstanding - a.outstanding || a.name.localeCompare(b.name));
  }, [debts]);

  const shown = showSettled ? people : people.filter(p => p.open.length);
  const nw = computeNetWorth(settings?.accounts || [], portfolio.totals.value, owedTotal);
  const settledTotal = debts.filter(d => d.settled).reduce((s, d) => s + d.amount, 0);

  const submit = async e => {
    e.preventDefault();
    setError('');
    const amount = parseFloat(form.amount);
    if (!form.person.trim()) return setError('Who owes you?');
    if (!(amount > 0)) return setError('Enter an amount');
    setSaving(true);
    try {
      await add('debts', { ...form, person: form.person.trim(), amount });
      toast(`${form.person.trim()} owes you ${money(amount)}`);
      setForm(f => ({ person: '', amount: '', reason: '', date: f.date }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const settle = async (d, settled = true) => {
    try {
      await update('debts', d.id, { settled, settledDate: settled ? todayISO() : '' });
      if (settled) toast(`Marked ${money(d.amount)} from ${d.person} as repaid`, { action: { label: 'Undo', onClick: () => update('debts', d.id, { settled: false, settledDate: '' }) } });
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  };

  const settleAll = async p => {
    try {
      await Promise.all(p.open.map(d => update('debts', d.id, { settled: true, settledDate: todayISO() })));
      toast(`${p.name} is all squared up`);
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  };

  const del = async d => {
    try {
      const removed = await remove('debts', d.id);
      toast('Entry deleted', { action: { label: 'Undo', onClick: () => restore('debts', removed) } });
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  };

  return (
    <>
      <PageHeader eyebrow="Wealth" title="Money owed to you" subtitle="Track IOUs — outstanding amounts feed into your “+ owed” net worth figures." />
      <SubNav items={NETWORTH_NAV} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-5">
        <Stat emphasis label="Outstanding" value={money(owedTotal)} sub={`${people.filter(p => p.open.length).length} people`} className="col-span-2 xl:col-span-1" />
        <Stat label="Liquid + owed" value={money(nw.liquidPlusOwed)} sub={`Liquid ${money(nw.liquid)}`} />
        <Stat label="Net worth + owed" value={money(nw.netWorthPlusOwed)} sub={`Net worth ${money(nw.netWorth)}`} />
        <Stat label="Repaid to date" value={money(settledTotal)} sub={`${debts.filter(d => d.settled).length} settled entries`} className="col-span-2 xl:col-span-1" />
      </div>

      <div className="grid gap-4 md:gap-5 xl:grid-cols-[360px_minmax(0,1fr)] items-start">
        <Card title="Add IOU">
          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="label" htmlFor="o-person">Person</label>
              <input id="o-person" className="input" list="o-people" autoComplete="off" value={form.person} onChange={e => set('person', e.target.value)} placeholder="Name" />
              <datalist id="o-people">{people.map(p => <option key={p.name} value={p.name} />)}</datalist>
            </div>
            <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
              <div>
                <label className="label" htmlFor="o-amount">Amount</label>
                <input id="o-amount" className="input num" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value.replace(/[^0-9.]/g, ''))} />
              </div>
              <div>
                <label className="label" htmlFor="o-date">Date</label>
                <input id="o-date" type="date" className="input" value={form.date} onChange={e => e.target.value && set('date', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="o-reason">Reason</label>
              <input id="o-reason" className="input" value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="e.g. Concert tickets" />
            </div>
            {error && <div className="rounded-xl bg-loss-bg text-loss text-sm px-3.5 py-2.5">{error}</div>}
            <button className="btn btn-primary w-full" disabled={saving}>{saving ? <Spinner className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />} Add</button>
          </form>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="card-title">By person</h2>
            <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-forest-700" checked={showSettled} onChange={e => setShowSettled(e.target.checked)} />
              Show repaid
            </label>
          </div>
          {shown.length === 0 ? (
            <div className="card">
              <Empty icon={UserGroupIcon} title="Nobody owes you anything">
                Add an IOU here, or use “Split / someone owes me” when recording an expense.
              </Empty>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {shown.map(p => (
                <section key={p.name} className="card overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line bg-cream-100/50">
                    <div className="h-10 w-10 rounded-full bg-forest-800 text-cream-50 grid place-items-center font-semibold">{p.name.slice(0, 1).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className="text-xs text-muted">{p.open.length} open{p.settled.length ? ` · ${p.settled.length} repaid` : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className={`num font-semibold text-lg ${p.outstanding > 0 ? 'text-forest-900' : 'text-muted'}`}>{money(p.outstanding)}</div>
                      {p.open.length > 1 && <button className="text-xs font-semibold text-forest-700 hover:underline" onClick={() => setSettlePerson(p)}>Settle all</button>}
                    </div>
                  </div>
                  <ul>
                    {[...p.open, ...(showSettled ? p.settled : [])].map(d => (
                      <li key={d.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-line/70 last:border-b-0 ${d.settled ? 'opacity-60' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${d.settled ? 'line-through' : ''}`}>{d.reason || 'No reason given'}</div>
                          <div className="text-xs text-muted">{formatDate(d.date)}{d.settled && d.settledDate ? ` · repaid ${formatDate(d.settledDate)}` : ''}</div>
                        </div>
                        <span className="num text-sm font-semibold">{money(d.amount)}</span>
                        {d.settled ? (
                          <button className="btn btn-ghost btn-icon" aria-label="Mark as unpaid" onClick={() => settle(d, false)}><ArrowUturnLeftIcon className="h-4 w-4" /></button>
                        ) : (
                          <button className="btn btn-ghost btn-icon !text-gain" aria-label="Mark as repaid" onClick={() => settle(d)}><CheckIcon className="h-5 w-5" /></button>
                        )}
                        <button className="btn btn-ghost btn-icon !text-loss" aria-label="Delete entry" onClick={() => del(d)}><TrashIcon className="h-4 w-4" /></button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
      <Confirm open={!!settlePerson} onClose={() => setSettlePerson(null)} onConfirm={() => settleAll(settlePerson)} title="Settle all?" confirmLabel="Mark repaid">
        {settlePerson && `Mark all ${settlePerson.open.length} entries (${money(settlePerson.outstanding)}) from ${settlePerson.name} as repaid?`}
      </Confirm>
    </>
  );
}
