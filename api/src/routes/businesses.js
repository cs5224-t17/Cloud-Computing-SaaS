import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { query, tx } from '../db.js';
import { optionalAuth, requireAuth } from '../auth.js';
import { sendMail } from '../mailer.js';
import { publish } from '../queue.js';
import { putObject, deleteObject } from '../storage.js';
import { config } from '../config.js';

const r = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, f, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(f.mimetype)),
});
const PAGE_SIZE = 12;

// ---------- public browse / search ----------

r.get('/', async (req, res) => {
  const { q, category, area, available } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const where = [];
  const params = [];
  let orderBy = 'b.name';

  if (q && String(q).trim()) {
    params.push(String(q).trim());
    const tsq = `websearch_to_tsquery('english', $${params.length})`;
    where.push(`(b.search @@ ${tsq} OR EXISTS (SELECT 1 FROM services s WHERE s.business_id = b.id AND s.search @@ ${tsq}))`);
    orderBy = `ts_rank(b.search, ${tsq}) DESC, b.name`;
  }
  if (category) { params.push(category); where.push(`b.category = $${params.length}`); }
  if (area) { params.push(area); where.push(`b.area = $${params.length}`); }
  if (available === 'true') where.push('b.is_available');

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(PAGE_SIZE, (page - 1) * PAGE_SIZE);
  const { rows } = await query(
    `SELECT b.id, b.slug, b.name, b.category, b.area, b.is_available, b.owner_id IS NOT NULL AS claimed,
            left(b.description, 160) AS summary,
            (SELECT url FROM photos p WHERE p.business_id = b.id ORDER BY p.id LIMIT 1) AS cover_url,
            (SELECT min(price_from) FROM services s WHERE s.business_id = b.id) AS price_from,
            count(*) OVER () AS total
     FROM businesses b ${whereSql}
     ORDER BY ${orderBy}
     LIMIT $${params.length - 1} OFFSET $${params.length}`, params);

  res.json({
    page, pageSize: PAGE_SIZE, total: Number(rows[0]?.total ?? 0),
    results: rows.map(({ total, ...b }) => b),
  });
});

r.get('/facets', async (_req, res) => {
  const [c, a] = await Promise.all([
    query('SELECT category AS value, count(*)::int AS n FROM businesses GROUP BY 1 ORDER BY 1'),
    query('SELECT area AS value, count(*)::int AS n FROM businesses GROUP BY 1 ORDER BY 1'),
  ]);
  res.json({ categories: c.rows, areas: a.rows });
});

r.get('/:slug', optionalAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT id, slug, name, category, area, description, contact_phone, instagram, website,
            is_available, owner_id, updated_at,
            (SELECT count(*)::int FROM follows f WHERE f.business_id = b.id) AS followers
     FROM businesses b WHERE slug = $1`, [req.params.slug]);
  const b = rows[0];
  if (!b) return res.status(404).json({ error: 'Not found' });

  const [services, hours, photos, following] = await Promise.all([
    query('SELECT id, name, description, price_from FROM services WHERE business_id = $1 ORDER BY id', [b.id]),
    query(`SELECT day, to_char(open_time, 'HH24:MI') AS open, to_char(close_time, 'HH24:MI') AS close, closed
           FROM hours WHERE business_id = $1 ORDER BY day`, [b.id]),
    query('SELECT id, url FROM photos WHERE business_id = $1 ORDER BY id', [b.id]),
    req.user ? query('SELECT 1 FROM follows WHERE user_id = $1 AND business_id = $2', [req.user.id, b.id]) : null,
  ]);
  const { owner_id, ...rest } = b;
  res.json({
    ...rest,
    claimed: owner_id != null,
    isOwner: req.user != null && owner_id === req.user.id,
    isFollowing: Boolean(following?.rowCount),
    services: services.rows, hours: hours.rows, photos: photos.rows,
  });
});

// ---------- follow ----------

r.post('/:id/follow', requireAuth, async (req, res) => {
  await query('INSERT INTO follows (user_id, business_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.user.id, Number(req.params.id)]);
  res.json({ following: true });
});

r.delete('/:id/follow', requireAuth, async (req, res) => {
  await query('DELETE FROM follows WHERE user_id = $1 AND business_id = $2', [req.user.id, Number(req.params.id)]);
  res.json({ following: false });
});

// ---------- claim: code is emailed to the contact address already on the listing ----------

const mask = (e) => e.replace(/^(.)(.*)(@.*)$/, (_m, a, b, c) => a + '*'.repeat(Math.max(1, b.length)) + c);

r.post('/:id/claim', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT id, name, contact_email, owner_id FROM businesses WHERE id = $1', [Number(req.params.id)]);
  const b = rows[0];
  if (!b) return res.status(404).json({ error: 'Not found' });
  if (b.owner_id) return res.status(409).json({ error: 'Listing already claimed' });
  if (!b.contact_email) return res.status(422).json({ error: 'No contact email on file; contact admin to claim' });

  const code = String(crypto.randomInt(100000, 1000000));
  await query(
    `UPDATE businesses SET claim_code = $1, claim_user_id = $2, claim_expires_at = now() + interval '30 minutes'
     WHERE id = $3`, [code, req.user.id, b.id]);
  await sendMail({
    to: b.contact_email,
    subject: `Claim code for ${b.name}`,
    text: `${req.user.name} (${req.user.email}) asked to manage "${b.name}" on ${config.appName}.\n\n`
      + `Claim code: ${code}\n\nIt expires in 30 minutes. Ignore this email if that wasn't you.\n`,
  });
  res.json({ sentTo: mask(b.contact_email) });
});

r.post('/:id/claim/verify', requireAuth, async (req, res) => {
  const { rowCount } = await query(
    `UPDATE businesses SET owner_id = claim_user_id, claim_code = NULL, claim_user_id = NULL, claim_expires_at = NULL
     WHERE id = $1 AND owner_id IS NULL AND claim_user_id = $2 AND claim_code = $3 AND claim_expires_at > now()`,
    [Number(req.params.id), req.user.id, String(req.body.code ?? '')]);
  if (!rowCount) return res.status(400).json({ error: 'Invalid or expired code' });
  res.json({ claimed: true });
});

// ---------- owner edits (each publishes a listing.updated event for follower notifications) ----------

async function loadOwned(req, res) {
  const { rows } = await query('SELECT id, owner_id FROM businesses WHERE id = $1', [Number(req.params.id)]);
  if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return null; }
  if (rows[0].owner_id !== req.user.id) { res.status(403).json({ error: 'Not your listing' }); return null; }
  return rows[0];
}

const announce = (businessId, change) =>
  publish({ type: 'listing.updated', businessId, change, at: new Date().toISOString() })
    .catch((e) => console.error('[queue] publish failed', e));

const EDITABLE = ['description', 'contact_email', 'contact_phone', 'instagram', 'website', 'is_available'];

r.patch('/:id', requireAuth, async (req, res) => {
  const b = await loadOwned(req, res); if (!b) return;
  const fields = EDITABLE.filter((k) => k in req.body);
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  const sets = fields.map((k, i) => `${k} = $${i + 2}`).join(', ');
  await query(`UPDATE businesses SET ${sets}, updated_at = now() WHERE id = $1`, [b.id, ...fields.map((k) => req.body[k])]);
  await announce(b.id, 'is_available' in req.body
    ? (req.body.is_available ? 'is now taking orders' : 'is temporarily unavailable')
    : 'updated their listing details');
  res.json({ ok: true });
});

r.put('/:id/services', requireAuth, async (req, res) => {
  const b = await loadOwned(req, res); if (!b) return;
  const list = Array.isArray(req.body.services) ? req.body.services : [];
  await tx(async (c) => {
    await c.query('DELETE FROM services WHERE business_id = $1', [b.id]);
    for (const s of list) {
      if (!s.name) continue;
      await c.query('INSERT INTO services (business_id, name, description, price_from) VALUES ($1, $2, $3, $4)',
        [b.id, s.name, s.description ?? '', s.price_from === '' || s.price_from == null ? null : Number(s.price_from)]);
    }
    await c.query('UPDATE businesses SET updated_at = now() WHERE id = $1', [b.id]);
  });
  await announce(b.id, 'updated their services and prices');
  res.json({ ok: true });
});

r.put('/:id/hours', requireAuth, async (req, res) => {
  const b = await loadOwned(req, res); if (!b) return;
  const list = Array.isArray(req.body.hours) ? req.body.hours : [];
  await tx(async (c) => {
    await c.query('DELETE FROM hours WHERE business_id = $1', [b.id]);
    for (const h of list) {
      await c.query('INSERT INTO hours (business_id, day, open_time, close_time, closed) VALUES ($1, $2, $3, $4, $5)',
        [b.id, h.day, h.closed ? null : h.open || null, h.closed ? null : h.close || null, Boolean(h.closed)]);
    }
    await c.query('UPDATE businesses SET updated_at = now() WHERE id = $1', [b.id]);
  });
  await announce(b.id, 'updated their opening hours');
  res.json({ ok: true });
});

r.post('/:id/photos', requireAuth, upload.single('photo'), async (req, res) => {
  const b = await loadOwned(req, res); if (!b) return;
  if (!req.file) return res.status(400).json({ error: 'JPEG/PNG/WebP up to 5 MB required' });
  const ext = req.file.mimetype.split('/')[1];
  const key = `listings/${b.id}/${crypto.randomUUID()}.${ext}`;
  const url = await putObject(key, req.file.buffer, req.file.mimetype);
  const { rows } = await query('INSERT INTO photos (business_id, storage_key, url) VALUES ($1, $2, $3) RETURNING id, url',
    [b.id, key, url]);
  await announce(b.id, 'added new photos');
  res.status(201).json(rows[0]);
});

r.delete('/:id/photos/:photoId', requireAuth, async (req, res) => {
  const b = await loadOwned(req, res); if (!b) return;
  const { rows } = await query('DELETE FROM photos WHERE id = $1 AND business_id = $2 RETURNING storage_key',
    [Number(req.params.photoId), b.id]);
  if (rows[0]) await deleteObject(rows[0].storage_key);
  res.json({ ok: true });
});

export default r;
