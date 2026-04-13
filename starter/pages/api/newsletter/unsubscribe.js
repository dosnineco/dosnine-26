import { getDbClient } from '@/lib/apiAuth';
import { enforceMethods, sanitizeEmail } from '@/lib/apiSecurity';

export default async function handler(req, res) {
  if (!enforceMethods(req, res, ['POST'])) return;

  const body = req.body || {};
  const email = sanitizeEmail(body.email || '');
  if (!email) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    const db = getDbClient();
    const { error } = await db
      .from('users')
      .update({ newsletter_opted_in: false, updated_at: new Date().toISOString() })
      .eq('email', email);

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, message: 'Unsubscribe request received. If your email exists in our newsletter list, you have been unsubscribed.' });
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    const message = error?.message || 'Failed to unsubscribe';
    return res.status(500).json({ error: message });
  }
}
