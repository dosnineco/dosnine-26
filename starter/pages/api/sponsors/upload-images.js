import { randomUUID } from 'crypto';
import { getDbClient } from '@/lib/apiAuth';

export const config = {
  api: {
    bodyParser: false,
  },
};

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDbClient();
    const buffer = await readRequestBody(req);

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'At least 1 image is required' });
    }

    const contentType = typeof req.headers['content-type'] === 'string'
      ? req.headers['content-type']
      : 'image/webp';

    const filePath = `ads/${Date.now()}-${randomUUID()}.webp`;

    const { error: uploadError } = await db.storage
      .from('property-images')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

    if (uploadError) {
      return res.status(500).json({ error: `Image upload failed: ${uploadError.message}` });
    }

    const publicData = db.storage.from('property-images').getPublicUrl(filePath);
    const publicUrl = publicData?.data?.publicUrl || publicData?.data?.publicURL || '';

    if (!publicUrl) {
      return res.status(500).json({ error: 'Failed to resolve uploaded image URL' });
    }

    return res.status(200).json({
      success: true,
      image_url: publicUrl,
    });
  } catch (error) {
    const message = typeof error?.message === 'string' ? error.message : 'Failed to upload images';
    return res.status(500).json({ error: message });
  }
}