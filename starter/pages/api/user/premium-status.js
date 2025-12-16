import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.headers['x-user-id'] || req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user's premium status
    const { data: user, error } = await supabase
      .from('users')
      .select('premium_service_request, premium_service_request_expires')
      .eq('id', userId)
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
