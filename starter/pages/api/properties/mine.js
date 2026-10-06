import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { canManageProperties } from '@/lib/rbac';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res, { createIfMissing: true });
    if (!resolved) return;
    if (!canManageProperties(resolved.user)) {
      return res.status(403).json({ error: 'A regular or agent account is required to manage properties.' });
    }

    const db = getDbClient();
    const { data, error } = await db
      .from('properties')
      .select('*')
      .eq('owner_id', resolved.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch properties' });
    }

    return res.status(200).json({ success: true, properties: data || [] });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
