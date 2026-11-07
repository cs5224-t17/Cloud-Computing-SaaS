// All runtime configuration comes from env vars so the same image runs on AWS and on-prem.
const env = (k, d) => process.env[k] ?? d;

export const config = {
  port: Number(env('PORT', 3000)),
  appName: env('APP_NAME', 'SG Home Business Directory'), // placeholder; team to finalise
  appBaseUrl: env('APP_BASE_URL', 'http://localhost:8080'),
  jwtSecret: env('JWT_SECRET', 'dev-only-secret'),
  adminToken: env('ADMIN_TOKEN', 'dev-admin-token'),
  awsRegion: env('AWS_REGION', 'ap-southeast-1'),

  db: {
    host: env('PGHOST', 'localhost'),
    port: Number(env('PGPORT', 5432)),
    database: env('PGDATABASE', 'hbb'),
    user: env('PGUSER', 'hbb'),
    password: env('PGPASSWORD', 'hbb'),
    ssl: env('PGSSL', 'false') === 'true' ? { rejectUnauthorized: false } : false,
    max: Number(env('PGPOOL_MAX', 10)),
  },

  // queue: 'sqs' (AWS) | 'pg' (on-prem, jobs table)
  queueDriver: env('QUEUE_DRIVER', 'pg'),
  sqsQueueUrl: env('SQS_QUEUE_URL', ''),

  // mail: 'ses' (AWS) | 'smtp' (on-prem relay) | 'log' (stdout)
  mailDriver: env('MAIL_DRIVER', 'log'),
  mailFrom: env('MAIL_FROM', 'no-reply@example.com'),
  smtpHost: env('SMTP_HOST', 'localhost'),
  smtpPort: Number(env('SMTP_PORT', 1025)),

  // storage: 's3' (AWS) | 'local' (on-prem disk)
  storageDriver: env('STORAGE_DRIVER', 'local'),
  mediaBucket: env('MEDIA_BUCKET', ''),
  mediaBaseUrl: env('MEDIA_BASE_URL', '/media'),
  localMediaDir: env('LOCAL_MEDIA_DIR', './media'),
  // Set only when there is no CloudFront: the API then serves the SPA from this bucket.
  webBucket: env('WEB_BUCKET', ''),
};
