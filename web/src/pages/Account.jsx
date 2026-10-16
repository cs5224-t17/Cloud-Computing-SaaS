import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, session } from '../api.js';

export default function Account() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { if (session.token) api('/auth/me').then(setMe).catch((e) => setError(e.message)); }, []);
  if (!session.token) return <Navigate to="/login" />;
  if (error) return <p className="error">{error}</p>;
  if (!me) return <p className="muted">Loading…</p>;

  const List = ({ items, manage }) => items.length ? (
    <ul className="plain">
      {items.map((b) => (
        <li key={b.id}>
          <Link to={`/b/${b.slug}${manage ? '/manage' : ''}`}>{b.name}</Link> <span className="muted">· {b.category} · {b.area}</span>
        </li>
      ))}
    </ul>
  ) : <p className="muted">None yet.</p>;

  return (
    <div className="panel wide">
      <h1>{me.user.name}</h1>
      <p className="muted">{me.user.email}</p>
      <h2>Businesses you manage</h2>
      <List items={me.owned} manage />
      <h2>Businesses you follow</h2>
      <List items={me.following} />
    </div>
  );
}
