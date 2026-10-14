import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';

/**
 * Cloudflare R2 uses the S3-compatible API. The credentials and endpoint are
 * read from the environment so nothing sensitive is committed.
 *
 * `forcePathStyle: true` is required for R2 — without it the SDK tries
 * virtual-host-style addressing (<bucket>.<endpoint>) which R2 does not
 * support for bucket names containing uppercase letters.
 */
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export const R2_BUCKETS = {
  KYC: 'kyc',
  POSTS: 'posts',
  TICKETS: 'tickets',
} as const;

export type R2BucketFolder = (typeof R2_BUCKETS)[keyof typeof R2_BUCKETS];

/**
 * Upload a single in-memory multer file to Cloudflare R2.
 *
 * Returns the public HTTPS URL that should be persisted in the database.
 * R2 does not support ACLs — public access is controlled at the bucket level
 * via Cloudflare dashboard settings or custom domains.
 */
/**
 * Local disk fallback used when R2 is not configured (dev environments).
 * Files land in `uploads/<folder>/` next to the server, which Express already
 * serves statically at `/uploads`. The returned path is relative — the Next
 * frontend rewrites `/uploads/*` to this backend, so the same value works in
 * the browser without knowing the backend origin.
 */
async function uploadLocally(
  file: Express.Multer.File,
  folder: R2BucketFolder,
  publicId?: string,
): Promise<string> {
  const dir = path.join(process.cwd(), 'uploads', folder);
  await fs.mkdir(dir, { recursive: true });
  const name = `${publicId || cryptoId()}${extensionFor(file.originalname)}`;
  await fs.writeFile(path.join(dir, name), file.buffer);
  return `/uploads/${folder}/${name}`;
}

export async function uploadToR2(
  file: Express.Multer.File,
  folder: R2BucketFolder,
  publicId?: string,
): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    return uploadLocally(file, folder, publicId);
  }

  const key = `${folder}/${publicId || cryptoId()}${extensionFor(file.originalname)}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  const publicBase = process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT;
  return `${publicBase}/${key}`;
}

/**
 * Upload multiple files to R2 in parallel and return their public URLs.
 */
export async function uploadManyToR2(
  files: Express.Multer.File[],
  folder: R2BucketFolder,
): Promise<string[]> {
  const results = await Promise.all(files.map((f) => uploadToR2(f, folder)));
  return results;
}

function cryptoId(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function extensionFor(originalName: string): string {
  const match = originalName.match(/\.[^.]+$/);
  return match ? match[0] : '';
}

export default r2Client;
