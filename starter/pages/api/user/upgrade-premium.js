import { getDbClient, requireDbUser } from '@/lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res);
    if (!resolved) return;

    const db = getDbClient();

    // Set premium status to active for 30 days
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    const { error } = await db
      .from('users')
      .update({
        premium_service_request: true,
        premium_service_request_expires: expirationDate.toISOString(),
      })
      .eq('id', resolved.user.id);

    if (error) {
      console.error('Error upgrading user:', error);
      return res.status(500).json({ error: 'Failed to upgrade user' });
    }

    return res.status(200).json({
      success: true,
      message: 'Premium access activated',
      expiresAt: expirationDate.toISOString(),
    });
  } catch (error) {
    console.error('Upgrade premium error:', error);
    return res.status(500).json({ error: 'Failed to upgrade premium' });
  }
}
