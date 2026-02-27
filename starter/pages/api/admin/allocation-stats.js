import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const db = getDbClient();
    const nowIso = new Date().toISOString();
    const paidStatuses = ['7-day', '30-day', '90-day'];

    const { data: agentsRaw, error: agentsError } = await db
      .from('agents')
      .select('id, business_name, last_request_assigned_at, verification_status, payment_status, access_expiry, users:user_id(full_name, email), service_requests:service_requests!assigned_agent_id(count)')
      .eq('verification_status', 'approved')
      .in('payment_status', paidStatuses)
      .order('last_request_assigned_at', { ascending: true, nullsFirst: true });

    if (agentsError) throw agentsError;

    const { data: allAgents, error: allAgentsError } = await db
      .from('agents')
      .select('id, business_name, verification_status, payment_status, access_expiry, users:user_id(full_name, email)');

    if (allAgentsError) throw allAgentsError;

    const { data: requests, error: requestsError } = await db
      .from('service_requests')
      .select('status, assigned_agent_id');

    if (requestsError) throw requestsError;

    const agents = (agentsRaw || []).filter((item) => {
      if (!paidStatuses.includes(item.payment_status)) return false;
      if (item.access_expiry && new Date(item.access_expiry) < new Date(nowIso)) return false;
      return true;
    });

    const assignedCount = (requests || []).filter((item) => item.assigned_agent_id).length;
    const openCount = (requests || []).filter((item) => item.status === 'open').length;

    const agentStats = agents.map((agent) => ({
      id: agent.id,
      name: agent.users?.full_name || agent.business_name || 'Unnamed Agent',
      email: agent.users?.email || 'No email',
      business: agent.business_name,
      requestCount: agent.service_requests?.[0]?.count || 0,
      lastAssigned: agent.last_request_assigned_at,
      nextInQueue: !agent.last_request_assigned_at,
    }));

    return res.status(200).json({
      success: true,
      stats: {
        totalAgents: agents.length || 0,
        totalRequests: requests?.length || 0,
        assignedRequests: assignedCount,
        openRequests: openCount,
        allAgents: allAgents || [],
      },
      agentStats,
    });
  } catch (error) {
    console.error('Admin allocation stats API error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Request failed';
    return res.status(500).json({ error: message });
  }
}
