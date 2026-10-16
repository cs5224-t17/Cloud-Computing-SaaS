import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

export function Login({ onAuth }) {
  const [f, setF] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try { onAuth(await api('/auth/login', { method: 'POST', body: f })); nav(-1); }
    catch (err) { setError(err.message); }
  };
  return (
    <form className="panel" onSubmit={submit}>
      <h1>Log in</h1>
      <label>Email<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label>Password<input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn">Log in</button>
      <p className="muted">No account? <Link to="/register">Sign up</Link></p>
    </form>
  );
}

export function Register() {
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try { setDone(await api('/auth/register', { method: 'POST', body: f })); }
    catch (err) { setError(err.message); }
  };
  if (done) {
    return (
      <div className="panel">
        <h1>Check your inbox</h1>
        <p>We sent a verification link to <b>{f.email}</b>. Click it to activate your account.</p>
        {!done.emailSent && <p className="error">The email could not be sent (in the AWS SES sandbox only verified addresses receive mail).</p>}
      </div>
    );
  }
  return (
    <form className="panel" onSubmit={submit}>
      <h1>Create an account</h1>
      <label>Name<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label>Email<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label>Password (8+ characters)<input type="password" required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn">Sign up</button>
    </form>
  );
}

export function Verify({ onAuth }) {
  const [params] = useSearchParams();
  const [state, setState] = useState('Verifying…');
  const ran = useRef(false);
  const nav = useNavigate();
  useEffect(() => {
    if (ran.current) return; // StrictMode double-invokes effects; token is single-use
    ran.current = true;
    api('/auth/verify', { method: 'POST', body: { token: params.get('token') } })
      .then((s) => { onAuth(s); setState('Email verified — you are logged in.'); setTimeout(() => nav('/'), 1500); })
      .catch((e) => setState(e.message));
  }, []);
  return <div className="panel"><h1>Email verification</h1><p>{state}</p></div>;
}
