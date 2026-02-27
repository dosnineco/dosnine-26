import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';

export default async function handler(req, res) {
  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const db = getDbClient();

    if (req.method === 'GET') {
      const { data: requests, error: requestsError } = await db
        .from('service_requests')
        .select('*')
        .order('updated_at', { ascending: false });

      if (requestsError) throw requestsError;

      const { data: agentsRaw, error: agentsError } = await db
        .from('agents')
        .select('id, business_name, users:user_id(full_name, email)')
        .order('business_name');

      if (agentsError) throw agentsError;

      const agents = (agentsRaw || []).map((item) => ({
        id: item.id,
        name: item.users?.full_name || item.business_name || 'Unknown Agent',
        email: item.users?.email || 'No email',
      }));

      return res.status(200).json({
        success: true,
        requests: requests || [],
        agents,
      });
    }

    if (req.method === 'POST') {
      const { action, ids, agentId } = req.body || {};
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Missing request ids' });
      }

      const now = new Date().toISOString();
      let payload = null;

      if (action === 'assign') {
        if (!agentId) return res.status(400).json({ error: 'Missing agentId' });
        payload = { assigned_agent_id: agentId, status: 'assigned', updated_at: now };
      } else if (action === 'complete') {
        payload = { status: 'completed', completed_at: now, updated_at: now };
      } else if (action === 'incomplete') {
        payload = { status: 'open', completed_at: null, updated_at: now };
      } else if (action === 'unassign') {
        payload = { assigned_agent_id: null, status: 'open', updated_at: now };
      } else if (action === 'reactivate') {
        payload = { status: 'open', updated_at: now };
      } else if (action === 'contacted') {
        payload = { is_contacted: true, updated_at: now };
      } else if (action === 'uncontacted') {
        payload = { is_contacted: false, updated_at: now };
      } else if (action === 'remove-comments') {
        payload = { comment: null, updated_at: now };
      }

      if (action === 'delete') {
        const { error } = await db
          .from('service_requests')
          .delete()
          .in('id', ids);

        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      if (!payload) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      const { error } = await db
        .from('service_requests')
        .update(payload)
        .in('id', ids);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin requests-management API error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Request failed';
    return res.status(500).json({ error: message });
  }
}
