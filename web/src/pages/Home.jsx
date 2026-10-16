import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

export default function Home() {
  const [params, setParams] = useSearchParams();
  const [facets, setFacets] = useState({ categories: [], areas: [] });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState(params.get('q') ?? '');

  useEffect(() => { api('/businesses/facets').then(setFacets).catch(() => {}); }, []);
  useEffect(() => {
    setError('');
    api(`/businesses?${params}`).then(setData).catch((e) => setError(e.message));
  }, [params]);

  const update = (k, v) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next);
  };
  const page = Number(params.get('page') ?? 1);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <section className="hero">
        <h1>Find home-based businesses near you</h1>
        <p className="muted">Florists, tailors, crafters, groomers and more — all run from Singapore homes.</p>
        <form className="search" onSubmit={(e) => { e.preventDefault(); update('q', q.trim()); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “bouquet”, “phone screen”, “crochet”…" />
          <button className="btn">Search</button>
        </form>
        <div className="filters">
          <select value={params.get('category') ?? ''} onChange={(e) => update('category', e.target.value)}>
            <option value="">All categories</option>
            {facets.categories.map((c) => <option key={c.value} value={c.value}>{c.value} ({c.n})</option>)}
          </select>
          <select value={params.get('area') ?? ''} onChange={(e) => update('area', e.target.value)}>
            <option value="">All areas</option>
            {facets.areas.map((a) => <option key={a.value} value={a.value}>{a.value} ({a.n})</option>)}
          </select>
          <label className="check">
            <input type="checkbox" checked={params.get('available') === 'true'}
              onChange={(e) => update('available', e.target.checked ? 'true' : '')} />
            Taking orders now
          </label>
        </div>
      </section>

      {error && <p className="error">{error}</p>}
      {data && <p className="muted">{data.total} listing{data.total === 1 ? '' : 's'}</p>}

      <div className="grid">
        {data?.results.map((b) => (
          <Link to={`/b/${b.slug}`} key={b.id} className="card">
            <div className="cover" style={b.cover_url ? { backgroundImage: `url(${b.cover_url})` } : undefined}>
              {!b.cover_url && <span>{b.name[0]}</span>}
            </div>
            <div className="card-body">
              <h3>{b.name}</h3>
              <p className="meta">{b.category} · {b.area}</p>
              <p className="summary">{b.summary}</p>
              <div className="tags">
                {b.price_from != null && <span className="tag">from ${Number(b.price_from).toFixed(0)}</span>}
                {!b.is_available && <span className="tag warn">Unavailable</span>}
                {b.claimed && <span className="tag ok">Owner-managed</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {pages > 1 && (
        <div className="pager">
          <button className="btn ghost" disabled={page <= 1} onClick={() => update('page', String(page - 1))}>Prev</button>
          <span>{page} / {pages}</span>
          <button className="btn ghost" disabled={page >= pages} onClick={() => update('page', String(page + 1))}>Next</button>
        </div>
      )}
    </>
  );
}
