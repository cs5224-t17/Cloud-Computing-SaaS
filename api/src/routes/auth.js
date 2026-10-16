import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { query } from '../db.js';
import { config } from '../config.js';
import { signToken, requireAuth } from '../auth.js';
import { sendMail } from '../mailer.js';

const r = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

r.post('/register', async (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const name = String(req.body.name ?? '').trim();
  const password = String(req.body.password ?? '');
  if (!EMAIL_RE.test(email) || !name || password.length < 8) {
    return res.status(400).json({ error: 'Valid email, name and 8+ character password required' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  const hash = await bcrypt.hash(password, 10);
  const { rowCount } = await query(
    `INSERT INTO users (email, name, password_hash, verify_token) VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`, [email, name, hash, token]);
  if (!rowCount) return res.status(409).json({ error: 'Email already registered' });

  const link = `${config.appBaseUrl}/verify?token=${token}`;
  const sent = await sendMail({
    to: email,
    subject: `Verify your ${config.appName} account`,
    text: `Hi ${name},\n\nConfirm your email to finish signing up:\n${link}\n`,
  });
  res.status(201).json({ ok: true, emailSent: sent });
});

r.post('/verify', async (req, res) => {
  const token = String(req.body.token ?? '');
  if (!token) return res.status(400).json({ error: 'Token required' });
  const { rows } = await query(
    `UPDATE users SET email_verified = TRUE, verify_token = NULL WHERE verify_token = $1
     RETURNING id, email, name`, [token]);
  if (!rows[0]) return res.status(400).json({ error: 'Invalid or used token' });
  res.json({ token: signToken(rows[0]), user: rows[0] });
});

r.post('/login', async (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(req.body.password ?? ''), u.password_hash))) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  if (!u.email_verified) return res.status(403).json({ error: 'Verify your email first' });
  res.json({ token: signToken(u), user: { id: u.id, email: u.email, name: u.name } });
});

r.get('/me', requireAuth, async (req, res) => {
  const [owned, followed] = await Promise.all([
    query('SELECT id, slug, name, category, area FROM businesses WHERE owner_id = $1 ORDER BY name', [req.user.id]),
    query(`SELECT b.id, b.slug, b.name, b.category, b.area FROM follows f
           JOIN businesses b ON b.id = f.business_id WHERE f.user_id = $1 ORDER BY b.name`, [req.user.id]),
  ]);
  res.json({ user: req.user, owned: owned.rows, following: followed.rows });
});

export default r;
