import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { canManageProperties, isAdmin } from '@/lib/rbac';
import { normalizeParish } from '@/lib/normalizeParish';
import { hasActiveRegularPremium } from '@/lib/premiumAccess';

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
    const admin = isAdmin(resolved.user);
    const accountType = resolved.user.account_type ||
      (resolved.user.user_type === 'agent' ? 'agent' : null);
    if (!canManageProperties(resolved.user)) {
      return res.status(403).json({ error: 'A verified homeowner or agent account is required to post properties.' });
    }
    if (!admin && accountType === 'regular') {
      const { count, error: countError } = await db
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', resolved.user.id);
      if (countError) throw countError;

      if (Number(count || 0) >= 1 && !hasActiveRegularPremium(resolved.user)) {
        return res.status(402).json({
          error: 'Premium is required to post more than one property.',
          code: 'premium_required',
          propertyCount: Number(count || 0),
          maxProperties: 1,
        });
      }
    }

    if (!admin && accountType === 'agent') {
      const { data: agent, error: agentError } = await db
        .from('agents')
        .select('verification_status, payment_status')
        .eq('user_id', resolved.user.id)
        .maybeSingle();
      if (agentError) throw agentError;
      if (
        agent?.verification_status !== 'approved' ||
        !['paid', 'free', '7-day', '30-day', '90-day'].includes(agent?.payment_status)
      ) {
        return res.status(403).json({ error: 'Approved and active agent access is required to post properties.' });
      }
    }

    const { form, images = [], bulkUpload = false } = req.body || {};
    if (bulkUpload !== undefined && typeof bulkUpload !== 'boolean') {
      return res.status(400).json({ error: 'Bulk upload flag must be true or false.' });
    }
    if (bulkUpload && !admin) {
      if (accountType !== 'agent') {
        return res.status(403).json({ error: 'Bulk listing is available to agents on a 1-month or 3-month plan.' });
      }
      const { data: agent, error: agentError } = await db
        .from('agents')
        .select('verification_status, payment_status, access_expiry')
        .eq('user_id', resolved.user.id)
        .maybeSingle();
      if (agentError) throw agentError;
      const activePlan = ['30-day', '90-day'].includes(agent?.payment_status);
      const activeExpiry = Boolean(agent?.access_expiry) && new Date(agent.access_expiry) > new Date();
      if (agent?.verification_status !== 'approved' || !activePlan || !activeExpiry) {
        return res.status(403).json({ error: 'An active 1-month or 3-month agent plan is required for bulk listing.' });
      }
    }
    if (form?.is_off_market !== undefined && typeof form.is_off_market !== 'boolean') {
      return res.status(400).json({ error: 'Off-market status must be true or false.' });
    }
    if (form?.is_off_market === true && !admin && !hasActiveRegularPremium(resolved.user)) {
      return res.status(403).json({ error: 'Active premium access is required to create an off-market listing.' });
    }

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

    const basePropertyPayload = {
      owner_id: resolved.user.id,
      slug,
      title: form.title,
      description: form.description,
      parish: normalizeParish(form.parish),
      town: form.town,
      address: form.address || '',
      formatted_address: form.formatted_address || null,
      latitude: Number.isFinite(Number(form.latitude)) ? Number(form.latitude) : null,
      longitude: Number.isFinite(Number(form.longitude)) ? Number(form.longitude) : null,
      bedrooms: Number(form.bedrooms) || 0,
      bathrooms: Number(form.bathrooms) || 0,
      price: Number(form.price),
      currency: form.currency || 'JMD',
      type: form.type || 'rent',
      status: form.status || 'available',
      available_date: form.available_date || null,
      phone_number: form.phone_number || null,
      is_off_market: Boolean(form.is_off_market),
    };

    if (form.property_type) {
      basePropertyPayload.property_type = form.property_type;
    }

    let property = null;
    let propertyError = null;

    const insertPayload = { ...basePropertyPayload };
    const firstInsert = await db
      .from('properties')
      .insert([insertPayload])
      .select('id, slug')
      .single();

    property = firstInsert.data;
    propertyError = firstInsert.error;

    if (propertyError) {
      const normalizedMessage = String(propertyError.message || '').toLowerCase();
      const isMissingPropertyType = normalizedMessage.includes('property_type') &&
        (normalizedMessage.includes('schema cache') || normalizedMessage.includes('could not find') || normalizedMessage.includes('column'));

      if (isMissingPropertyType) {
        delete insertPayload.property_type;
        const retryInsert = await db
          .from('properties')
          .insert([insertPayload])
          .select('id, slug')
          .single();

        property = retryInsert.data;
        propertyError = retryInsert.error;
      }
    }

    if (propertyError || !property?.id) {
      if (propertyError?.code === '23505' || String(propertyError?.message || '').includes('unique_property_fingerprint')) {
        return res.status(409).json({
          error: 'A matching property already exists. Change the area, price, or room counts before publishing.',
        });
      }
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
