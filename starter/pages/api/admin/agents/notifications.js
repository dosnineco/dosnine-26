import { getDbClient, requireAdminUser } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resolved = await requireAdminUser(req, res);
    if (!resolved) return;

    const sinceParam = Array.isArray(req.query.since) ? req.query.since[0] : req.query.since;
    const sinceTimestamp = sinceParam ? Number(sinceParam) : 0;
    if (!Number.isFinite(sinceTimestamp) || sinceTimestamp < 0) {
      return res.status(400).json({ error: 'Invalid notification timestamp.' });
    }

    const since = new Date(sinceTimestamp).toISOString();
    const db = getDbClient();
    const [reviewResult, paymentResult] = await Promise.all([
      db
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .eq('verification_status', 'pending')
        .gt('verification_submitted_at', since),
      db
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .eq('payment_receipt_status', 'pending')
        .gt('payment_receipt_submitted_at', since),
    ]);

    if (reviewResult.error) throw reviewResult.error;

    let paymentReceiptCount = 0;
    let warning = null;
    if (paymentResult.error) {
      if (!['42703', 'PGRST204'].includes(paymentResult.error.code)) {
        throw paymentResult.error;
      }
      warning = 'Apply migration 058 to include agent payment receipts in admin notifications.';
      console.error('Agent payment notification count is unavailable:', paymentResult.error);
    } else {
      paymentReceiptCount = paymentResult.count || 0;
    }

    return res.status(200).json({
      success: true,
      count: (reviewResult.count || 0) + paymentReceiptCount,
      pendingReviews: reviewResult.count || 0,
      pendingPayments: paymentReceiptCount,
      warning,
    });
  } catch (error) {
    console.error('Admin agent notification count failed:', error);
    return res.status(500).json({ error: error?.message || 'Unable to load agent notification count.' });
  }
}
