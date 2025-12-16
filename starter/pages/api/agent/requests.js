import { supabase } from '@/lib/supabase';

// Get service requests for agent
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clerkId, status } = req.query;

  if (!clerkId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get agent record
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
      .select('id, verification_status')
      .eq('user_id', user.id)
      .single();

    if (!agent || agent.verification_status !== 'approved') {
      return res.status(403).json({ error: 'Agent not verified' });
    }

    // Build query - show open requests + assigned to this agent
    let query = supabase
      .from('service_requests')
      .select('*')
      .or(`status.eq.open,assigned_agent_id.eq.${agent.id}`)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Failed to fetch requests:', error);
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return res.status(200).json({ requests: [] });
      }
      return res.status(500).json({ error: 'Failed to fetch requests' });
    }

    return res.status(200).json({ requests: requests || [] });

  } catch (error) {
    console.error('List requests error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
