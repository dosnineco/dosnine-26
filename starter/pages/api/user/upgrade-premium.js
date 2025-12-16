import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Set premium status to active for 30 days
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        premium_service_request: true,
        premium_service_request_expires: expirationDate.toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error upgrading user:', error);
      return res.status(500).json({ error: 'Failed to upgrade user' });
    }

    return res.status(200).json({
      success: true,
      message: 'Premium access activated',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Upgrade premium error:', error);
    return res.status(500).json({ error: 'Failed to upgrade premium' });
  }
}
