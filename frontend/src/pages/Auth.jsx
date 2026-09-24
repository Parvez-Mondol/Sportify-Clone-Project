import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorText } from '../api';

function AuthShell({ title, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/favicon.svg" alt="" width="40" height="40" />
        <h1>{title}</h1>
        {children}
        <p className="auth-footer">{footer}</p>
      </div>
    </div>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from || '/';
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.login, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Log in to Sportify" footer={<>Don't have an account? <Link to="/register">Sign up for Sportify</Link></>}>
      <form onSubmit={submit} className="form">
        {error && <div className="form-error" role="alert">{error}</div>}
        <label>Email or username
          <input autoComplete="username" required value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
        </label>
        <label>Password
          <input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn primary block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '', role: 'listener' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ ...form, displayName: form.displayName || undefined });
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Sign up to start listening" footer={<>Already have an account? <Link to="/login">Log in here</Link></>}>
      <form onSubmit={submit} className="form">
        {error && <div className="form-error" role="alert">{error}</div>}
        <label>Email
          <input type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        </label>
        <label>Username
          <input autoComplete="username" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.]+" title="Letters, numbers, _ and ." value={form.username} onChange={set('username')} />
        </label>
        <label>Display name <span className="hint">(optional)</span>
          <input maxLength={60} value={form.displayName} onChange={set('displayName')} />
        </label>
        <label>Password <span className="hint">(at least 8 characters)</span>
          <input type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} />
        </label>
        <fieldset className="role-pick">
          <legend>I want to</legend>
          <label><input type="radio" name="role" value="listener" checked={form.role === 'listener'} onChange={set('role')} /> Listen to music</label>
          <label><input type="radio" name="role" value="artist" checked={form.role === 'artist'} onChange={set('role')} /> Upload my own music (artist)</label>
        </fieldset>
        <button className="btn primary block" disabled={busy}>{busy ? 'Creating account…' : 'Sign up'}</button>
      </form>
    </AuthShell>
  );
}
