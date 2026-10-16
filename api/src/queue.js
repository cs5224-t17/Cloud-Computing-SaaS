import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { config } from './config.js';
import { query, tx } from './db.js';

const sqs = config.queueDriver === 'sqs' ? new SQSClient({ region: config.awsRegion }) : null;

export async function publish(event) {
  if (sqs) {
    await sqs.send(new SendMessageCommand({ QueueUrl: config.sqsQueueUrl, MessageBody: JSON.stringify(event) }));
  } else {
    await query('INSERT INTO jobs (payload) VALUES ($1)', [event]);
  }
}

// Long-polls for messages and hands each to `handler`. A message is removed only after the handler succeeds.
export async function consume(handler, { signal } = {}) {
  while (!signal?.aborted) {
    try {
      if (sqs) {
        const res = await sqs.send(new ReceiveMessageCommand({
          QueueUrl: config.sqsQueueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 20,
        }));
        for (const m of res.Messages ?? []) {
          await handler(JSON.parse(m.Body));
          await sqs.send(new DeleteMessageCommand({ QueueUrl: config.sqsQueueUrl, ReceiptHandle: m.ReceiptHandle }));
        }
      } else {
        const handled = await tx(async (c) => {
          const { rows } = await c.query(
            'SELECT id, payload FROM jobs ORDER BY id LIMIT 10 FOR UPDATE SKIP LOCKED');
          for (const r of rows) {
            await handler(r.payload);
            await c.query('DELETE FROM jobs WHERE id = $1', [r.id]);
          }
          return rows.length;
        });
        if (!handled) await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (e) {
      console.error('[queue] consume error', e);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
