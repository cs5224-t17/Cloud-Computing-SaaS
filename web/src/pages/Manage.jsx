import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, DAY_NAMES } from '../api.js';

const blankHours = () => DAY_NAMES.map((_, day) => ({ day, open: '10:00', close: '18:00', closed: false }));

export default function Manage() {
  const { slug } = useParams();
  const [b, setB] = useState(null);
  const [details, setDetails] = useState({});
  const [services, setServices] = useState([]);
  const [hours, setHours] = useState(blankHours());
  const [msg, setMsg] = useState({});

  const load = async () => {
    const d = await api(`/businesses/${slug}`);
    setB(d);
    setDetails({
      description: d.description, contact_phone: d.contact_phone ?? '', instagram: d.instagram ?? '',
      website: d.website ?? '', is_available: d.is_available,
    });
    setServices(d.services.map(({ name, description, price_from }) => ({ name, description, price_from: price_from ?? '' })));
    if (d.hours.length === 7) setHours(d.hours.map((h) => ({ ...h, open: h.open ?? '', close: h.close ?? '' })));
  };
  useEffect(() => { load().catch((e) => setMsg({ top: e.message })); }, [slug]);

  if (msg.top) return <p className="error">{msg.top}</p>;
  if (!b) return <p className="muted">Loading…</p>;
  if (!b.isOwner) return <p className="error">You don't manage this listing.</p>;

  const save = (key, fn) => async (e) => {
    e?.preventDefault();
    setMsg((m) => ({ ...m, [key]: 'Saving…' }));
    try { await fn(); await load(); setMsg((m) => ({ ...m, [key]: 'Saved — followers will be notified.' })); }
    catch (err) { setMsg((m) => ({ ...m, [key]: err.message })); }
  };
  const setSvc = (i, k, v) => setServices(services.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const setHr = (i, k, v) => setHours(hours.map((h, j) => (j === i ? { ...h, [k]: v } : h)));

  const uploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('photo', file);
    await save('photos', () => api(`/businesses/${b.id}/photos`, { method: 'POST', form }))();
    e.target.value = '';
  };

  return (
    <div className="manage">
      <Link to={`/b/${b.slug}`} className="muted">← View public listing</Link>
      <h1>Manage {b.name}</h1>

      <form className="panel wide" onSubmit={save('details', () => api(`/businesses/${b.id}`, { method: 'PATCH', body: details }))}>
        <h2>Details</h2>
        <label className="check">
          <input type="checkbox" checked={details.is_available} onChange={(e) => setDetails({ ...details, is_available: e.target.checked })} />
          Currently taking orders
        </label>
        <label>Description<textarea rows={4} value={details.description} onChange={(e) => setDetails({ ...details, description: e.target.value })} /></label>
        <div className="row">
          <label>Phone<input value={details.contact_phone} onChange={(e) => setDetails({ ...details, contact_phone: e.target.value })} /></label>
          <label>Instagram<input value={details.instagram} onChange={(e) => setDetails({ ...details, instagram: e.target.value })} /></label>
          <label>Website<input value={details.website} onChange={(e) => setDetails({ ...details, website: e.target.value })} /></label>
        </div>
        <button className="btn">Save details</button> <span className="muted">{msg.details}</span>
      </form>

      <form className="panel wide" onSubmit={save('services', () => api(`/businesses/${b.id}/services`, { method: 'PUT', body: { services } }))}>
        <h2>Services</h2>
        {services.map((s, i) => (
          <div className="row" key={i}>
            <input placeholder="Service" value={s.name} onChange={(e) => setSvc(i, 'name', e.target.value)} />
            <input placeholder="Description" value={s.description} onChange={(e) => setSvc(i, 'description', e.target.value)} />
            <input placeholder="From $" type="number" min="0" step="0.01" value={s.price_from} onChange={(e) => setSvc(i, 'price_from', e.target.value)} />
            <button type="button" className="btn ghost" onClick={() => setServices(services.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className="btn ghost" onClick={() => setServices([...services, { name: '', description: '', price_from: '' }])}>+ Add service</button>{' '}
        <button className="btn">Save services</button> <span className="muted">{msg.services}</span>
      </form>

      <form className="panel wide" onSubmit={save('hours', () => api(`/businesses/${b.id}/hours`, { method: 'PUT', body: { hours } }))}>
        <h2>Opening hours</h2>
        {hours.map((h, i) => (
          <div className="row hours" key={h.day}>
            <span>{DAY_NAMES[h.day]}</span>
            <label className="check"><input type="checkbox" checked={h.closed} onChange={(e) => setHr(i, 'closed', e.target.checked)} />Closed</label>
            {!h.closed && <>
              <input type="time" value={h.open} onChange={(e) => setHr(i, 'open', e.target.value)} />
              <input type="time" value={h.close} onChange={(e) => setHr(i, 'close', e.target.value)} />
            </>}
          </div>
        ))}
        <button className="btn">Save hours</button> <span className="muted">{msg.hours}</span>
      </form>

      <div className="panel wide">
        <h2>Photos</h2>
        <div className="photos">
          {b.photos.map((p) => (
            <figure key={p.id}>
              <img src={p.url} alt="" />
              <button className="btn ghost small" onClick={save('photos', () => api(`/businesses/${b.id}/photos/${p.id}`, { method: 'DELETE' }))}>Remove</button>
            </figure>
          ))}
        </div>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} /> <span className="muted">{msg.photos}</span>
      </div>
    </div>
  );
}
