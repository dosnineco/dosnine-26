import { getDbClient, requireAdminUser } from '../../../lib/apiAuth';

export default async function handler(req, res) {
  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const db = getDbClient();

    if (req.method === 'GET') {
      const { data: appData, error: appError } = await db
        .from('agent_request_applications')
        .select('id, request_id, agent_id, status, applied_at, reviewed_at, notes')
        .order('applied_at', { ascending: false });

      if (appError) throw appError;

      const { data: requestsData, error: requestsError } = await db
        .from('service_requests')
        .select('id, client_name, client_email, property_type, location, budget_min, budget_max, bedrooms, bathrooms, request_type, created_at')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      const { data: agentsData, error: agentsError } = await db
        .from('agents')
        .select('id, business_name, payment_status, access_expiry, user_id, users:user_id(full_name, email)');

      if (agentsError) throw agentsError;

      const requests = {};
      (requestsData || []).forEach((item) => {
        requests[item.id] = item;
      });

      const agents = {};
      (agentsData || []).forEach((item) => {
        agents[item.id] = {
          id: item.id,
          business_name: item.business_name,
          payment_status: item.payment_status,
          access_expiry: item.access_expiry,
          full_name: item.users?.full_name || item.business_name,
          email: item.users?.email,
        };
      });

      return res.status(200).json({
        success: true,
        applications: appData || [],
        requests,
        agents,
      });
    }

    if (req.method === 'PATCH') {
      const { appId, status } = req.body || {};
      if (!appId || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { error } = await db
        .from('agent_request_applications')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', appId);

      if (error) throw error;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin agent applications API error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Request failed';
    return res.status(500).json({ error: message });
  }
}
