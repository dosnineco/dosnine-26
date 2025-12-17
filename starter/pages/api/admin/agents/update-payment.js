import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clerkId, agentId, paymentStatus } = req.body;
    
    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized - clerkId required' });
    }

    if (!agentId || !paymentStatus) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify admin access
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('clerk_id', clerkId)
      .single();

    if (adminError || !adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }

    // Update payment status
    const updateData = {
      payment_status: paymentStatus,
    };

    // If marking as paid, set payment_date
    if (paymentStatus === 'paid') {
      updateData.payment_date = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', agentId);

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({ error: 'Failed to update payment status', details: updateError.message });
    }

    res.status(200).json({
      success: true,
      message: `Payment status updated to ${paymentStatus}`,
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
