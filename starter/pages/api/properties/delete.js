import { getDbClient, requireDbUser } from '@/lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;

    const db = getDbClient();
    const { id } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'Property ID is required' });
    }

    const { data: property, error: propertyError } = await db
      .from('properties')
      .select('id, owner_id, image_urls')
      .eq('id', id)
      .single();

    if (propertyError || !property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.owner_id !== resolved.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const storagePaths = (property.image_urls || [])
      .map((url) => {
        const parts = String(url || '').split('/property-images/');
        return parts[1] || null;
      })
      .filter(Boolean);

    if (storagePaths.length > 0) {
      await db.storage.from('property-images').remove(storagePaths);
    }

    const { error: deleteError } = await db.from('properties').delete().eq('id', id);
    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete property' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
