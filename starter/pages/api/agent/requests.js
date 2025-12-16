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

    // Build query based on status filter
    let query = supabase
      .from('service_requests')
      .select('*');

    if (status && status !== 'all') {
      // Filter by specific status and assigned to this agent
      query = query
        .eq('status', status)
        .eq('assigned_agent_id', agent.id);
    } else {
      // Show all requests assigned to this agent
      query = query.eq('assigned_agent_id', agent.id);
    }

    query = query.order('created_at', { ascending: false });

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
