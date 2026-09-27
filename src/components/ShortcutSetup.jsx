import { useState } from 'react';
import { ClipboardDocumentIcon, CheckIcon, KeyIcon, BoltIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, Confirm, Spinner } from './ui';
import { api } from '../lib/api';
import { formatDate } from '../lib/dates';

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex gap-2">
        <code className="flex-1 min-w-0 truncate rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-[13px] text-ink">{value}</code>
        <button type="button" className="btn btn-secondary btn-icon !h-11 !w-11 shrink-0" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? <CheckIcon className="h-4 w-4 text-gain" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

const Step = ({ n, children }) => (
  <li className="flex gap-3">
    <span className="h-6 w-6 shrink-0 rounded-full bg-forest-800 text-cream-50 text-xs font-semibold grid place-items-center">{n}</span>
    <div className="text-sm text-ink-soft pt-0.5 min-w-0">{children}</div>
  </li>
);
const K = ({ children }) => <b className="text-ink">{children}</b>;
const C = ({ children }) => <code className="rounded bg-cream-100 px-1 py-0.5 text-[12px] text-forest-800 break-words">{children}</code>;

export default function ShortcutSetup() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [newKey, setNewKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const origin = window.location.origin;

  const generate = async () => {
    setBusy(true);
    try {
      const r = await api('/auth/api-key', { method: 'POST' });
      setUser(r.user);
      setNewKey(r.key);
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    try {
      const r = await api('/auth/api-key', { method: 'DELETE' });
      setUser(r.user);
      setNewKey(null);
      toast('API key revoked');
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  };

  return (
    <Card title="Apple Shortcut">
      <p className="text-sm text-ink-soft mb-4">
        Log transactions from a Shortcut, your Home Screen, Siri (“Hey Siri, log expense”) or Back Tap — without opening Ledger.
      </p>

      {newKey ? (
        <div className="rounded-xl border border-gold-500/50 bg-cream-100 p-3.5 mb-4 space-y-2">
          <CopyField label="Your API key" value={newKey} />
          <p className="text-xs text-gold-600 font-medium">Copy it now — for security it won’t be shown again.</p>
        </div>
      ) : user.apiKey ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3 mb-4">
          <KeyIcon className="h-5 w-5 text-forest-600" />
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-medium">Key ending <span className="font-mono">…{user.apiKey.hint}</span></div>
            <div className="text-xs text-muted">Created {formatDate(user.apiKey.createdAt.slice(0, 10))}</div>
          </div>
          <button className="btn btn-ghost btn-sm !text-loss" onClick={() => setConfirm('revoke')}>Revoke</button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 mb-5">
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => (user.apiKey ? setConfirm('regenerate') : generate())}>
          {busy ? <Spinner className="h-4 w-4" /> : <BoltIcon className="h-4 w-4" />}
          {user.apiKey ? 'Create new key' : 'Create API key'}
        </button>
      </div>

      <div className="space-y-3 mb-4">
        <CopyField label="Add transaction URL" value={`${origin}/api/shortcut/transaction`} />
        <CopyField label="Categories & accounts URL" value={`${origin}/api/shortcut/options`} />
      </div>

      <details className="group rounded-xl border border-line bg-white">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-forest-900 list-none flex items-center justify-between">
          How to build the shortcut
          <span className="text-muted transition group-open:rotate-180">▾</span>
        </summary>
        <ol className="px-4 pb-4 space-y-3">
          <Step n={1}>Open the <K>Shortcuts</K> app → <K>+</K> → name it <K>Log Expense</K>.</Step>
          <Step n={2}>Add <K>Ask for Input</K> → Input type <K>Number</K>, prompt <C>Amount</C>. Turn on <K>Allow Decimal Numbers</K>.</Step>
          <Step n={3}>Add another <K>Ask for Input</K> → type <K>Text</K>, prompt <C>What for?</C></Step>
          <Step n={4}>
            Add <K>Get Contents of URL</K> → paste the <K>Categories & accounts URL</K>. Tap <K>Show More</K> → Headers → add
            <C>Authorization</C> with value <C>Bearer YOUR_API_KEY</C>.
          </Step>
          <Step n={5}>Add <K>Get Dictionary Value</K> → Key <C>expense</C> (use <C>income</C> for an income shortcut).</Step>
          <Step n={6}>Add <K>Choose from List</K> (it picks up the list from the previous step), prompt <C>Category</C>.</Step>
          <Step n={7}>
            Add another <K>Get Contents of URL</K> → paste the <K>Add transaction URL</K>. Show More → Method <K>POST</K>, same
            <C>Authorization</C> header. Request Body <K>JSON</K>, add fields:
            <ul className="mt-1.5 space-y-1">
              <li><C>amount</C> (Number) → <K>Provided Input</K> from step 2</li>
              <li><C>title</C> (Text) → <K>Provided Input</K> from step 3</li>
              <li><C>category</C> (Text) → <K>Chosen Item</K></li>
              <li className="text-muted">Optional: <C>type</C> = <C>income</C>, <C>account</C>, <C>date</C>, <C>note</C></li>
            </ul>
          </Step>
          <Step n={8}>Add <K>Get Dictionary Value</K> → Key <C>message</C>, then <K>Show Notification</K> with the result.</Step>
          <Step n={9}>
            Run it once to test. Then long-press it → <K>Add to Home Screen</K>, say <K>“Hey Siri, Log Expense”</K>, or set it under
            Settings → Accessibility → Touch → <K>Back Tap</K>.
          </Step>
        </ol>
        <p className="px-4 pb-4 text-xs text-muted">
          If you leave out <C>account</C> your default account is used; if <C>date</C> is empty it’s today. Unknown categories are saved as <K>Other</K>.
        </p>
      </details>

      <Confirm
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={confirm === 'revoke' ? revoke : generate}
        title={confirm === 'revoke' ? 'Revoke API key?' : 'Create a new key?'}
        confirmLabel={confirm === 'revoke' ? 'Revoke' : 'Create new key'}
        danger={confirm === 'revoke'}
      >
        {confirm === 'revoke'
          ? 'Any shortcut using this key will stop working.'
          : 'Your current key stops working immediately, so you’ll need to paste the new one into your shortcut.'}
      </Confirm>
    </Card>
  );
}
