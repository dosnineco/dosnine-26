import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { getDbClient, requireDbUser } from '../../../lib/apiAuth';
import { enforceMethods } from '../../../lib/apiSecurity';
import { enforceRateLimitDistributed } from '../../../lib/rateLimit';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST', 'DELETE'])) return;

  const resolved = await requireDbUser(req, res, { createIfMissing: true });
  if (!resolved) return;

  const rate = await enforceRateLimitDistributed(req, res, {
    keyPrefix: 'profile-image',
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rate.allowed) return res.status(429).json({ error: 'Too many image requests. Try again shortly.' });

  const profileImagePath = `profile-images/${resolved.user.id}/`;

  try {
    const db = getDbClient();

    if (req.method === 'DELETE') {
      const { data: current, error: currentError } = await db
        .from('users')
        .select('profile_image_path')
        .eq('id', resolved.user.id)
        .single();
      if (currentError) throw currentError;

      const { error: updateError } = await db
        .from('users')
        .update({ profile_image_url: null, profile_image_path: null })
        .eq('id', resolved.user.id);
      if (updateError) throw updateError;

      if (current.profile_image_path?.startsWith(profileImagePath)) {
        const { error: removeError } = await db.storage
          .from('property-images')
          .remove([current.profile_image_path]);
        if (removeError) console.error('Unable to remove previous profile image:', removeError);
      }

      return res.status(200).json({ success: true, profile_image_url: null });
    }

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
        resolve({ files: parsedFiles });
      });
    });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file || file.size <= 0) {
      return res.status(400).json({ error: 'Choose a profile image to upload.' });
    }
    const extension = IMAGE_TYPES[file.mimetype];
    if (!extension) {
      return res.status(400).json({ error: 'Upload a JPEG, PNG, or WebP image.' });
    }

    const { data: current, error: currentError } = await db
      .from('users')
      .select('profile_image_path')
      .eq('id', resolved.user.id)
      .single();
    if (currentError) throw currentError;

    const filePath = `${profileImagePath}${randomUUID()}.${extension}`;
    const { error: uploadError } = await db.storage
      .from('property-images')
      .upload(filePath, await readFile(file.filepath), {
        cacheControl: '3600',
        upsert: false,
        contentType: file.mimetype,
      });
    if (uploadError) throw uploadError;

    const { data: publicData } = db.storage.from('property-images').getPublicUrl(filePath);
    const publicUrl = publicData?.publicUrl || publicData?.publicURL;
    if (!publicUrl) {
      const { error: cleanupError } = await db.storage.from('property-images').remove([filePath]);
      if (cleanupError) console.error('Unable to clean up profile image without a public URL:', cleanupError);
      throw new Error('Unable to resolve uploaded profile image.');
    }

    const { error: updateError } = await db
      .from('users')
      .update({ profile_image_url: publicUrl, profile_image_path: filePath })
      .eq('id', resolved.user.id);
    if (updateError) {
      const { error: cleanupError } = await db.storage.from('property-images').remove([filePath]);
      if (cleanupError) console.error('Unable to clean up failed profile image upload:', cleanupError);
      throw updateError;
    }

    if (current.profile_image_path?.startsWith(profileImagePath)) {
      const { error: removeError } = await db.storage
        .from('property-images')
        .remove([current.profile_image_path]);
      if (removeError) console.error('Unable to remove previous profile image:', removeError);
    }

    return res.status(200).json({ success: true, profile_image_url: publicUrl });
  } catch (error) {
    if (error.httpCode === 413) {
      return res.status(413).json({ error: 'Profile images must be 5 MB or smaller.' });
    }
    console.error('Profile image request failed:', error);
    return res.status(500).json({ error: 'Unable to update your profile image.' });
  }
}
