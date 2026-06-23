import { getDbClient, requireAdminUser } from '@/lib/apiAuth';
import { enforceMethods, sanitizeEmail } from '@/lib/apiSecurity';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const resolved = await requireAdminUser(req, res);
  if (!resolved) return;

  const body = req.body || {};
  const email = sanitizeEmail(body.email || '');
  if (!email) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    const db = getDbClient();
    const { error } = await db
      .from('users')
      .update({ newsletter_opted_in: false, unsubscribed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('email', email);

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Subscriber removed from newsletter' });
  } catch (error) {
    console.error('Remove subscriber error:', error);
    const message = error?.message || 'Failed to remove subscriber';
    return res.status(500).json({ error: message });
  }
}
