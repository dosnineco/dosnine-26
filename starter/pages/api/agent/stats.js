import { getDbClient, requireDbUser } from '@/lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resolved = await requireDbUser(req, res);
  if (!resolved) return;

  try {
    const db = getDbClient();

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
