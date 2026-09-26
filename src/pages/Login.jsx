import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import AuthShell from './AuthShell';
import { Spinner } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);

  useEffect(() => {
    api('/auth/config').then(c => setAllowRegistration(c.allowRegistration)).catch(() => {});
  }, []);

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your finance dashboard.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <div className="rounded-xl bg-loss-bg text-loss text-sm px-3.5 py-2.5">{error}</div>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy && <Spinner className="h-4 w-4" />} Sign in
        </button>
      </form>
      {allowRegistration && (
        <p className="text-sm text-ink-soft mt-6 text-center">
          New here? <Link to="/register" className="font-semibold text-forest-700 underline underline-offset-2">Create an account</Link>
        </p>
      )}
    </AuthShell>
  );
}
