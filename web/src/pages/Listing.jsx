import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, DAY_NAMES } from '../api.js';

export default function Listing({ user }) {
  const { slug } = useParams();
  const [b, setB] = useState(null);
  const [error, setError] = useState('');
  const [claim, setClaim] = useState(null); // null | { sentTo } | 'done'
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api(`/businesses/${slug}`).then(setB).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [slug, user?.id]);

  if (error) return <p className="error">{error}</p>;
  if (!b) return <p className="muted">Loading…</p>;

  const toggleFollow = async () => {
    setMsg('');
    try {
      await api(`/businesses/${b.id}/follow`, { method: b.isFollowing ? 'DELETE' : 'POST' });
      await load();
    } catch (e) { setMsg(e.message); }
  };
  const startClaim = async () => {
    setMsg('');
    try { setClaim(await api(`/businesses/${b.id}/claim`, { method: 'POST' })); } catch (e) { setMsg(e.message); }
  };
  const verifyClaim = async (e) => {
    e.preventDefault();
    setMsg('');
    try { await api(`/businesses/${b.id}/claim/verify`, { method: 'POST', body: { code } }); setClaim('done'); await load(); }
    catch (err) { setMsg(err.message); }
  };

  return (
    <article className="listing">
      <Link to="/" className="muted">← All listings</Link>
      <div className="listing-head">
        <div>
          <h1>{b.name}</h1>
          <p className="meta">{b.category} · {b.area} · {b.followers} follower{b.followers === 1 ? '' : 's'}</p>
          <div className="tags">
            <span className={`tag ${b.is_available ? 'ok' : 'warn'}`}>{b.is_available ? 'Taking orders' : 'Temporarily unavailable'}</span>
            {b.claimed && <span className="tag ok">Owner-managed</span>}
          </div>
        </div>
        <div className="actions">
          {user ? (
            <button className={`btn ${b.isFollowing ? 'ghost' : ''}`} onClick={toggleFollow}>
              {b.isFollowing ? 'Following ✓' : 'Follow for updates'}
            </button>
          ) : (
            <Link to="/login" className="btn">Log in to follow</Link>
          )}
          {b.isOwner && <Link to={`/b/${b.slug}/manage`} className="btn ghost">Manage listing</Link>}
        </div>
      </div>
      {msg && <p className="error">{msg}</p>}

      {b.photos.length > 0 && (
        <div className="photos">{b.photos.map((p) => <img key={p.id} src={p.url} alt="" />)}</div>
      )}

      <p className="desc">{b.description}</p>

      <div className="two-col">
        <section>
          <h2>Services</h2>
          {b.services.length ? (
            <table className="table">
              <tbody>
                {b.services.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}{s.description && <div className="muted small">{s.description}</div>}</td>
                    <td className="right">{s.price_from != null ? `from $${Number(s.price_from).toFixed(0)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted">No services listed yet.</p>}
        </section>
        <section>
          <h2>Hours</h2>
          <table className="table">
            <tbody>
              {b.hours.map((h) => (
                <tr key={h.day}><td>{DAY_NAMES[h.day]}</td><td className="right">{h.closed ? 'Closed' : `${h.open}–${h.close}`}</td></tr>
              ))}
            </tbody>
          </table>
          <h2>Contact</h2>
          <ul className="plain">
            {b.contact_phone && <li>📞 {b.contact_phone}</li>}
            {b.instagram && <li>📷 {b.instagram}</li>}
            {b.website && <li>🔗 <a href={b.website} target="_blank" rel="noreferrer">{b.website}</a></li>}
          </ul>
        </section>
      </div>

      {!b.claimed && (
        <section className="claim">
          <h2>Is this your business?</h2>
          {!user && <p><Link to="/login">Log in</Link> to claim this listing and manage it.</p>}
          {user && !claim && (
            <>
              <p className="muted">We'll email a 6-digit code to the contact address we have on file for this business.</p>
              <button className="btn ghost" onClick={startClaim}>Claim this listing</button>
            </>
          )}
          {user && claim && claim !== 'done' && (
            <form onSubmit={verifyClaim} className="inline">
              <span>Code sent to {claim.sentTo}.</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" maxLength={6} />
              <button className="btn">Verify</button>
            </form>
          )}
        </section>
      )}
      {claim === 'done' && <p className="ok-msg">Listing claimed. <Link to={`/b/${b.slug}/manage`}>Manage it now →</Link></p>}
    </article>
  );
}
