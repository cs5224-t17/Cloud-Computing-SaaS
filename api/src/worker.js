// Consumes listing.updated events and emails each follower of that listing.
import { config } from './config.js';
import { migrate, query } from './db.js';
import { consume } from './queue.js';
import { sendMail } from './mailer.js';

async function handle(event) {
  if (event.type !== 'listing.updated') return;
  const { rows: [b] } = await query('SELECT name, slug FROM businesses WHERE id = $1', [event.businessId]);
  if (!b) return;
  const { rows: followers } = await query(
    `SELECT u.email, u.name FROM follows f JOIN users u ON u.id = f.user_id
     WHERE f.business_id = $1 AND u.email_verified`, [event.businessId]);

  for (const f of followers) {
    await sendMail({
      to: f.email,
      subject: `${b.name} ${event.change}`,
      text: `Hi ${f.name},\n\n${b.name} ${event.change}.\n\nSee the listing: ${config.appBaseUrl}/b/${b.slug}\n\n`
        + `You're receiving this because you follow ${b.name} on ${config.appName}.\n`,
    });
  }
  console.log(`[worker] ${b.slug}: "${event.change}" -> ${followers.length} follower(s)`);
}

await migrate(); // worker may start before the API has created tables
const ac = new AbortController();
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => ac.abort());
console.log(`[worker] started (queue=${config.queueDriver}, mail=${config.mailDriver})`);
await consume(handle, { signal: ac.signal });
process.exit(0);
