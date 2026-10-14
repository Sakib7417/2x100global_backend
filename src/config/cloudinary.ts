import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

/**
 * Cloudinary configuration.
 *
 * Credentials are read from the environment so nothing sensitive is committed.
 * The SDK is configured once on module load; `cloudinary.uploader` is then
 * used by the upload helper below and anywhere else that needs it.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

/**
 * Logical "folders" inside the Cloudinary bucket. Each upload module uses one
 * of these as its `folder` so assets stay organised and easy to manage from
 * the Cloudinary dashboard.
 */
export const CLOUDINARY_FOLDERS = {
  KYC: '2x100-global/kyc',
  POSTS: '2x100-global/posts',
  TICKETS: '2x100-global/tickets',
} as const;

export type CloudinaryFolder = (typeof CLOUDINARY_FOLDERS)[keyof typeof CLOUDINARY_FOLDERS];

/**
 * Upload a single in-memory multer file to Cloudinary.
 *
 * Files arrive in memory (multer `memoryStorage`) so we hand the buffer to the
 * uploader as a data URI. Returns the secure HTTPS URL that should be
 * persisted in the database.
 *
 * @param file     multer file object (memory storage)
 * @param folder   one of CLOUDINARY_FOLDERS
 * @param publicId optional explicit public id; if omitted Cloudinary
 *                 generates a unique one
 */
export async function uploadToCloudinary(
  file: Express.Multer.File,
  folder: CloudinaryFolder,
  publicId?: string,
): Promise<UploadApiResponse> {
  const b64 = file.buffer.toString('base64');
  const dataUri = `data:${file.mimetype};base64,${b64}`;

  return cloudinary.uploader.upload(dataUri, {
    folder,
    public_id: publicId,
    resource_type: 'image',
    // Strip metadata + auto-format/quality to keep storage & bandwidth low.
    transformation: [{ fetch_format: 'auto', quality: 'auto' }],
  });
}

/**
 * Upload multiple files to Cloudinary in parallel and return their secure URLs
 * in the same order as the input array. Useful for ticket attachments and KYC
 * front/back pairs.
 */
export async function uploadManyToCloudinary(
  files: Express.Multer.File[],
  folder: CloudinaryFolder,
): Promise<string[]> {
  const results = await Promise.all(files.map((f) => uploadToCloudinary(f, folder)));
  return results.map((r) => r.secure_url);
}

export default cloudinary;
