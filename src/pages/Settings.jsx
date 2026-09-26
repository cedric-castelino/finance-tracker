import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUpIcon, ChevronDownIcon, TrashIcon, PlusIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ArrowRightOnRectangleIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, Segmented, Modal, Confirm, Spinner } from '../components/ui';
import { CATEGORY_ICONS, CategoryIcon } from '../lib/icons';
import { api } from '../lib/api';
import { download } from '../lib/csv';
import { todayISO } from '../lib/dates';

export default function Settings() {
  const { user, logout } = useAuth();
  const data = useData();
  const { settings, saveSettings, reload } = data;
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [catType, setCatType] = useState('expense');
  const [cats, setCats] = useState(() => settings.categories);
  const [iconFor, setIconFor] = useState(null);
  const [newCat, setNewCat] = useState('');
  const [restoreData, setRestoreData] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const list = cats[catType] || [];
  const catsDirty = JSON.stringify(cats) !== JSON.stringify(settings.categories);
  const setList = next => setCats(c => ({ ...c, [catType]: next }));

  const move = (i, d) => {
    const next = [...list];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    setList(next);
  };

  const addCat = e => {
    e.preventDefault();
    const name = newCat.trim();
    if (!name) return;
    if (list.some(c => c.name.toLowerCase() === name.toLowerCase())) return toast('That category already exists', { tone: 'error' });
    setList([...list, { name, icon: 'tag' }]);
    setNewCat('');
  };

  const saveCats = async () => {
    try {
      await saveSettings({ categories: cats });
      toast('Categories saved');
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  };

  const exportBackup = () => {
    const payload = {
      app: 'ledger',
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions: data.transactions,
      trades: data.trades,
      snapshots: data.snapshots,
      debts: data.debts,
      settings: data.settings,
    };
    download(`ledger-backup-${todayISO()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  };

  const onFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object' || !('transactions' in parsed || 'trades' in parsed)) throw new Error();
      setRestoreData(parsed);
    } catch {
      toast('That file isn’t a Ledger backup', { tone: 'error' });
    }
  };

  const doRestore = async () => {
    setBusy(true);
    try {
      await api('/restore', { method: 'POST', body: restoreData });
      await reload();
      setCats(restoreData.settings?.categories || settings.categories);
      toast('Backup restored');
      setRestoreData(null);
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    try {
      await api('/auth/account', { method: 'DELETE' });
      logout();
      navigate('/login');
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  };

  return (
    <>
      <PageHeader eyebrow="Preferences" title="Settings" />
      <div className="grid gap-4 md:gap-5 xl:grid-cols-2 items-start">
        <Card title="Categories" action={<Segmented value={catType} onChange={setCatType} options={[{ value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }]} />}>
          <ul className="divide-y divide-line border border-line rounded-xl overflow-hidden">
            {list.map((c, i) => (
              <li key={c.name + i} className="flex items-center gap-2 px-2.5 py-2 bg-white">
                <button className="h-9 w-9 rounded-lg bg-forest-100 text-forest-700 grid place-items-center shrink-0 hover:ring-2 hover:ring-forest-300" aria-label={`Change icon for ${c.name}`} onClick={() => setIconFor(i)}>
                  <CategoryIcon icon={c.icon} />
                </button>
                <input className="input !h-9 flex-1 min-w-0 !border-transparent hover:!border-cream-300 focus:!border-forest-500" value={c.name}
                  onChange={e => setList(list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label="Category name" />
                <button className="btn btn-ghost btn-icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ChevronUpIcon className="h-4 w-4" /></button>
                <button className="btn btn-ghost btn-icon" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ChevronDownIcon className="h-4 w-4" /></button>
                <button className="btn btn-ghost btn-icon !text-loss" onClick={() => setList(list.filter((_, j) => j !== i))} aria-label="Remove"><TrashIcon className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <form onSubmit={addCat} className="flex gap-2 mt-3">
            <input className="input" placeholder="New category" value={newCat} onChange={e => setNewCat(e.target.value)} />
            <button className="btn btn-secondary"><PlusIcon className="h-4 w-4" /> Add</button>
          </form>
          <p className="text-xs text-muted mt-2">Renaming a category doesn’t change existing transactions. The order here is the order on the Add screen.</p>
          <div className="flex justify-end gap-2 mt-4">
            {catsDirty && <button className="btn btn-ghost" onClick={() => setCats(settings.categories)}>Discard</button>}
            <button className="btn btn-primary" disabled={!catsDirty} onClick={saveCats}>Save categories</button>
          </div>
        </Card>

        <div className="space-y-4 md:space-y-5">
          <Card title="Account">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gold-500 text-forest-950 grid place-items-center text-lg font-semibold">{user.firstName.slice(0, 1).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{user.firstName} {user.lastName}</div>
                <div className="text-sm text-muted truncate">{user.email}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { logout(); navigate('/login'); }}><ArrowRightOnRectangleIcon className="h-4 w-4" /> Sign out</button>
            </div>
          </Card>

          <Card title="Investing">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-forest-700" checked={!!settings.preferences?.convertForeign}
                onChange={e => saveSettings({ preferences: { ...settings.preferences, convertForeign: e.target.checked } })} />
              <span>
                <span className="block font-medium text-sm">Convert US share prices to AUD</span>
                <span className="block text-xs text-muted mt-0.5">Uses the live exchange rate so foreign holdings are valued in AUD alongside your ASX shares. Turn off if you record US trades in USD.</span>
              </span>
            </label>
          </Card>

          <Card title="Your data">
            <p className="text-sm text-ink-soft mb-4">Download a full backup of your transactions, trades, snapshots and IOUs — or restore from one.</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-secondary" onClick={exportBackup}><ArrowDownTrayIcon className="h-4 w-4" /> Download backup</button>
              <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}><ArrowUpTrayIcon className="h-4 w-4" /> Restore backup</button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
            </div>
          </Card>

          <Card title="Use it like an app on iPhone">
            <div className="flex gap-3 text-sm text-ink-soft">
              <DevicePhoneMobileIcon className="h-6 w-6 text-forest-600 shrink-0" />
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open this site in <b>Safari</b>.</li>
                <li>Tap the <b>Share</b> button, then <b>Add to Home Screen</b>.</li>
                <li>Launch <b>Ledger</b> from your home screen — it opens full-screen with no browser bars.</li>
              </ol>
            </div>
          </Card>

          <Card title="Danger zone">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-soft">Permanently delete your account and all data.</p>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>Delete account</button>
            </div>
          </Card>
        </div>
      </div>

      {iconFor != null && (
        <Modal open onClose={() => setIconFor(null)} title={`Icon for ${list[iconFor]?.name}`}>
          <div className="grid grid-cols-6 gap-2">
            {Object.keys(CATEGORY_ICONS).map(k => (
              <button key={k} aria-label={k} onClick={() => { setList(list.map((x, j) => (j === iconFor ? { ...x, icon: k } : x))); setIconFor(null); }}
                className={`aspect-square rounded-xl grid place-items-center border ${list[iconFor]?.icon === k ? 'border-forest-800 bg-forest-800 text-gold-500' : 'border-line bg-white text-forest-700 hover:border-forest-400'}`}>
                <CategoryIcon icon={k} className="h-6 w-6" />
              </button>
            ))}
          </div>
        </Modal>
      )}

      {restoreData && (
        <Modal open onClose={() => setRestoreData(null)} title="Restore backup?"
          footer={<><button className="btn btn-secondary" onClick={() => setRestoreData(null)}>Cancel</button><button className="btn btn-danger" onClick={doRestore} disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Replace my data</button></>}>
          <p className="text-sm text-ink-soft">This replaces everything currently stored with the backup{restoreData.exportedAt ? ` from ${new Date(restoreData.exportedAt).toLocaleString('en-AU')}` : ''}:</p>
          <ul className="text-sm mt-3 space-y-1">
            {['transactions', 'trades', 'snapshots', 'debts'].map(k => (
              <li key={k} className="flex justify-between"><span className="capitalize text-ink-soft">{k === 'debts' ? 'IOUs' : k}</span><b className="num">{restoreData[k]?.length ?? 0}</b></li>
            ))}
          </ul>
        </Modal>
      )}

      <Confirm open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={deleteAccount} title="Delete your account?" confirmLabel="Delete">
        All transactions, trades, snapshots and IOUs will be permanently deleted. Download a backup first if you might want them later.
      </Confirm>
    </>
  );
}
