import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { config } from './config.js';

export const pool = new pg.Pool(config.db);

export const query = (text, params) => pool.query(text, params);

export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Idempotent schema bootstrap; safe to run on every start (advisory lock avoids races across ASG instances).
export async function migrate() {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await tx(async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(5224)');
    await c.query(sql);
  });
}
