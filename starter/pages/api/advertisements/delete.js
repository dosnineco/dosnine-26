import { getDbClient, requireDbUser } from '@/lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;

    const { id } = req.body || {};
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

    const { error: deleteError } = await db
      .from('advertisements')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete ad' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Ad delete error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
