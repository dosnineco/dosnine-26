import { getDbClient, requireDbUser } from '@/lib/apiAuth';
import { addAgentBuyerReadiness, addAssignedAgentBuyerDocuments } from '@/lib/buyerPrequalification';

// Get service requests for agent
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { status } = req.query;

  try {
    const resolved = await requireDbUser(req, res);
    if (!resolved) return;
    const isAdminDashboardView = resolved.user.role === 'admin' && req.query.adminView === 'agent';
    const isAgentAccount = resolved.user.account_type === 'agent' ||
      (!resolved.user.account_type && resolved.user.user_type === 'agent');
    if (!isAdminDashboardView && !isAgentAccount) {
      return res.status(403).json({ error: 'An Agent account is required to access this resource.' });
    }

    const db = getDbClient();

    // Get agent record
    const { data: agent } = await db
      .from('agents')
      .select('id, verification_status')
      .eq('user_id', resolved.user.id)
      .maybeSingle();

    if (!agent && isAdminDashboardView) {
      return res.status(200).json({ requests: [] });
    }
    if (!agent || (!isAdminDashboardView && agent.verification_status !== 'approved')) {
      return res.status(403).json({ error: 'Agent not verified' });
    }

    // Build query based on status filter
    let query = db
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

    const requestsWithReadiness = await addAgentBuyerReadiness(db, requests || []);
    const requestsWithBuyerDocuments = await addAssignedAgentBuyerDocuments(db, requestsWithReadiness);
    return res.status(200).json({ requests: requestsWithBuyerDocuments });

  } catch (error) {
    console.error('List requests error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
