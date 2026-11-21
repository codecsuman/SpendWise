import { createHash } from 'node:crypto';
import { z } from 'zod';
import { AppError } from '../utils/AppError.js';

const uploadResponse = z.object({ secure_url: z.url({ protocol: /^https$/ }) });
const imageTypes = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'image/heic-sequence', 'image/heif-sequence',
]);

export async function uploadAvatarToCloudinary(
  userId: string,
  file: Express.Multer.File,
): Promise<string> {
  // Some phone browsers send HEIC files without a specific MIME type.
  const untypedPhonePhoto = file.mimetype === 'application/octet-stream'
    && /\.hei[cf]$/i.test(file.originalname);
  if (!imageTypes.has(file.mimetype) && !untypedPhonePhoto) {
    throw new AppError('Choose a JPEG, PNG, WebP, HEIC, or HEIF photo', 400);
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError('Profile photo uploads are not configured', 503);
  }

  // Use one image per account and convert phone photos to a browser-friendly JPEG.
  const parameters = {
    allowed_formats: 'jpg,jpeg,png,webp,heic,heif',
    format: 'jpg',
    invalidate: 'true',
    overwrite: 'true',
    public_id: `spendwise/avatars/${createHash('sha256').update(userId).digest('hex')}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
    transformation: 'c_limit,h_512,w_512',
  };

  // Cloudinary verifies the sorted upload parameters using the backend secret.
  const fields = Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b));
  const signedValue = fields.map(([key, value]) => `${key}=${value}`).join('&');
  const signature = createHash('sha256').update(signedValue + apiSecret).digest('hex');
  const body = new FormData();

  for (const [key, value] of fields) body.set(key, value);
  body.set('api_key', apiKey);
  body.set('signature', signature);
  const image = new Blob([Uint8Array.from(file.buffer)], { type: file.mimetype });
  body.set('file', image, file.originalname);

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status === 400) {
      throw new AppError('Cloudinary could not read this image', 400);
    }
    if (!response.ok) throw new AppError('Could not upload the profile photo', 502);

    return uploadResponse.parse(await response.json()).secure_url;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Could not upload the profile photo', 502);
  }
}
