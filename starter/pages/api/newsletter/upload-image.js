import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { getDbClient, requireAdminUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireAdminUser(req, res);
  if (!resolved) return;

  try {
    const formidable = await import('formidable');
    const form = formidable.formidable({
      maxFiles: 1,
      maxFileSize: MAX_FILE_SIZE,
      maxTotalFileSize: MAX_FILE_SIZE,
      maxFields: 0,
    });
    const { files } = await new Promise((resolve, reject) => {
      form.parse(req, (error, fields, parsedFiles) => {
        if (error) return reject(error);
        resolve({ fields, files: parsedFiles });
      });
    });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: 'Choose an image to upload' });

    const extension = IMAGE_TYPES[file.mimetype];
    if (!extension) {
      return res.status(400).json({ error: 'Use a JPEG, PNG, or WebP image' });
    }

    const path = `newsletter-images/${Date.now()}-${randomUUID()}.${extension}`;
    const db = getDbClient();
    const { error: uploadError } = await db.storage
      .from('property-images')
      .upload(path, await readFile(file.filepath), {
        cacheControl: '3600',
        upsert: false,
        contentType: file.mimetype,
      });

    if (uploadError) throw uploadError;

    const { data } = db.storage.from('property-images').getPublicUrl(path);
    const publicUrl = data?.publicUrl || data?.publicURL;
    if (!publicUrl) throw new Error('Failed to resolve uploaded image URL');

    return res.status(200).json({ success: true, publicUrl });
  } catch (error) {
    if (error.httpCode === 413) {
      return res.status(413).json({ error: 'Images must be 10 MB or smaller' });
    }
    console.error('Newsletter image upload failed:', error);
    return res.status(500).json({ error: 'Unable to upload newsletter image' });
  }
}
