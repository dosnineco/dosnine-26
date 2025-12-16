import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clerkId } = req.query;

  if (!clerkId) {
    return res.status(400).json({ error: 'Clerk ID required' });
  }

  try {
    // Fetch user with agent data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        clerk_id,
        role,
        created_at,
        agent:agents(
          id,
          verification_status,
          payment_status,
          created_at,
          verification_reviewed_at
        )
      `)
      .eq('clerk_id', clerkId)
      .single();

    if (userError) {
      return res.status(404).json({ 
        error: 'User not found',
        details: userError 
      });
    }

    // Normalize agent data
    let agentData = null;
    if (user.agent) {
      if (Array.isArray(user.agent)) {
        agentData = user.agent[0] || null;
      } else {
        agentData = user.agent;
      }
    }

    return res.status(200).json({
      user: {
        id: user.id,
        clerk_id: user.clerk_id,
        role: user.role,
        created_at: user.created_at
      },
      agent: agentData,
      checks: {
        hasAgent: !!agentData,
        isVerified: agentData?.verification_status === 'approved',
        hasPaid: agentData?.payment_status === 'paid',
        userRole: user.role,
        isAgentRole: user.role === 'agent'
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
}
