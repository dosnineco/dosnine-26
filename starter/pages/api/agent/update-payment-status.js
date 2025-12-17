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
    const { clerkId, agentId, proofUrl } = req.body;
    
    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized - clerkId required' });
    }

    if (!agentId || !proofUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user owns this agent
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: agent } = await supabase
      .from('agents')
      .select('id, user_id')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (!agent) {
      return res.status(403).json({ error: 'Unauthorized - Not your agent profile' });
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        payment_status: 'paid',
        payment_proof_url: proofUrl,
        payment_date: new Date().toISOString()
      })
      .eq('id', agentId);

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({ error: 'Failed to update payment status', details: updateError.message });
    }

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
