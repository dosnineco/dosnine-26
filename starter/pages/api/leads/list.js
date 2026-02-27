import { getDbClient, requireDbUser } from '@/lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resolved = await requireDbUser(req, res);
  if (!resolved) return;

  try {
    const db = getDbClient();
    const { filter = 'verified' } = req.query;

    const { data: agent, error: agentError } = await db
      .from('agents')
      .select('id, verification_status, payment_status, access_expiry')
      .eq('user_id', resolved.user.id)
      .single();

    if (agentError || !agent || agent.verification_status !== 'approved') {
      return res.status(403).json({ error: 'Verified agent access required' });
    }

    const paidPlans = ['7-day', '30-day', '90-day'];
    const hasPaidAccess = paidPlans.includes(agent.payment_status);
    const isExpired = hasPaidAccess && agent.access_expiry
      ? new Date(agent.access_expiry) <= new Date()
      : false;

    if (!hasPaidAccess || isExpired) {
      return res.status(403).json({ error: 'Active paid plan required' });
    }

    let query = db
      .from('service_requests')
      .select('*')
      .eq('is_sold', false)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter === 'verified') {
      query = query.eq('verification_status', 'verified');
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: 'Failed to load leads' });
    }

    return res.status(200).json({ success: true, leads: data || [] });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
