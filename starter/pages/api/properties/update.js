import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { normalizeParish } from '@/lib/normalizeParish';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;

    const { id, ...form } = req.body || {};
    if (!id || !form.title || !form.description || !form.parish || !form.town || !form.price || !form.property_type) {
      return res.status(400).json({ error: 'Missing required property fields' });
    }

    const db = getDbClient();
    const { data: property, error: propertyError } = await db
      .from('properties')
      .select('id, owner_id')
      .eq('id', id)
      .single();

    if (propertyError || !property) return res.status(404).json({ error: 'Property not found' });
    if (property.owner_id !== resolved.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { data, error } = await db.from('properties').update({
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
      phone_number: form.phone_number || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('*').single();

    if (error) return res.status(500).json({ error: 'Failed to update property' });
    return res.status(200).json({ success: true, property: data });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}