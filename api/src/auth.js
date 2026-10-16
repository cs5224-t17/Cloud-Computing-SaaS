import jwt from 'jsonwebtoken';
import { config } from './config.js';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email, name: user.name }, config.jwtSecret, { expiresIn: '7d' });

function decode(req) {
  const h = req.headers.authorization ?? '';
  if (!h.startsWith('Bearer ')) return null;
  try {
    const p = jwt.verify(h.slice(7), config.jwtSecret);
    return { id: p.sub, email: p.email, name: p.name };
  } catch {
    return null;
  }
}

export function optionalAuth(req, _res, next) {
  req.user = decode(req);
  next();
}

export function requireAuth(req, res, next) {
  req.user = decode(req);
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  next();
}

export function requireAdmin(req, res, next) {
  if (req.headers['x-admin-token'] !== config.adminToken) return res.status(403).json({ error: 'Forbidden' });
  next();
}
