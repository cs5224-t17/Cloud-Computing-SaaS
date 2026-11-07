import express from 'express';
import morgan from 'morgan';
import { config } from './config.js';
import { migrate, query } from './db.js';
import { requireAdmin } from './auth.js';
import { importCsv } from './importer.js';
import { getS3Object } from './storage.js';
import authRoutes from './routes/auth.js';
import businessRoutes from './routes/businesses.js';

const app = express();
app.set('trust proxy', true);
app.use(morgan(':remote-addr :method :url :status :res[content-length] - :response-time ms'));
app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => { req.body ??= {}; next(); });

// Health check for ALB target group: verifies DB connectivity too.
app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);

app.post('/api/admin/import', requireAdmin, express.text({ type: ['text/csv', 'text/plain'], limit: '5mb' }),
  async (req, res) => res.json(await importCsv(req.body, String(req.query.source ?? 'seed'), req.query.replace === 'true')));

// Local storage mode serves uploaded photos itself (on AWS these come from CloudFront/S3).
if (config.storageDriver === 'local') {
  app.use('/media', express.static(config.localMediaDir, { maxAge: '365d', immutable: true }));
}

// No-CloudFront fallback: stream the SPA and photos from S3 through the API.
// shortcut: no edge caching or HTTPS; remove once CloudFront is allowed on the account.
if (config.webBucket) {
  const fromS3 = (bucket, keyOf) => async (req, res) => {
    try {
      const o = await getS3Object(bucket, keyOf(req));
      res.set({ 'Content-Type': o.ContentType, 'Cache-Control': o.CacheControl ?? 'no-cache' });
      o.Body.pipe(res);
    } catch (e) {
      if (e.name === 'NoSuchKey') return res.status(404).end();
      throw e;
    }
  };
  app.get('/media/*key', fromS3(config.mediaBucket, (r) => `media/${r.params.key.join('/')}`));
  // Same rule as the CloudFront function: extension-less paths are SPA routes.
  app.get(/^\/(?!api\/).*/, fromS3(config.webBucket, (r) => (r.path.includes('.') ? r.path.slice(1) : 'index.html')));
}

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

await migrate();
app.listen(config.port, () => console.log(`api listening on :${config.port}`));
