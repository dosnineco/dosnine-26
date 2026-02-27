import { getDbClient, requireDbUser } from '@/lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireDbUser(req, res);
    if (!resolved) return;

    const db = getDbClient();

    // Get user's premium status
    const { data: user, error } = await db
      .from('users')
      .select('premium_service_request, premium_service_request_expires')
      .eq('id', resolved.user.id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }

    const isPremium =
      user?.premium_service_request &&
      new Date(user.premium_service_request_expires) > new Date();

    return res.status(200).json({
      success: true,
      isPremium,
      expiresAt: user?.premium_service_request_expires,
    });
  } catch (error) {
    console.error('Premium status error:', error);
    return res.status(500).json({ error: 'Failed to check premium status' });
  }
}
