import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { normalizeParish } from '@/lib/normalizeParish';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    base64Data: match[2],
  };
}

function extensionFromMime(mimeType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return map[mimeType] || 'jpg';
}

async function generateSlug(db, title) {
  const base = (title || 'property')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50) || 'property';

  let slug = base;
  let counter = 1;

  while (true) {
    const { data } = await db.from('properties').select('id').eq('slug', slug).single();
    if (!data) return slug;
    slug = `${base}-${counter++}`;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;

    const db = getDbClient();
    const { form, images = [] } = req.body || {};

    if (!form?.title || !form?.description || !form?.parish || !form?.town || !form?.price || !form?.property_type) {
      return res.status(400).json({ error: 'Missing required property fields' });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    if (images.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 images allowed' });
    }

    const slug = await generateSlug(db, form.title);

    const { data: property, error: propertyError } = await db
      .from('properties')
      .insert([{
        owner_id: resolved.user.id,
        slug,
        title: form.title,
        description: form.description,
        parish: normalizeParish(form.parish),
        town: form.town,
        address: form.address || '',
        bedrooms: Number(form.bedrooms) || 0,
        bathrooms: Number(form.bathrooms) || 0,
        price: Number(form.price),
        currency: form.currency || 'JMD',
        type: form.type || 'rent',
        property_type: form.property_type,
        status: form.status || 'available',
        available_date: form.available_date || null,
        phone_number: form.phone_number || null,
      }])
      .select('id, slug')
      .single();

    if (propertyError || !property?.id) {
      return res.status(500).json({ error: propertyError?.message || 'Failed to create property' });
    }

    const uploadedFiles = [];
    const imageUrls = [];

    for (let i = 0; i < images.length; i++) {
      const parsed = parseDataUrl(images[i]?.dataUrl);
      if (!parsed) {
        return res.status(400).json({ error: `Invalid image payload at index ${i}` });
      }

      const ext = extensionFromMime(parsed.mimeType);
      const filePath = `${resolved.user.id}/${property.id}/${Date.now()}-${i}.${ext}`;
      const fileBuffer = Buffer.from(parsed.base64Data, 'base64');

      const { error: uploadError } = await db.storage
        .from('property-images')
        .upload(filePath, fileBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: parsed.mimeType,
        });

      if (uploadError) {
        return res.status(500).json({ error: `Failed to upload image ${i + 1}` });
      }

      const publicResult = db.storage.from('property-images').getPublicUrl(filePath);
      const publicUrl = publicResult?.data?.publicUrl || publicResult?.data?.publicURL || null;

      if (!publicUrl) {
        return res.status(500).json({ error: 'Failed to resolve uploaded image URL' });
      }

      uploadedFiles.push({ path: filePath, publicUrl, position: i });
      imageUrls.push(publicUrl);
    }

    const { error: updateError } = await db
      .from('properties')
      .update({ image_urls: imageUrls })
      .eq('id', property.id);

    if (updateError) {
      const imageRows = uploadedFiles.map((f) => ({
        property_id: property.id,
        image_url: f.publicUrl,
        storage_path: f.path,
        position: f.position,
      }));
      const { error: imageInsertError } = await db.from('property_images').insert(imageRows);
      if (imageInsertError) {
        return res.status(500).json({ error: 'Failed to save property images' });
      }
    }

    return res.status(200).json({
      success: true,
      propertyId: property.id,
      slug: property.slug,
    });
  } catch (error) {
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Upload is too large. Please use fewer or smaller images.' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
