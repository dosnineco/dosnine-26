import { getDbClient, requireAdminUser } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const { agentId, plan, paymentAmount = null, accessExpiry = null } = req.body || {};
    if (!agentId || !plan) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validPlans = ['free', '7-day', '30-day', '90-day'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ error: 'Invalid access plan' });
    }

    const db = getDbClient();
    const now = new Date().toISOString();

    const updateData = {
      payment_status: plan,
      payment_date: plan !== 'free' ? now : null,
      payment_amount: paymentAmount,
      access_expiry: accessExpiry,
    };

    const { error } = await db
      .from('agents')
      .update(updateData)
      .eq('id', agentId);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Admin agent payment plan API error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Request failed';
    return res.status(500).json({ error: message });
  }
}
