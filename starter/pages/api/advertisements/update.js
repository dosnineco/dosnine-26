import { getDbClient, requireDbUser } from '@/lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;

    const { id, title, description, phone, website } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'Missing ad id' });
    }

    const db = getDbClient();
    const { data: existingAd, error: fetchError } = await db
      .from('advertisements')
      .select('id, created_by_clerk_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: 'Unable to verify ad ownership' });
    }

    if (!existingAd) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    if (existingAd.created_by_clerk_id !== resolved.clerkId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = {};
    if (typeof title === 'string') updates.title = title.trim();
    if (typeof description === 'string') updates.description = description.trim();
    if (typeof phone === 'string') updates.phone = phone.trim();
    if (typeof website === 'string') updates.website = website.trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { error: updateError } = await db
      .from('advertisements')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update ad' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Ad update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
