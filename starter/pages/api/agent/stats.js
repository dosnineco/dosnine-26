import { getDbClient, requireDbUser } from '@/lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resolved = await requireDbUser(req, res);
  if (!resolved) return;
  const isAdminDashboardView = resolved.user.role === 'admin' && req.query.adminView === 'agent';
  const isAgentAccount = resolved.user.account_type === 'agent' ||
    (!resolved.user.account_type && resolved.user.user_type === 'agent');
  if (!isAdminDashboardView && !isAgentAccount) {
    return res.status(403).json({ error: 'An Agent account is required to access this resource.' });
  }

  try {
    const db = getDbClient();
    if (isAdminDashboardView) {
      const { data: agent, error: agentError } = await db
        .from('agents')
        .select('id, payment_status, access_expiry')
        .eq('user_id', resolved.user.id)
        .maybeSingle();
      if (agentError) throw agentError;

      if (!agent) {
        return res.status(200).json({ success: true, queueCount: 0, paidAgentCount: 0 });
      }

      const { count: queueCount, error: queueError } = await db
        .from('service_requests')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_agent_id', agent.id)
        .eq('status', 'open');
      if (queueError) throw queueError;

      const paidPlans = ['7-day', '30-day', '90-day'];
      const isPaidAgent = paidPlans.includes(agent.payment_status) &&
        (!agent.access_expiry || new Date(agent.access_expiry) > new Date());

      return res.status(200).json({
        success: true,
        queueCount: queueCount ?? 0,
        paidAgentCount: isPaidAgent ? 1 : 0,
      });
    }

    const [{ count: queueCount }, { count: paidAgentCount }] = await Promise.all([
      db.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      db
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .in('payment_status', ['7-day', '30-day', '90-day'])
        .gt('access_expiry', new Date().toISOString()),
    ]);

    return res.status(200).json({
      success: true,
      queueCount: queueCount ?? 0,
      paidAgentCount: paidAgentCount ?? 0,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
