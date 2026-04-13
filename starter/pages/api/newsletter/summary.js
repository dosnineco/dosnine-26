import { getDbClient, requireAdminUser } from '@/lib/apiAuth';
import { enforceMethods } from '@/lib/apiSecurity';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['GET'])) return;

  const resolved = await requireAdminUser(req, res);
  if (!resolved) return;

  const db = getDbClient();

  try {
    const [{ count: visitorCount }, { data: visitorSample }, { count: optedInCount }] = await Promise.all([
      db.from('service_requests').select('id', { head: true, count: 'exact' }).neq('client_email', ''),
      db.from('service_requests').select('client_email').neq('client_email', '').order('created_at', { ascending: false }).limit(8),
      db.from('users').select('id', { head: true, count: 'exact' }).eq('newsletter_opted_in', true).neq('email', ''),
    ]);

    return res.status(200).json({
      success: true,
      visitorCount: visitorCount || 0,
      optedInCount: optedInCount || 0,
      visitorSample: visitorSample || [],
    });
  } catch (error) {
    console.error('Newsletter summary error:', error);
    const message = error?.message || 'Failed to load newsletter summary';
    return res.status(500).json({ error: message });
  }
}
