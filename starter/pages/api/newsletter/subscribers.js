import { getDbClient, requireAdminUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;

  const resolved = await requireAdminUser(req, res);
  if (!resolved) return;

  const db = getDbClient();

  try {
    const { data, error } = await db
      .from('users')
      .select('id, email, full_name, parish, created_at')
      .eq('newsletter_opted_in', true)
      .neq('email', '')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    return res.status(200).json({ success: true, subscribers: data || [] });
  } catch (error) {
    console.error('Subscribers fetch error:', error);
    const message = error?.message || 'Failed to load subscribers';
    return res.status(500).json({ error: message });
  }
}
