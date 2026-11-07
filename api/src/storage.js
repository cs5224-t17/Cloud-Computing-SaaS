import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';

const s3 = config.storageDriver === 's3' ? new S3Client({ region: config.awsRegion }) : null;
// CloudFront forwards /media/<key> unchanged to the media bucket, so objects live under the media/ prefix.
const s3Key = (key) => `media/${key}`;

export async function putObject(key, body, contentType) {
  if (s3) {
    await s3.send(new PutObjectCommand({
      Bucket: config.mediaBucket, Key: s3Key(key), Body: body, ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));
  } else {
    const file = path.join(config.localMediaDir, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }
  return `${config.mediaBaseUrl}/${key}`;
}

export const getS3Object = (bucket, key) => s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

export async function deleteObject(key) {
  if (s3) await s3.send(new DeleteObjectCommand({ Bucket: config.mediaBucket, Key: s3Key(key) }));
  else await unlink(path.join(config.localMediaDir, key)).catch(() => {});
}
