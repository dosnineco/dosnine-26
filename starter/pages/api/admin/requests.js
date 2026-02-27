import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';

export default async function handler(req, res) {
  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const db = getDbClient();

    if (req.method === 'GET') {
      const { data: requestsData, error: requestsError } = await db
        .from('service_requests')
        .select('*, agent:assigned_agent_id(id, business_name, users:user_id(full_name, email))')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      const { data: visitorBudgetsData, error: visitorBudgetsError } = await db
        .from('visitor_emails')
        .select('email, budget_min');

      if (visitorBudgetsError) throw visitorBudgetsError;

      const visitorBudgetMap = Object.create(null);
      (visitorBudgetsData || []).forEach((item) => {
        if (item.email) {
          visitorBudgetMap[String(item.email).toLowerCase()] = item.budget_min;
        }
      });

      const requests = (requestsData || []).map((req) => ({
        ...req,
        budget_min: req.budget_min ?? visitorBudgetMap[String(req.client_email || '').toLowerCase()] ?? null,
        budget_max: req.budget_max ?? req.budget_min ?? visitorBudgetMap[String(req.client_email || '').toLowerCase()] ?? null,
        agent: req.agent
          ? {
              id: req.agent.id,
              business_name: req.agent.business_name,
              full_name: req.agent.users?.full_name || req.agent.business_name || 'Unknown Agent',
              email: req.agent.users?.email || 'No email',
            }
          : null,
      }));

      const { data: agentsData, error: agentsError } = await db
        .from('agents')
        .select('id, business_name, user_id, last_request_assigned_at, payment_status, access_expiry, service_areas, users:user_id(full_name, email)')
        .order('last_request_assigned_at', { ascending: true, nullsFirst: true });

      if (agentsError) throw agentsError;

      const agents = (agentsData || []).map((agent) => ({
        id: agent.id,
        business_name: agent.business_name,
        full_name: agent.users?.full_name || agent.business_name || 'Unnamed Agent',
        email: agent.users?.email || 'No email',
        last_request_assigned_at: agent.last_request_assigned_at,
        payment_status: agent.payment_status,
        access_expiry: agent.access_expiry,
        service_areas: agent.service_areas || '',
      }));

      return res.status(200).json({ success: true, requests, agents });
    }

    if (req.method === 'POST') {
      const { action } = req.body || {};

      if (action === 'manualAssign') {
        const { requestId, agentId } = req.body || {};
        if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

        const now = new Date().toISOString();
        const updatePayload = {
          assigned_agent_id: agentId || null,
          status: agentId ? 'assigned' : 'open',
          assigned_at: agentId ? now : null,
        };

        const { error: updateError } = await db
          .from('service_requests')
          .update(updatePayload)
          .eq('id', requestId);

        if (updateError) throw updateError;

        if (agentId) {
          await db
            .from('agents')
            .update({ last_request_assigned_at: now })
            .eq('id', agentId);
        }

        return res.status(200).json({ success: true });
      }

      if (action === 'autoAssign') {
        const { ids, agentId } = req.body || {};
        if (!Array.isArray(ids) || ids.length === 0 || !agentId) {
          return res.status(400).json({ error: 'Missing ids or agentId' });
        }

        const now = new Date().toISOString();
        const { error } = await db
          .from('service_requests')
          .update({
            assigned_agent_id: agentId,
            status: 'assigned',
            assigned_at: now,
          })
          .in('id', ids)
          .eq('status', 'open');

        if (error) throw error;

        await db
          .from('agents')
          .update({ last_request_assigned_at: now })
          .eq('id', agentId);

        return res.status(200).json({ success: true });
      }

      if (action === 'comment') {
        const { requestId, comment } = req.body || {};
        if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

        const { error } = await db
          .from('service_requests')
          .update({
            comment,
            comment_updated_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      if (action === 'toggleContacted') {
        const { requestId, currentStatus } = req.body || {};
        if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

        const { error } = await db
          .from('service_requests')
          .update({ is_contacted: !currentStatus })
          .eq('id', requestId);

        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      if (action === 'reactivate') {
        const { requestId } = req.body || {};
        if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

        const { error } = await db
          .from('service_requests')
          .update({ status: 'assigned' })
          .eq('id', requestId);

        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      if (action === 'delete') {
        const { requestId } = req.body || {};
        if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

        const { error } = await db
          .from('service_requests')
          .delete()
          .eq('id', requestId);

        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin requests API error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Request failed';
    return res.status(500).json({ error: message });
  }
}
