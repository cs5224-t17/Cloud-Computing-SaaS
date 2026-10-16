import { parse } from 'csv-parse/sync';
import { tx } from './db.js';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const DAYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

// services column: "Name:price|Name:price"; hours column: "mon-fri 10:00-18:00; sat 10:00-14:00" (unlisted days = closed)
function parseServices(s) {
  return (s || '').split('|').map((x) => x.trim()).filter(Boolean).map((x) => {
    const [name, price] = x.split(':');
    return { name: name.trim(), price: price ? Number(price) : null };
  });
}

function parseHours(s) {
  const out = new Map([0, 1, 2, 3, 4, 5, 6].map((d) => [d, null]));
  for (const part of (s || '').split(';').map((x) => x.trim()).filter(Boolean)) {
    const m = part.match(/^([a-z]{3})(?:-([a-z]{3}))?\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/i);
    if (!m) continue;
    const a = DAYS[m[1].toLowerCase()], b = DAYS[(m[2] ?? m[1]).toLowerCase()];
    for (let d = a; ; d = (d + 1) % 7) { out.set(d, [m[3], m[4]]); if (d === b) break; }
  }
  return [...out].map(([day, v]) => ({ day, open: v?.[0] ?? null, close: v?.[1] ?? null, closed: !v }));
}

// Upserts listings by slug. Used for the initial seed and later for scraped/provider feeds (source column).
// Claimed listings keep owner-edited fields; only unclaimed ones are overwritten.
export async function importCsv(text, source = 'seed') {
  const records = parse(text, { columns: true, skip_empty_lines: true, trim: true });
  let inserted = 0, updated = 0, skipped = 0;
  await tx(async (c) => {
    for (const r of records) {
      if (!r.name || !r.category || !r.area) { skipped++; continue; }
      const slug = r.slug || slugify(r.name);
      const { rows } = await c.query(
        `INSERT INTO businesses (slug, name, category, area, description, contact_email, contact_phone, instagram, website, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name, category = EXCLUDED.category, area = EXCLUDED.area,
           description = EXCLUDED.description, contact_email = EXCLUDED.contact_email,
           contact_phone = EXCLUDED.contact_phone, instagram = EXCLUDED.instagram,
           website = EXCLUDED.website, source = EXCLUDED.source, updated_at = now()
         WHERE businesses.owner_id IS NULL
         RETURNING id, (xmax = 0) AS inserted`,
        [slug, r.name, r.category, r.area, r.description ?? '', r.contact_email || null, r.contact_phone || null,
          r.instagram || null, r.website || null, source]);
      if (!rows[0]) { skipped++; continue; } // claimed: leave alone
      const id = rows[0].id;
      rows[0].inserted ? inserted++ : updated++;

      await c.query('DELETE FROM services WHERE business_id = $1', [id]);
      for (const s of parseServices(r.services)) {
        await c.query('INSERT INTO services (business_id, name, price_from) VALUES ($1,$2,$3)', [id, s.name, s.price]);
      }
      await c.query('DELETE FROM hours WHERE business_id = $1', [id]);
      for (const h of parseHours(r.hours)) {
        await c.query('INSERT INTO hours (business_id, day, open_time, close_time, closed) VALUES ($1,$2,$3,$4,$5)',
          [id, h.day, h.open, h.close, h.closed]);
      }
    }
  });
  return { total: records.length, inserted, updated, skipped };
}
