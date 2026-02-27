import { getDbClient, requireDbUser } from '@/lib/apiAuth';

async function getVerifiedAgent(db, userId) {
  const { data: agent } = await db
    .from('agents')
    .select('id, verification_status')
    .eq('user_id', userId)
    .single();

  if (!agent || agent.verification_status !== 'approved') return null;
  return agent;
}

export default async function handler(req, res) {
  const resolved = await requireDbUser(req, res);
  if (!resolved) return;

  const db = getDbClient();
  const agent = await getVerifiedAgent(db, resolved.user.id);
  if (!agent) {
    return res.status(403).json({ error: 'Agent not verified' });
  }

  if (req.method === 'GET') {
    try {
      const { data: appData, error: appError } = await db
        .from('agent_request_applications')
        .select('id, request_id, status, applied_at, reviewed_at, notes')
        .eq('agent_id', agent.id)
        .order('applied_at', { ascending: false });

      if (appError) throw appError;

      const requestIds = (appData || []).map((app) => app.request_id).filter(Boolean);
      let requestsMap = {};

      if (requestIds.length > 0) {
        const { data: reqData, error: reqError } = await db
          .from('service_requests')
          .select('id, client_name, client_email, client_phone, property_type, location, budget_min, budget_max, bedrooms, bathrooms, request_type, created_at')
          .in('id', requestIds);

        if (reqError) throw reqError;
        (reqData || []).forEach((request) => {
          requestsMap[request.id] = request;
        });
      }

      return res.status(200).json({
        success: true,
        agentId: agent.id,
        applications: appData || [],
        requests: requestsMap,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load applications' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { requestId } = req.body || {};
      if (!requestId) {
        return res.status(400).json({ error: 'Request ID required' });
      }

      const { error } = await db
        .from('agent_request_applications')
        .insert({
          request_id: requestId,
          agent_id: agent.id,
          status: 'pending',
        });

      if (error) {
        return res.status(500).json({ error: error.message || 'Failed to submit application' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to submit application' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { applicationId } = req.body || {};
      if (!applicationId) {
        return res.status(400).json({ error: 'Application ID required' });
      }

      const { error } = await db
        .from('agent_request_applications')
        .delete()
        .eq('id', applicationId)
        .eq('agent_id', agent.id);

      if (error) {
        return res.status(500).json({ error: 'Failed to withdraw application' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to withdraw application' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
