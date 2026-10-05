import { getDbClient, requireAdminUser } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const { agentId, action } = req.body || {};
    if (!agentId || action !== 'reject') {
      return res.status(400).json({ error: 'Choose a valid receipt action.' });
    }

    const db = getDbClient();
    const { data: agent, error: agentError } = await db
      .from('agents')
      .select('id, payment_receipt_status')
      .eq('id', agentId)
      .maybeSingle();
    if (agentError) throw agentError;
    if (!agent) return res.status(404).json({ error: 'Agent not found.' });
    if (agent.payment_receipt_status !== 'pending') {
      return res.status(409).json({ error: 'This receipt is no longer awaiting verification.' });
    }

    const { error } = await db
      .from('agents')
      .update({ payment_receipt_status: 'rejected' })
      .eq('id', agentId)
      .eq('payment_receipt_status', 'pending');
    if (error) throw error;

    return res.status(200).json({ success: true, status: 'rejected' });
  } catch (error) {
    console.error('Admin agent payment receipt update failed:', error);
    if (error?.code === '42703') {
      return res.status(503).json({
        error: 'Agent receipt fields are not set up. Run db-migrations/058_agent_plan_receipts_and_pricing.sql in Supabase.',
      });
    }
    return res.status(500).json({ error: error?.message || 'Unable to update payment receipt.' });
  }
}
