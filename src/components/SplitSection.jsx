import { useId } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { money } from '../lib/format';
import { emptySplitRow, splitOwedTotal } from '../lib/split';

// "Someone owes me part of this" editor, shared by the Add screen and the transaction editor.
export default function SplitSection({ rows, setRows, total, myShareOnly, setMyShareOnly, people = [], onRemove }) {
  const listId = useId();
  const owed = splitOwedTotal(rows);
  const myShare = myShareOnly ? total - owed : total;

  const splitEvenly = () => {
    const share = Math.floor((total / (rows.length + 1)) * 100) / 100; // +1 for me
    setRows(rs => rs.map(r => ({ ...r, amount: share ? share.toFixed(2) : '' })));
  };
  const setRow = (i, k, v) => setRows(rs => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  return (
    <div className="rounded-2xl border border-gold-500/40 bg-cream-100/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-forest-900 text-sm">Money owed to you</div>
        <button type="button" className="btn btn-ghost btn-icon !h-8 !w-8" onClick={onRemove} aria-label="Remove split"><XMarkIcon className="h-4 w-4" /></button>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <input className="input flex-1 min-w-0" list={listId} placeholder="Name" value={row.person} onChange={e => setRow(i, 'person', e.target.value)} />
          <input className="input !w-28 num" inputMode="decimal" placeholder="$0.00" value={row.amount} onChange={e => setRow(i, 'amount', e.target.value.replace(/[^0-9.]/g, ''))} />
          {rows.length > 1 && (
            <button type="button" className="btn btn-ghost btn-icon !h-11" aria-label="Remove person" onClick={() => setRows(rs => rs.filter((_, j) => j !== i))}><XMarkIcon className="h-4 w-4" /></button>
          )}
        </div>
      ))}
      <datalist id={listId}>{people.map(p => <option key={p} value={p} />)}</datalist>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => setRows(r => [...r, emptySplitRow()])}>+ Person</button>
        <button type="button" className="btn btn-sm btn-secondary" onClick={splitEvenly} disabled={!total}>Split evenly</button>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-ink-soft cursor-pointer">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-forest-700" checked={myShareOnly} onChange={e => setMyShareOnly(e.target.checked)} />
        <span>Only count my share as spending <span className="num font-semibold text-ink">({money(Math.max(myShare, 0))})</span>. The rest is added to Money Owed.</span>
      </label>
    </div>
  );
}
