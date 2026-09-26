import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from './AuthShell';
import { Spinner } from '../components/ui';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords must match');
    setBusy(true);
    setError('');
    try {
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Set up your personal ledger in seconds.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="fn">First name</label>
            <input id="fn" className="input" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} required />
          </div>
          <div>
            <label className="label" htmlFor="ln">Last name</label>
            <input id="ln" className="input" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="em">Email</label>
          <input id="em" className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        </div>
        <div>
          <label className="label" htmlFor="pw">Password</label>
          <input id="pw" className="input" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={set('password')} required />
          <p className="text-xs text-muted mt-1">At least 8 characters.</p>
        </div>
        <div>
          <label className="label" htmlFor="pw2">Confirm password</label>
          <input id="pw2" className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
        </div>
        {error && <div className="rounded-xl bg-loss-bg text-loss text-sm px-3.5 py-2.5">{error}</div>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy && <Spinner className="h-4 w-4" />} Create account
        </button>
      </form>
      <p className="text-sm text-ink-soft mt-6 text-center">
        Already have an account? <Link to="/login" className="font-semibold text-forest-700 underline underline-offset-2">Sign in</Link>
      </p>
    </AuthShell>
  );
}
